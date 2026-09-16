'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CaretRight, Headset } from '@phosphor-icons/react';
import { findArticle } from '@/lib/help/articles';
import { categoryLabel } from '@/lib/help/categories';
import { ArticleBody } from '@/components/help/ArticleBody';
import { ConnectorDownloadCard } from '@/components/help/ConnectorDownloadCard';

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = findArticle(slug);

  if (!article) {
    return (
      <div className="empty card">
        <h2>Article not found</h2>
        <p className="notice">This help article doesn&apos;t exist, or the link may be out of date.</p>
        <Link href="/help" className="btn btn-primary btn-block" style={{ marginTop: 12 }}>Back to Help Center</Link>
      </div>
    );
  }

  const related = (article.related || []).map(findArticle).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <>
      <nav aria-label="Breadcrumb" className="help-breadcrumb">
        <Link href="/help">Help Center</Link>
        <CaretRight size={10} aria-hidden="true" />
        <span>{categoryLabel(article.category)}</span>
        <CaretRight size={10} aria-hidden="true" />
        <span aria-current="page">{article.title}</span>
      </nav>

      <section className="card hero section">
        <span className="kicker">{categoryLabel(article.category)}</span>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '6px 0 8px' }}>{article.title}</h1>
        <p className="notice">{article.summary}</p>
      </section>

      {article.slug === 'install-connector' && <ConnectorDownloadCard />}

      <section className="section">
        <ArticleBody blocks={article.body} />
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="kicker">Related articles</h2>
          <div className="stack">
            {related.map((item) => (
              <Link href={`/help/${item.slug}`} key={item.slug} className="row">
                <span className="row-main">
                  <span className="row-title">{item.title}</span>
                  <span className="row-sub">{item.summary}</span>
                </span>
                <CaretRight className="chev" size={13} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="button-grid">
        <Link href="/help" className="btn btn-block">Back to Help Center</Link>
        <Link href="/help/contact" className="btn btn-primary btn-block"><Headset size={16} />Contact Support</Link>
      </section>
    </>
  );
}
