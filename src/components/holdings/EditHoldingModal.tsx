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
        body: JSON.stringify({
          id: holding.id,
          shares: parseFloat(shares),
          entry_price_mxn: parseFloat(entryPrice),
          bucket,
          conviction,
          thesis: thesis || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
      onClose();
    } catch {
      setError('Failed to update holding.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="mono" style={{ fontSize: '0.85rem' }}>Edit {holding.ticker}</h3>
          <button className="btn" style={{ padding: '0.2rem 0.4rem' }} onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
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
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
