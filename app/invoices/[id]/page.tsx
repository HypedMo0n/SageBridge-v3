'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError, type Capabilities, type Invoice } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/utils';
import { LoadingRows, initials } from '@/components/SageRows';
import { CaretRight } from '@phosphor-icons/react';

function errorText(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'The service returned an unexpected error.';
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [i, setI] = useState<Invoice | null>();
  useEffect(() => { api.getInvoice(id).then(setI); }, [id]);

  if (i === undefined) return <LoadingRows />;
  if (!i) return <div className="empty">Invoice not found.</div>;

  const paid = i.total - i.balance;
  const status = i.balance <= 0 ? 'Paid' : i.dueDate && new Date(i.dueDate) < new Date() ? 'Overdue' : 'Open';

  return <>
    <section className="card hero section">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className={`tag ${status === 'Paid' ? 'paid' : status === 'Overdue' ? 'overdue' : ''}`}>{status}</span>
        <span className="row-sub">Issued {formatDate(i.date)}</span>
      </div>
      <div className="hero-money money">{formatMoney(i.balance)}</div>
      <p className="row-sub">{i.balance <= 0 ? 'Paid in full' : paid > 0 ? `${formatMoney(paid)} received of ${formatMoney(i.total)}` : 'Outstanding balance'}</p>
      <div className="rule" />
      <Link href={`/customers/${i.customerSageId}`} className="row" style={{ padding: 0 }}>
        <span className="avatar">{initials(i.customerName)}</span>
        <span className="row-main"><span className="row-title">{i.customerName}</span><span className="row-sub">Due {i.dueDate ? formatDate(i.dueDate) : 'date not supplied'}</span></span>
        <CaretRight size={13} />
      </Link>
    </section>

    <section className="section">
      <h2 className="kicker">Lines</h2>
      <div className="card"><p className="notice">Line items are not included in the current invoice API response. Sage reports the verified document total below; no line details are invented.</p></div>
    </section>

    <section className="section">
      <h2 className="kicker">Totals</h2>
      <div className="row"><span className="row-main">Total</span><span className="money">{formatMoney(i.total)}</span></div>
      <div className="row"><span className="row-main">Outstanding</span><span className="money">{formatMoney(i.balance)}</span></div>
    </section>

    <InvoiceExportSection invoice={i} />

    <section>
      <h2 className="kicker">Actions</h2>
      <div className="button-grid"><button disabled className="btn btn-primary">Send reminder</button><button disabled className="btn">Record payment</button></div>
      <p className="notice">These writes are disabled because the API has no reminder or payment endpoint.</p>
    </section>
  </>;
}

function InvoiceExportSection({ invoice }: { invoice: Invoice }) {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSentTo, setEmailSentTo] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fail closed: if the capability check itself can't be reached, treat
    // email as unavailable rather than assuming it works.
    api.getCapabilities().then(setCapabilities).catch(() => setCapabilities({ email: false }));
  }, []);

  async function exportPdf() {
    setPdfBusy(true);
    setPdfError('');
    try {
      const { blob, filename } = await api.getInvoicePdf(invoice.sageId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(errorText(err));
    } finally {
      setPdfBusy(false);
    }
  }

  function openEmail() {
    setEmailError('');
    setEmailSentTo('');
    setTo(invoice.customerEmail || '');
    setSubject(`Invoice ${invoice.invoiceNumber}`);
    setMessage(`Please find attached invoice ${invoice.invoiceNumber}.`);
    setEmailOpen(true);
  }

  async function sendEmail() {
    setEmailBusy(true);
    setEmailError('');
    try {
      const result = await api.emailInvoice(invoice.sageId, { to, subject, message });
      setEmailSentTo(result.to);
      setEmailOpen(false);
    } catch (err) {
      setEmailError(errorText(err));
    } finally {
      setEmailBusy(false);
    }
  }

  const emailAvailable = capabilities?.email === true;

  return (
    <section className="section">
      <h2 className="kicker">Export</h2>
      <div className="card">
        <div className="button-grid">
          <button type="button" className="btn" disabled={pdfBusy} onClick={exportPdf}>{pdfBusy ? 'Preparing PDF…' : 'Export PDF'}</button>
          <button
            type="button"
            className="btn"
            disabled={capabilities === null || !emailAvailable || emailBusy}
            onClick={openEmail}
            title={capabilities !== null && !emailAvailable ? 'Email is not configured for this workspace yet.' : undefined}
          >
            Email
          </button>
        </div>
        {pdfError && <p className="notice" style={{ color: '#df8997', marginTop: 8 }}>{pdfError}</p>}
        {capabilities !== null && !emailAvailable && <p className="notice" style={{ marginTop: 8 }}>Emailing invoices isn’t set up for this workspace yet.</p>}
        {emailSentTo && <p className="notice" style={{ marginTop: 8 }}>Sent to {emailSentTo}.</p>}

        {emailOpen && (
          <div className="notice-box" style={{ marginTop: 12 }}>
            <p className="row-title" style={{ marginBottom: 6 }}>Email invoice {invoice.invoiceNumber}</p>
            <label className="kicker" htmlFor="email-to">To</label>
            <input id="email-to" className="textarea" style={{ minHeight: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
            <label className="kicker" htmlFor="email-subject" style={{ marginTop: 10, display: 'block' }}>Subject</label>
            <input id="email-subject" className="textarea" style={{ minHeight: 'auto' }} value={subject} onChange={(e) => setSubject(e.target.value)} />
            <label className="kicker" htmlFor="email-message" style={{ marginTop: 10, display: 'block' }}>Message</label>
            <textarea id="email-message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
            {emailError && <p className="notice" style={{ color: '#df8997', marginTop: 8 }}>{emailError}</p>}
            <div className="button-grid" style={{ marginTop: 12 }}>
              <button className="btn" disabled={emailBusy} onClick={() => setEmailOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={emailBusy || !to.trim()} onClick={sendEmail}>{emailBusy ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
