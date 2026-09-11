'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const groups = [
  ['Sync', [['Sync frequency', 'Managed by connector'], ['Notifications', 'Workspace settings']]],
  ['Documents', [['Company & logo', 'From Sage 50'], ['Default terms', 'From Sage 50'], ['Tax rates', 'From Sage 50']]],
] as const;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  return <>{groups.map(([title, rows]) => <section className="section" key={title}><h2 className="kicker">{title}</h2><div className="card">{rows.map(([label, detail]) => <div className="row" key={label}><span className="row-main row-title">{label}</span><span className="row-sub">{detail}</span></div>)}</div></section>)}<section className="section"><h2 className="kicker">Account</h2><div className="card"><div className="row"><span className="row-main"><span className="row-title">Signed in</span><span className="row-sub">{user?.email}</span></span></div><Link href="/pair" className="btn btn-block">Manage connectors</Link><button onClick={logout} className="btn btn-block settings-signout">Sign out</button></div></section></>;
}
