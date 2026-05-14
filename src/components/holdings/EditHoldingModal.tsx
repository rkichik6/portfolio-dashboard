'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Holding } from '@/components/dashboard/HoldingsTable';

interface EditHoldingModalProps {
  holding: Holding;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditHoldingModal({ holding, onClose, onSaved }: EditHoldingModalProps) {
  const [shares, setShares] = useState(holding.shares.toString());
  const [entryPrice, setEntryPrice] = useState(holding.entry_price_mxn.toString());
  const [bucket, setBucket] = useState(holding.bucket);
  const [conviction, setConviction] = useState(holding.conviction);
  const [thesis, setThesis] = useState(holding.thesis ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/holdings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: holding.id, shares: parseFloat(shares), entry_price_mxn: parseFloat(entryPrice), bucket, conviction, thesis: thesis || null }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
      onClose();
    } catch {
      setError('FAILED TO UPDATE HOLDING.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>EDIT {holding.ticker}</h3>
          <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={onClose}><X size={12} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--negative)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div className="form-group">
              <label className="form-label">Shares</label>
              <input className="form-input" type="number" value={shares} onChange={e => setShares(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Price (MXN)</label>
              <input className="form-input" type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bucket</label>
              <select className="form-select" value={bucket} onChange={e => setBucket(e.target.value)}>
                <option value="core">Core</option>
                <option value="swing">Swing</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Conviction</label>
              <select className="form-select" value={conviction} onChange={e => setConviction(e.target.value)}>
                <option value="very-high">Very High</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="speculative">Speculative</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Thesis</label>
            <textarea className="form-textarea" value={thesis} onChange={e => setThesis(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}
