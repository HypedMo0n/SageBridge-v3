// Validates the Help Center content registry: no broken links, no
// duplicate slugs, every category used, every required article present,
// and the required security wording is never violated. Run with:
//   npx tsx scripts/check-help-content.ts

import assert from 'node:assert/strict';
import { ARTICLES } from '../lib/help/articles';
import { CATEGORIES } from '../lib/help/categories';
import { searchArticles } from '../lib/help/search';
import { contextualHelpSlug } from '../lib/help/contextual';

const slugs = new Set(ARTICLES.map((a) => a.slug));
assert.equal(slugs.size, ARTICLES.length, 'duplicate article slugs found');

const categoryIds = new Set(CATEGORIES.map((c) => c.id));
for (const article of ARTICLES) {
  assert.ok(categoryIds.has(article.category), `article ${article.slug} has an unknown category ${article.category}`);
  assert.ok(article.title.trim().length > 0, `article ${article.slug} has an empty title`);
  assert.ok(article.summary.trim().length > 0, `article ${article.slug} has an empty summary`);
  assert.ok(article.body.length > 0, `article ${article.slug} has an empty body`);
  for (const relatedSlug of article.related || []) {
    assert.ok(slugs.has(relatedSlug), `article ${article.slug} links to a related article that doesn't exist: ${relatedSlug}`);
  }
}

// Every category from PART 3 of the Help Center spec must have at least one article.
for (const category of CATEGORIES) {
  assert.ok(ARTICLES.some((a) => a.category === category.id), `category ${category.id} has no articles`);
}

// Spot-check the required articles named explicitly in the spec exist under the right category.
const REQUIRED: Array<[string, string]> = [
  ['what-is-sagebridge', 'getting-started'],
  ['install-connector', 'getting-started'],
  ['connect-sage-50', 'getting-started'],
  ['customers', 'using-sagebridge'],
  ['invoices', 'using-sagebridge'],
  ['quotes', 'using-sagebridge'],
  ['what-is-the-connector', 'connector-sync'],
  ['connector-online-vs-offline', 'connector-sync'],
  ['connector-offline', 'troubleshooting'],
  ['pairing-failed', 'troubleshooting'],
  ['customer-creation-failed', 'troubleshooting'],
  ['invoice-creation-failed', 'troubleshooting'],
  ['quote-creation-failed', 'troubleshooting'],
  ['what-sagebridge-accesses', 'security-privacy'],
  ['disconnecting-a-computer', 'security-privacy'],
  ['safe-support-practices', 'security-privacy'],
];
for (const [slug, category] of REQUIRED) {
  const article = ARTICLES.find((a) => a.slug === slug);
  assert.ok(article, `required article missing: ${slug}`);
  assert.equal(article!.category, category, `${slug} is in category ${article!.category}, expected ${category}`);
}

// Security & Privacy must never instruct a customer to hand over a secret.
const FORBIDDEN_ASKS = [/send us your password/i, /share your (?:connector )?credential/i, /provide your (?:firebase )?jwt/i, /send (?:us )?your pairing (?:code|secret)/i, /share your cloudflare/i];
const allText = ARTICLES.flatMap((a) => a.body.map((b) => ('text' in b ? b.text : b.items.join(' ')))).join(' ');
for (const pattern of FORBIDDEN_ASKS) assert.ok(!pattern.test(allText), `an article appears to ask the customer for a secret: ${pattern}`);

// Search must actually search (title, summary, and body), not just titles.
assert.ok(searchArticles('pairing code').some((a) => a.slug === 'connect-sage-50'), 'search does not find body text matches');
assert.ok(searchArticles('nonexistent-topic-zzz').length === 0, 'search returns results for a query that should match nothing');
assert.equal(searchArticles('   ').length, 0, 'search on empty/whitespace query should return no results, not everything');

// Contextual help mapping must resolve to real articles or null - never a dangling slug.
const contextualCases = [
  { code: 'network/unreachable' }, { code: 'COMPANY_REQUIRED' }, { message: 'Pairing failed: code expired' }, { message: 'something unrelated' },
];
for (const input of contextualCases) {
  const slug = contextualHelpSlug(input);
  if (slug !== null) assert.ok(slugs.has(slug), `contextualHelpSlug resolved to a non-existent article: ${slug}`);
}

console.log(`Help Center content assertions passed (${ARTICLES.length} articles across ${CATEGORIES.length} categories).`);
