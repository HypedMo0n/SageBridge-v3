import { ARTICLES } from './articles';
import type { HelpArticle } from './types';

function textOf(article: HelpArticle): string {
  const bodyText = article.body.map((block) => ('text' in block ? block.text : block.items.join(' '))).join(' ');
  return `${article.title} ${article.summary} ${bodyText}`.toLowerCase();
}

/** Client-side only - no external search service. Matches title, summary, and body text. */
export function searchArticles(query: string): HelpArticle[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return ARTICLES.filter((article) => textOf(article).includes(needle));
}
