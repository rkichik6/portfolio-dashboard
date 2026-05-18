'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import TickerSearch from '@/components/shared/TickerSearch';
import { getStopLossPrice, getStopLossPct, formatMxn } from '@/lib/calculations';
import type { Holding } from '@/components/dashboard/HoldingsTable';

interface BuyModalProps {
  holdings: Holding[];
  portfolioId: number;
  onClose: () => void;
  onSaved: () => void;
  initial?: { ticker?: string; name?: string; price_mxn?: number };
}

const CONVICTION_OPTIONS = [
  { value: 'very-high', label: 'VERY HIGH' },
  { value: 'high', label: 'HIGH' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'speculative', label: 'SPECULATIVE' },
];

export default function BuyModal({ holdings, portfolioId, onClose, onSaved, initial }: BuyModalProps) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(initial?.price_mxn != null ? initial.price_mxn.toFixed(2) : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bucket, setBucket] = useState('core');
  const [conviction, setConviction] = useState('high');
  const [thesis, setThesis] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const existingHolding = holdings.find(h => h.ticker === ticker.toUpperCase());
  const priceNum = parseFloat(price) || 0;
  const convictionTyped = conviction as 'very-high' | 'high' | 'medium' | 'speculative';
  const stopLoss = priceNum > 0 ? getStopLossPrice(priceNum, convictionTyped) : 0;
  const stopPct = getStopLossPct(convictionTyped);

  function handleSelect(t: string, n: string, priceMxn?: number) {
    setTicker(t);
    setName(prev => prev || n);
    if (priceMxn) setPrice(priceMxn.toFixed(2));

    const found = holdings.find(h => h.ticker === t.toUpperCase());
    if (found) {
      setBucket(found.bucket);
      setConviction(found.conviction);
      setThesis(found.thesis ?? '');
    }
  }

  async function handleSave() {
    if (!ticker || !name || !shares || !price || !date) {
      setError('TICKER, NAME, SHARES, PRICE, AND DATE ARE REQUIRED.');
      return;
    }
    const sharesNum = parseFloat(shares);
    const priceVal = parseFloat(price);
    if (isNaN(sharesNum) || sharesNum <= 0) { setError('INVALID QUANTITY.'); return; }
    if (isNaN(priceVal) || priceVal <= 0) { setError('INVALID PRICE.'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          ticker: ticker.toUpperCase(),
          name,
          shares: sharesNum,
          price_mxn: priceVal,
          date,
          bucket,
          conviction,
          thesis: thesis.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to process buy.');
      }
      fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), name }),
      }).catch(() => {});
      window.dispatchEvent(new Event('cash-update'));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message.toUpperCase() : 'FAILED TO PROCESS BUY.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--positive)' }}>BUY</h3>
          <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={onClose}><X size={12} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ color: 'var(--negative)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {error}
            </div>
          )}
          {existingHolding && (
            <div style={{
              fontSize: 10,
              color: 'var(--positive)',
              background: '#001a00',
              border: '1px solid #003300',
              padding: '6px 10px',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              ADDING TO EXISTING POSITION · {existingHolding.shares} SHARES @ {formatMxn(existingHolding.entry_price_mxn)} AVG
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Ticker</label>
            <TickerSearch
              defaultValue={initial?.ticker}
              placeholder="Search ticker or type symbol..."
              onSelect={handleSelect}
              onChange={v => setTicker(v)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Auto-filled on selection" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="10" min="0.0001" step="any" />
            </div>
            <div className="form-group">
              <label className="form-label">Price per Share (MXN)</label>
              <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="2320.00" min="0" step="any" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bucket</label>
              <select className="form-select" value={bucket} onChange={e => setBucket(e.target.value)}>
                <option value="core">CORE</option>
                <option value="swing">SWING</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Conviction</label>
            <select className="form-select" value={conviction} onChange={e => setConviction(e.target.value)}>
              {CONVICTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {stopLoss > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '6px 8px', background: '#0d0d0d', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>STOP LOSS</span>
              <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>{formatMxn(stopLoss)}</span>
              <span style={{ fontSize: 10, color: '#555555' }}>−{(stopPct * 100).toFixed(0)}% FROM ENTRY</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Thesis (optional)</label>
            <textarea className="form-textarea" value={thesis} onChange={e => setThesis(e.target.value)} placeholder="Why are you buying this?" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>CANCEL</button>
          <button className="btn btn-buy" onClick={handleSave} disabled={saving}>
            {saving ? 'PROCESSING...' : existingHolding ? 'BUY MORE' : 'BUY'}
          </button>
        </div>
      </div>
    </div>
  );
}
