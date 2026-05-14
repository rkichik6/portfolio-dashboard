'use client';
import { useEffect, useState, useCallback } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface CashData {
  amount: number;
  initialized: number;
  last_updated: string | null;
}

interface CashBalanceProps {
  onBalanceChange?: (amount: number) => void;
}

export default function CashBalance({ onBalanceChange }: CashBalanceProps) {
  const [data, setData] = useState<CashData | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastDeducted, setLastDeducted] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cash');
      const json = await res.json() as CashData;
      setData(json);
      onBalanceChange?.(json.amount);
    } catch { /* ignore */ }
  }, [onBalanceChange]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('cash-update', handler);
    return () => window.removeEventListener('cash-update', handler);
  }, [load]);

  function startEdit() {
    setInputValue(data?.initialized ? data.amount.toFixed(2) : '');
    setError('');
    setLastDeducted(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError('');
    setLastDeducted(null);
  }

  async function handleSave() {
    const parsed = parseFloat(inputValue.replace(/[^0-9.-]/g, ''));
    if (isNaN(parsed) || parsed < 0) {
      setError('INVALID AMOUNT');
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
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? 'Failed');
      }
      const json = await res.json() as CashData & { holdings_cost_deducted: number };
      setData(json);
      onBalanceChange?.(json.amount);
      if (json.holdings_cost_deducted > 0) setLastDeducted(json.holdings_cost_deducted);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SAVE FAILED');
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

  const isInit = data?.initialized === 1;

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Section header */}
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <span>CASH BALANCE{!isInit && <span style={{ color: 'var(--negative)', marginLeft: 8 }}>— NOT SET</span>}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!editing ? (
            <button className="btn" style={{ padding: '2px 8px', height: 18, fontSize: 9 }} onClick={startEdit}>
              <Pencil size={8} /> {isInit ? 'UPDATE' : 'SET BALANCE'}
            </button>
          ) : (
            <>
              <button className="btn btn-success" style={{ padding: '2px 8px', height: 18, fontSize: 9 }} onClick={handleSave} disabled={saving}>
                <Check size={8} /> {saving ? 'SAVING' : 'SAVE'}
              </button>
              <button className="btn" style={{ padding: '2px 8px', height: 18, fontSize: 9 }} onClick={cancelEdit}>
                <X size={8} /> CANCEL
              </button>
            </>
          )}
        </div>
      </div>

      {/* Display / edit area */}
      <div style={{ padding: '10px 12px' }}>
        {!editing && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: isInit ? 'var(--positive)' : 'var(--text-dim)' }}>
              {isInit ? fmt(data!.amount) : '—'}
            </div>
            {data?.last_updated && isInit && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Updated {new Date(data.last_updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}

        {editing && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {isInit ? 'Enter new balance (MXN)' : 'Enter total cash before buying positions — existing holdings deducted automatically'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>MXN</span>
              <input
                className="form-input"
                style={{ width: 200 }}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
                placeholder="e.g. 50000"
                autoFocus
              />
            </div>
            {error && <div style={{ fontSize: 10, color: 'var(--negative)', marginTop: 4, textTransform: 'uppercase' }}>{error}</div>}
          </div>
        )}

        {lastDeducted && !editing && (
          <div style={{ fontSize: 10, color: 'var(--positive)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            INIT COMPLETE — DEDUCTED {fmt(lastDeducted)} FOR OPEN POSITIONS. STORED: {fmt(data!.amount)}
          </div>
        )}
      </div>
    </div>
  );
}
