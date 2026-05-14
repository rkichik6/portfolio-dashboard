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
    if (!sellPrice || !sellDate) { setError('SELL PRICE AND DATE REQUIRED.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/holdings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: holding.id, sell_price_mxn: parseFloat(sellPrice), sell_date: sellDate, notes: notes || null }),
      });
      if (!res.ok) throw new Error('Failed');
      window.dispatchEvent(new Event('cash-update'));
      onSold();
      onClose();
    } catch {
      setError('FAILED TO PROCESS SALE.');
    } finally {
      setSaving(false);
    }
  }

  const pnlPos = previewPnl >= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>SELL {holding.ticker}</h3>
          <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={onClose}><X size={12} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--negative)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>{error}</div>}

          {/* Position summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', marginBottom: 12 }}>
            {[
              { label: 'Shares', value: String(holding.shares), color: 'var(--text)' },
              { label: 'Entry', value: formatMxn(holding.entry_price_mxn), color: 'var(--text)' },
              { label: 'P&L Preview', value: `${pnlPos ? '+' : ''}${formatMxn(previewPnl)}`, color: pnlPos ? 'var(--positive)' : 'var(--negative)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--surface2)', padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
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
          <button className="btn" onClick={onClose}>CANCEL</button>
          <button className="btn btn-danger" onClick={handleSell} disabled={saving}>
            {saving ? 'PROCESSING...' : 'CONFIRM SELL'}
          </button>
        </div>
      </div>
    </div>
  );
}
