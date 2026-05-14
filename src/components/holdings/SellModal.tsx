'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Holding } from '@/components/dashboard/HoldingsTable';
import { formatMxn } from '@/lib/calculations';

interface SellModalProps {
  holding: Holding;
  onClose: () => void;
  onSold: () => void;
}

export default function SellModal({ holding, onClose, onSold }: SellModalProps) {
  const [sellPrice, setSellPrice] = useState(holding.current_price_mxn.toFixed(2));
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewPnl = (parseFloat(sellPrice) - holding.entry_price_mxn) * holding.shares;
  const previewPct = holding.entry_price_mxn > 0
    ? ((parseFloat(sellPrice) - holding.entry_price_mxn) / holding.entry_price_mxn) * 100
    : 0;

  async function handleSell() {
    if (!sellPrice || !sellDate) {
      setError('Sell price and date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/holdings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: holding.id,
          sell_price_mxn: parseFloat(sellPrice),
          sell_date: sellDate,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      window.dispatchEvent(new Event('cash-update'));
      onSold();
      onClose();
    } catch {
      setError('Failed to process sale.');
    } finally {
      setSaving(false);
    }
  }

  const pnlPos = previewPnl >= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sell <span style={{ fontFamily: 'var(--font-mono)' }}>{holding.ticker}</span></h3>
          <button className="btn" style={{ padding: '0.2rem 0.4rem' }} onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>}

          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Shares</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{holding.shares}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Entry</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{formatMxn(holding.entry_price_mxn)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Realized P&L</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: pnlPos ? 'var(--accent2)' : 'var(--danger)' }}>
                  {pnlPos ? '+' : ''}{formatMxn(previewPnl)} ({pnlPos ? '+' : ''}{previewPct.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label className="form-label">Sell Price (MXN)</label>
              <input className="form-input" type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sell Date</label>
              <input className="form-input" type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for selling..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleSell} disabled={saving}>
            {saving ? 'Processing...' : 'Confirm Sell'}
          </button>
        </div>
      </div>
    </div>
  );
}
