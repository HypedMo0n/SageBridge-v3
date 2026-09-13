'use client';

import { useState } from 'react';

const groups = [
  ['Sync', [['Sync frequency', 'Every 15 min'], ['Wi-Fi only', 'Off']]],
  ['Documents', [['Company & logo', 'Universal Construction'], ['Tax rates', 'HST 13%']]],
  ['Account', [['Users & permissions', 'Managed on desktop'], ['This device', 'Current browser']]],
] as const;

export default function Page() {
  const [message, setMessage] = useState('');
  return <>
    {groups.map(([title, rows]) => <section className="section" key={title}>
      <h2 className="kicker">{title}</h2>
      <div className="card">{rows.map(([label, value]) => <div className="row" key={label}><span className="row-main">{label}</span><span className="row-sub">{value}</span></div>)}</div>
    </section>)}
    <section className="section card"><h2 className="kicker">Data boundary</h2><p className="notice">SageBridge presents synchronized Sage 50 values. Accounting calculations remain in Sage 50.</p></section>
    {message && <p className="notice">{message}</p>}
    <button className="btn" onClick={() => setMessage('Settings are managed by the Sage 50 connector.')}>Save settings</button>
  </>;
}
