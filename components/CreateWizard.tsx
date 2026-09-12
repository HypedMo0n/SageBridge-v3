'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, type Customer, type Product } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { LoadingRows, initials } from './SageRows';
import { CaretDown, CheckCircle, MagnifyingGlass, Minus, PaperPlaneTilt, Plus, X } from '@phosphor-icons/react';

type Line = { sku: string; name: string; price: number; qty: number };
type PickerItem = { id: string; title: string; subtitle: string; meta?: string };

type SearchPickerProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  items: PickerItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  selectedDetail?: React.ReactNode;
};

function SearchPicker({ label, placeholder, searchPlaceholder, items, selectedId, onSelect, selectedDetail }: SearchPickerProps) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? items.filter((item) => `${item.title} ${item.subtitle} ${item.meta || ''}`.toLocaleLowerCase().includes(needle)) : items;
  }, [items, query]);
  const selected = items.find((item) => item.id === selectedId);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function choose(item: PickerItem) {
    onSelect(item.id);
    setOpen(false);
    setQuery('');
    setActive(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((value) => Math.min(value + 1, Math.max(0, filtered.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === 'Enter' && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="picker" ref={rootRef}>
      <label className="kicker" htmlFor={inputId}>{label}</label>
      {selected && !open ? (
        <div className="picker-selection card">
          <span className="avatar">{initials(selected.title)}</span>
          <span className="row-main">
            <strong className="row-title">{selected.title}</strong>
            <span className="row-sub">{selected.subtitle}</span>
            {selectedDetail}
          </span>
          <button className="picker-change" type="button" onClick={() => setOpen(true)} aria-label={`Change ${label.toLowerCase()}`}>Change</button>
        </div>
      ) : (
        <>
          <div className={`picker-input ${open ? 'open' : ''}`}>
            <MagnifyingGlass size={17} aria-hidden="true" />
            <input
              id={inputId}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
              autoComplete="off"
              value={query}
              placeholder={open ? searchPlaceholder : placeholder}
              onFocus={() => setOpen(true)}
              onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
              onKeyDown={onKeyDown}
            />
            {query ? <button type="button" className="picker-clear" onClick={() => { setQuery(''); setActive(0); }} aria-label="Clear search"><X size={15} /></button> : <CaretDown size={15} aria-hidden="true" />}
          </div>
          {open && (
            <div id={listId} role="listbox" className="picker-list">
              {filtered.length ? filtered.map((item, index) => (
                <button
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={item.id === selectedId}
                  type="button"
                  className={`picker-option ${index === active ? 'active' : ''}`}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(item)}
                  key={item.id}
                >
                  <span className="row-main"><strong className="row-title">{item.title}</strong><span className="row-sub">{item.subtitle}</span></span>
                  {item.meta && <span className="picker-meta money">{item.meta}</span>}
                </button>
              )) : <p className="picker-empty">No matches. Try a name, email, SKU, or description.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CreateWizard({ initialKind = 'invoice' }: { initialKind?: 'invoice' | 'quote' }) {
  const router = useRouter();
  const search = useSearchParams();
  const [kind, setKind] = useState(initialKind);
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(search.get('customerId') || '');
  const [cart, setCart] = useState<Line[]>([]);
  const [terms, setTerms] = useState('Net 30');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getProducts()])
      .then(([customerRows, productRows]) => { setCustomers(customerRows); setProducts(productRows); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load Sage data'));
  }, []);

  const customer = customers.find((item) => item.sageId === customerId);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const total = subtotal * 1.13;
  const canAdvance = step === 0 ? Boolean(customerId) : step === 1 ? cart.length > 0 : true;
  const customerItems = customers.map((item) => ({ id: item.sageId, title: item.name, subtitle: [item.city, item.email].filter(Boolean).join(' · ') || item.sageId }));
  const productItems = products.map((item) => ({ id: item.sku, title: item.name, subtitle: [item.sku, item.description].filter(Boolean).join(' · '), meta: formatMoney(item.price) }));

  function addProduct(sku: string) {
    const product = products.find((item) => item.sku === sku);
    if (!product) return;
    setCart((lines) => {
      const exists = lines.some((line) => line.sku === product.sku);
      return exists ? lines.map((line) => line.sku === product.sku ? { ...line, qty: line.qty + 1 } : line) : [...lines, { sku: product.sku, name: product.name, price: product.price, qty: 1 }];
    });
  }

  function changeQuantity(index: number, delta: number) {
    setCart((lines) => lines.map((line, lineIndex) => lineIndex === index ? { ...line, qty: line.qty + delta } : line).filter((line) => line.qty > 0));
  }

  async function advance() {
    setError('');
    if (!canAdvance) return;
    if (step < 3) { setStep((value) => value + 1); return; }
    setSending(true);
    try {
      const payload = { customerId, lines: cart.map((line) => ({ sku: line.sku, quantity: line.qty, unitPrice: line.price })) };
      const { jobId } = kind === 'quote' ? await api.createQuote(payload) : await api.createInvoice(payload);
      setMessage('Waiting for Sage 50 connector…');
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const job = await api.getJobStatus(jobId);
        setMessage(job.status === 'claimed' || job.status === 'running' ? `Sage 50 is creating the ${kind}…` : 'Waiting for Sage 50 connector…');
        if (job.status === 'failed') throw new Error(job.error || `Sage 50 rejected the ${kind}`);
        if (job.status === 'succeeded') {
          setMessage(`${kind === 'quote' ? 'Quote' : 'Invoice'} ${job.resource?.id || ''} created in Sage 50`);
          setStep(4);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      throw new Error('Timed out waiting for Sage 50. Check the connector.');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : `${kind === 'quote' ? 'Quote' : 'Invoice'} creation failed`);
    } finally {
      setSending(false);
    }
  }

  if (!customers.length && !error) return <LoadingRows />;

  return (
    <div className="wizard-shell">
      {step < 4 && <div className="progress" aria-label={`Step ${step + 1} of 4`}>{[0, 1, 2, 3].map((value) => <i className={value <= step ? 'on' : ''} key={value} />)}</div>}
      {error && <div className="error section" role="alert">{error}</div>}

      {step === 0 && <div className="wizard-grid">
        <section className="wizard-panel">
          <div className="seg section" aria-label="Document type">
            <button className={kind === 'invoice' ? 'active' : ''} onClick={() => setKind('invoice')} aria-pressed={kind === 'invoice'}>Invoice</button>
            <button className={kind === 'quote' ? 'active' : ''} onClick={() => setKind('quote')} aria-pressed={kind === 'quote'}>Quote</button>
          </div>
          <SearchPicker label="Customer" placeholder="Choose a customer" searchPlaceholder="Search customers…" items={customerItems} selectedId={customerId} onSelect={setCustomerId} />
        </section>
        <aside className="wizard-aside card"><span className="kicker">Document</span><h2>{kind === 'quote' ? 'Quote' : 'Invoice'} draft</h2><p className="notice">Select one customer. Search results stay collapsed until you need them.</p></aside>
      </div>}

      {step === 1 && <div className="wizard-grid wizard-grid-lines">
        <section className="wizard-panel">
          <SearchPicker label="Add a product or service" placeholder="Search the catalogue" searchPlaceholder="Search by name, SKU, or description…" items={productItems} onSelect={addProduct} />
          <p className="notice">Choose an item to add it. Search again to add another.</p>
        </section>
        <section className="wizard-aside card">
          <div className="section-head"><h2 className="kicker">Selected lines</h2><span className="tag">{cart.length}</span></div>
          {!cart.length && <p className="notice">No items selected yet.</p>}
          {cart.map((line, index) => <div className="line-item" key={line.sku}>
            <span className="row-main"><strong className="row-title">{line.name}</strong><span className="row-sub money">{line.sku} · {formatMoney(line.price)} each</span></span>
            <div className="quantity" aria-label={`Quantity for ${line.name}`}><button type="button" onClick={() => changeQuantity(index, -1)} aria-label={`Remove one ${line.name}`}><Minus size={13} /></button><span className="money">{line.qty}</span><button type="button" onClick={() => changeQuantity(index, 1)} aria-label={`Add one ${line.name}`}><Plus size={13} /></button></div>
            <strong className="money line-total">{formatMoney(line.price * line.qty)}</strong>
          </div>)}
        </section>
      </div>}

      {step === 2 && <div className="wizard-grid">
        <section className="card hero document-preview">
          <span className="kicker">{kind} draft</span><h2>{customer?.name}</h2><div className="rule" />
          {cart.map((line) => <div className="row" key={line.sku}><span className="row-main row-title">{line.name} × {line.qty}</span><span className="money small">{formatMoney(line.price * line.qty)}</span></div>)}
          <div className="rule" /><div className="total-row"><span>Subtotal</span><span className="money">{formatMoney(subtotal)}</span></div><div className="total-row"><span>HST 13%</span><span className="money">{formatMoney(subtotal * 0.13)}</span></div><div className="total-row strong"><span>Total</span><span className="money">{formatMoney(total)}</span></div>
        </section>
        <section className="wizard-aside"><h2 className="kicker">Payment terms</h2><div className="chips section">{['Due on receipt', 'Net 15', 'Net 30'].map((value) => <button className={`chip ${value === terms ? 'active' : ''}`} onClick={() => setTerms(value)} key={value}>{value}</button>)}</div><label className="kicker" htmlFor="job-note">Note on the job</label><textarea id="job-note" className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Visible to the customer" /></section>
      </div>}

      {step === 3 && <div className="wizard-grid"><section className="card hero"><span className="kicker">Ready to post</span><div className="hero-money money">{formatMoney(total)}</div><p className="notice">This {kind} will be posted through the real Sage 50 connector and its job status will be polled.</p></section><aside className="wizard-aside card"><span className="kicker">Summary</span><h2>{customer?.name}</h2><p className="notice">{cart.length} line{cart.length === 1 ? '' : 's'} · {terms}</p>{note && <p className="notice">“{note}”</p>}</aside></div>}

      {step === 4 && <div className="empty"><CheckCircle size={64} color="var(--color-accent)" /><h2>{message}</h2><p className="notice">The connector confirmed the write.</p><button onClick={() => router.replace('/dashboard')} className="btn btn-block">Back to home</button></div>}

      {step < 4 && <div className="wizard-actions"><button type="button" className="btn" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || sending}>Back</button><button type="button" className="btn btn-primary" disabled={!canAdvance || sending} onClick={advance}>{sending ? message : <>{step === 3 && <PaperPlaneTilt />} {step === 0 ? 'Add lines' : step === 1 ? 'Review' : step === 2 ? 'Posting options' : kind === 'quote' ? 'Post quote' : 'Post invoice'}</>}</button></div>}
    </div>
  );
}
