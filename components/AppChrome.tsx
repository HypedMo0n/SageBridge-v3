'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, House, MagnifyingGlass, Files, DotsThreeOutline, Moon, Sun } from '@phosphor-icons/react';
import { api, type Company } from '../lib/api';
import { COMPANY_STORAGE_KEY, resolveSelectedCompany, saveSelectedCompany } from '../lib/company-selection';

const META: Record<string, [string, string]> = {
  '/dashboard': ['Universal Construction', 'Sage 50 · desktop connector'],
  '/search': ['Search', 'Customers, invoices, products'],
  '/invoices': ['Work', 'Invoices and quotes'],
  '/customers': ['Customers', 'From the last Sage 50 sync'],
  '/products': ['Products & services', 'From Sage 50'],
  '/reports': ['Reports', 'Calculated from synced invoices'],
  '/sync': ['Sync', 'Desktop connector status'],
  '/more': ['More', 'Universal Construction'],
  '/settings': ['Settings', ''],
  '/pair': ['Pair with Sage 50', 'Desktop connector']
};

export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [day, setDay] = useState(() => typeof window !== 'undefined' && localStorage.getItem('sb-theme') === 'day');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getCompanies()
      .then(authorizedCompanies => {
        if (cancelled) return;
        setCompanies(authorizedCompanies);
        const selected = resolveSelectedCompany(
          authorizedCompanies,
          window.localStorage.getItem(COMPANY_STORAGE_KEY)
        );
        if (selected) {
          saveSelectedCompany(window.localStorage, selected);
          setCompanyId(selected);
        }
      })
      .catch(error => console.error('Unable to load companies:', error));
    return () => { cancelled = true; };
  }, []);

  const base = Object.keys(META)
    .sort((a, b) => b.length - a.length)
    .find(key => path === key || path.startsWith(`${key}/`)) || '/dashboard';
  let [title, sub] = META[base];
  if (path.startsWith('/invoices/') && path !== '/invoices/new') {
    title = decodeURIComponent(path.split('/').pop() || 'Invoice');
    sub = 'Invoice';
  }
  if (path.startsWith('/customers/')) {
    title = 'Customer';
    sub = 'Sage 50 customer';
  }
  if (path.endsWith('/new')) {
    title = path.includes('quotes') ? 'New quote' : 'New invoice';
    sub = 'Four-step create flow';
  }

  const pushed = !['/dashboard', '/search', '/invoices', '/more'].includes(path);
  const toggle = () => {
    const next = !day;
    setDay(next);
    localStorage.setItem('sb-theme', next ? 'day' : 'night');
  };
  const selectCompany = (nextCompanyId: string) => {
    if (!nextCompanyId || nextCompanyId === companyId) return;
    saveSelectedCompany(window.localStorage, nextCompanyId);
    setCompanyId(nextCompanyId);
    window.location.reload();
  };

  return (
    <div className={`app ${day ? 'sb-day' : ''}`}>
      <header className="header">
        <div className="header-inner">
          {pushed && (
            <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="title">
            <h1>{title}</h1>
            {sub && <p>{sub}</p>}
          </div>
          {companies.length > 0 && (
            <select
              className="company-select"
              aria-label="Select company"
              value={companyId}
              onChange={event => selectCompany(event.target.value)}
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}
          <button className="icon-btn" onClick={toggle} aria-label="Toggle day and night theme">
            {day ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <Link href="/sync" className="sync-chip"><i className="sync-dot" />Synced</Link>
        </div>
      </header>
      <main className="main" id="content">{children}</main>
      <BottomNav path={path} />
    </div>
  );
}

function BottomNav({ path }: { path: string }) {
  const tabs = [
    ['/dashboard', 'Home', House],
    ['/search', 'Search', MagnifyingGlass],
    ['/invoices', 'Work', Files],
    ['/more', 'More', DotsThreeOutline]
  ] as const;
  return (
    <nav className="tabs" aria-label="Primary">
      <div className="tabs-inner">
        {tabs.map(([href, label, Icon]) => {
          const active = href === '/invoices'
            ? path.startsWith('/invoices') || path.startsWith('/quotes')
            : path.startsWith(href) || (href === '/more' && ['/customers', '/products', '/reports', '/sync', '/settings', '/pair'].some(item => path.startsWith(item)));
          return (
            <Link href={href} className={`tab ${active ? 'active' : ''}`} key={href}>
              <Icon size={21} weight={active ? 'fill' : 'regular'} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
