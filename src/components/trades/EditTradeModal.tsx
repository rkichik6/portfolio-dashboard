'use client';
import { useEffect, useRef, useState } from 'react';

interface Trade {
  id: number;
  ticker: string;
  name: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price_mxn: number;
  total_mxn: number;
  date: string;
  notes: string | null;
  realized_pnl_mxn: number | null;
}

interface Props {
  trade: Trade;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTradeModal({ trade, onClose, onSaved }: Props) {
  const [ticker, setTicker] = useState(trade.ticker);
  const [name, setName] = useState(trade.name);
  const [action, setAction] = useState<'BUY' | 'SELL'>(trade.action);
  const [shares, setShares] = useState(trade.shares.toString());
  const [price, setPrice] = useState(trade.price_mxn.toString());
  const [date, setDate] = useState(trade.date);
  const [notes, setNotes] = useState(trade.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(price);
    if (!ticker || !date || isNaN(sharesNum) || sharesNum <= 0 || isNaN(priceNum) || priceNum <= 0) {
      setError('All fields required. Shares and price must be positive.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trade.id,
          ticker: ticker.toUpperCase(),
          name,
          action,
          shares: sharesNum,
          price_mxn: priceNum,
          date,
          notes: notes || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to update trade.');
        return;
      }
      window.dispatchEvent(new Event('cash-update'));
      onSaved();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const total = (parseFloat(shares) || 0) * (parseFloat(price) || 0);

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        width: 420, maxWidth: '95vw', fontFamily: 'var(--font-mono)',
      }}>
        <div className="section-header" style={{ justifyContent: 'space-between' }}>
          <span>EDIT TRADE #{trade.id}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Ticker</div>
              <input
                className="form-input"
                style={{ width: '100%', textTransform: 'uppercase' }}
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Action</div>
              <select className="form-select" style={{ width: '100%' }} value={action} onChange={e => setAction(e.target.value as 'BUY' | 'SELL')}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Company Name</div>
            <input className="form-input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Shares</div>
              <input className="form-input" style={{ width: '100%' }} type="number" min="0" step="any" value={shares} onChange={e => setShares(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Price (MXN)</div>
              <input className="form-input" style={{ width: '100%' }} type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Date</div>
            <input className="form-input" style={{ width: '100%' }} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Notes</div>
            <input className="form-input" style={{ width: '100%' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          {total > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
              Total: <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}
              </span>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 11, color: 'var(--negative)', border: '1px solid var(--negative)', padding: '6px 10px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn" onClick={onClose} disabled={saving}>CANCEL</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
