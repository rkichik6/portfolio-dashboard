'use client';
import { useEffect, useState, useCallback } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface CashBalanceProps {
  onBalanceChange?: (amount: number) => void;
}

export default function CashBalance({ onBalanceChange }: CashBalanceProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cash');
      const data = await res.json() as { amount: number; last_updated: string };
      setAmount(data.amount);
      setLastUpdated(data.last_updated);
      onBalanceChange?.(data.amount);
    } catch {
      // ignore
    }
  }, [onBalanceChange]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    setInputValue(amount?.toFixed(2) ?? '0.00');
    setError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError('');
  }

  async function handleSave() {
    const parsed = parseFloat(inputValue.replace(/,/g, ''));
    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a valid amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/cash', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json() as { amount: number; last_updated: string };
      setAmount(data.amount);
      setLastUpdated(data.last_updated);
      onBalanceChange?.(data.amount);
      setEditing(false);
    } catch {
      setError('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const formatted = amount !== null
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount)
    : '—';

  return (
    <div style={{
      padding: '1rem 1.25rem',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--accent2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          Cash Balance
        </div>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.9rem', color: 'var(--text-dim)' }}>MXN</span>
            <input
              className="form-input"
              style={{ width: 160, fontSize: '1rem', padding: '0.3rem 0.5rem' }}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
              autoFocus
            />
            {error && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', color: 'var(--danger)' }}>{error}</span>}
          </div>
        ) : (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.4rem', color: 'var(--accent2)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {formatted}
          </div>
        )}
        {lastUpdated && !editing && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Updated {new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {editing ? (
          <>
            <button className="btn btn-success" style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={handleSave} disabled={saving}>
              <Check size={12} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn" style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={cancelEdit}>
              <X size={12} /> Cancel
            </button>
          </>
        ) : (
          <button className="btn" style={{ padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={startEdit}>
            <Pencil size={12} /> Update
          </button>
        )}
      </div>
    </div>
  );
}
