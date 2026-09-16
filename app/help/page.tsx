'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MagnifyingGlass, DownloadSimple, PlugsConnected, ArrowsClockwise, Headset, CaretRight } from '@phosphor-icons/react';
import { CATEGORIES, categoryLabel } from '@/lib/help/categories';
import { articlesByCategory } from '@/lib/help/articles';
import { searchArticles } from '@/lib/help/search';

const QUICK_ACTIONS = [
  { href: '/help/install-connector', label: 'Install Connector', detail: 'Download and set up SageBridge on Windows.', icon: DownloadSimple },
  { href: '/help/connect-sage-50', label: 'Connect Sage 50', detail: 'Connect an existing Sage 50 company.', icon: PlugsConnected },
  { href: '/help/sync-problems', label: 'Sync Problems', detail: 'Troubleshoot connection and synchronization problems.', icon: ArrowsClockwise },
  { href: '/help/contact', label: 'Contact Support', detail: 'Find support information and diagnostic instructions.', icon: Headset },
] as const;

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchArticles(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <>
      <section className="card hero section help-hero">
        <h1 className="help-hero-title">SageBridge Help Center</h1>
        <p className="notice help-hero-sub">How can we help?</p>
        <div className="input-wrap help-search-input">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for help with SageBridge..."
            aria-label="Search for help with SageBridge"
          />
        </div>
      </section>

      {searching ? (
        <section className="section" aria-live="polite">
          <h2 className="kicker">{results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results'}</h2>
          {results.length === 0 ? (
            <div className="empty card">
              <p>Nothing matches &ldquo;{query}&rdquo;.</p>
              <p className="notice">Try a different word, or <Link href="/help/contact" className="help-inline-link-text">contact support</Link> directly.</p>
            </div>
          ) : (
            <div className="stack">
              {results.map((article) => (
                <Link href={`/help/${article.slug}`} key={article.slug} className="row">
                  <span className="row-main">
                    <span className="kicker" style={{ marginBottom: 3 }}>{categoryLabel(article.category)}</span>
                    <span className="row-title">{article.title}</span>
                    <span className="row-sub">{article.summary}</span>
                  </span>
                  <CaretRight className="chev" size={13} />
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="section">
            <div className="help-quick-grid">
              {QUICK_ACTIONS.map(({ href, label, detail, icon: Icon }) => (
                <Link href={href} key={href} className="card help-quick-card">
                  <span className="icon-box accent-box"><Icon size={18} /></span>
                  <span className="row-title" style={{ marginTop: 10, fontWeight: 500 }}>{label}</span>
                  <span className="row-sub">{detail}</span>
                </Link>
              ))}
            </div>
          </section>

          {CATEGORIES.map((category) => (
            <section className="section" key={category.id}>
              <div className="section-head">
                <h2 className="kicker" style={{ margin: 0 }}>{category.label}</h2>
              </div>
              <p className="notice" style={{ marginTop: -4, marginBottom: 9 }}>{category.description}</p>
              <div className="stack">
                {articlesByCategory(category.id).map((article) => (
                  <Link href={`/help/${article.slug}`} key={article.slug} className="row">
                    <span className="row-main">
                      <span className="row-title">{article.title}</span>
                      <span className="row-sub">{article.summary}</span>
                    </span>
                    <CaretRight className="chev" size={13} />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
