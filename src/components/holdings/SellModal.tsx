'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatMxn } from '@/lib/calculations';
import type { Holding } from '@/components/dashboard/HoldingsTable';

interface SellModalProps {
  holdings: Holding[];
  portfolioId: number;
  initialTicker?: string;
  onClose: () => void;
  onSold: () => void;
}

export default function SellModal({ holdings, portfolioId, initialTicker, onClose, onSold }: SellModalProps) {
  const defaultTicker = initialTicker ?? holdings[0]?.ticker ?? '';
  const [ticker, setTicker] = useState(defaultTicker);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const holding = holdings.find(h => h.ticker === ticker);

  useEffect(() => {
    if (holding) {
      setPrice(holding.current_price_mxn.toFixed(2));
      setShares('');
    }
  }, [ticker]);

  const sharesNum = parseFloat(shares) || 0;
  const priceNum = parseFloat(price) || 0;
  const proceeds = sharesNum * priceNum;
  const previewPnl = holding ? (priceNum - holding.entry_price_mxn) * sharesNum : 0;
  const pnlPos = previewPnl >= 0;

  async function handleSell() {
    if (!ticker || !shares || !price || !date) { setError('ALL FIELDS ARE REQUIRED.'); return; }
    if (holding && sharesNum > holding.shares + 0.0001) {
      setError(`YOU ONLY HOLD ${holding.shares} SHARES OF ${ticker}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolioId, ticker, shares: sharesNum, price_mxn: priceNum, date, notes: notes.trim() || null }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to process sell.');
      window.dispatchEvent(new Event('cash-update'));
      onSold();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message.toUpperCase() : 'FAILED TO PROCESS SELL.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--negative)' }}>SELL</h3>
          <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={onClose}><X size={12} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ color: 'var(--negative)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Ticker</label>
            <select
              className="form-select"
              value={ticker}
              onChange={e => { setTicker(e.target.value); setError(''); }}
            >
              {holdings.map(h => (
                <option key={h.ticker} value={h.ticker}>{h.ticker} — {h.name}</option>
              ))}
            </select>
          </div>

          {holding && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', marginBottom: 12 }}>
              {[
                { label: 'Held', value: String(holding.shares), color: 'var(--text)' },
                { label: 'Avg Entry', value: formatMxn(holding.entry_price_mxn), color: 'var(--text)' },
                { label: 'P&L Preview', value: sharesNum > 0 ? `${pnlPos ? '+' : ''}${formatMxn(previewPnl)}` : '—', color: sharesNum > 0 ? (pnlPos ? 'var(--positive)' : 'var(--negative)') : 'var(--text-dim)' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--surface2)', padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div className="form-group">
              <label className="form-label">Quantity to Sell</label>
              <input
                className="form-input"
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder={holding ? `max ${holding.shares}` : '0'}
                min="0.0001"
                max={holding?.shares}
                step="any"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sale Price (MXN)</label>
              <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="any" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Proceeds</label>
              <div className="form-input" style={{ color: proceeds > 0 ? 'var(--positive)' : 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {proceeds > 0 ? formatMxn(proceeds) : '—'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for selling..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>CANCEL</button>
          <button className="btn btn-sell" onClick={handleSell} disabled={saving}>
            {saving ? 'PROCESSING...' : 'CONFIRM SELL'}
          </button>
        </div>
      </div>
    </div>
  );
}
