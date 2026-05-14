'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface AddHoldingModalProps {
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<{ ticker: string; name: string; entry_price_mxn: number }>;
}

const CONVICTION_OPTIONS = [
  { value: 'very-high', label: 'Very High' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'speculative', label: 'Speculative' },
];

export default function AddHoldingModal({ onClose, onSaved, initial }: AddHoldingModalProps) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [shares, setShares] = useState('');
  const [entryPrice, setEntryPrice] = useState(initial?.entry_price_mxn?.toString() ?? '');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [bucket, setBucket] = useState('core');
  const [conviction, setConviction] = useState('high');
  const [thesis, setThesis] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchName() {
    if (!ticker || name) return;
    try {
      const res = await fetch(`/api/prices?tickers=${ticker.toUpperCase()}`);
      const data = await res.json();
      if (data[ticker.toUpperCase()]?.name) setName(data[ticker.toUpperCase()].name);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!ticker || !name || !shares || !entryPrice || !entryDate) {
      setError('ALL FIELDS EXCEPT THESIS ARE REQUIRED.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), name, shares: parseFloat(shares), entry_price_mxn: parseFloat(entryPrice), entry_date: entryDate, bucket, conviction, thesis: thesis || null }),
      });
      if (!res.ok) throw new Error('Failed');
      window.dispatchEvent(new Event('cash-update'));
      onSaved();
      onClose();
    } catch {
      setError('FAILED TO SAVE HOLDING.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>ADD HOLDING</h3>
          <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={onClose}><X size={12} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--negative)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div className="form-group">
              <label className="form-label">Ticker</label>
              <input className="form-input" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onBlur={fetchName} placeholder="PLTR" />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Auto-fetched on blur" />
            </div>
            <div className="form-group">
              <label className="form-label">Shares</label>
              <input className="form-input" type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="10" />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Price (MXN)</label>
              <input className="form-input" type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="2320.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Date</label>
              <input className="form-input" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bucket</label>
              <select className="form-select" value={bucket} onChange={e => setBucket(e.target.value)}>
                <option value="core">Core</option>
                <option value="swing">Swing</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Conviction</label>
            <select className="form-select" value={conviction} onChange={e => setConviction(e.target.value)}>
              {CONVICTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Thesis (optional)</label>
            <textarea className="form-textarea" value={thesis} onChange={e => setThesis(e.target.value)} placeholder="Why are you holding this?" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'ADD HOLDING'}
          </button>
        </div>
      </div>
    </div>
  );
}
