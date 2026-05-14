'use client';
import { useEffect, useState, useCallback } from 'react';
import { Check, Pencil, X, Wallet } from 'lucide-react';

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
    } catch {
      // ignore
    }
  }, [onBalanceChange]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('cash-update', handler);
    return () => window.removeEventListener('cash-update', handler);
  }, [load]);

  function startEdit() {
    setInputValue(data?.initialized ? (data.amount.toFixed(2)) : '');
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
      setError('Enter a valid positive amount in MXN');
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
      if (json.holdings_cost_deducted > 0) {
        setLastDeducted(json.holdings_cost_deducted);
      }
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

  const isInit = data?.initialized === 1;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `2px solid ${isInit ? 'var(--accent2)' : 'var(--warning)'}`,
    }}>
      <div style={{
        padding: '0.75rem 1.25rem',
        borderBottom: editing || lastDeducted ? '1px solid var(--border)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Wallet size={15} color={isInit ? 'var(--accent2)' : 'var(--warning)'} />
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              Cash Balance
              {!isInit && <span style={{ marginLeft: '0.5rem', color: 'var(--warning)', fontWeight: 400 }}>— Not set</span>}
            </div>
            {!editing && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: isInit ? 'var(--accent2)' : 'var(--muted)' }}>
                {isInit ? fmt(data!.amount) : '—'}
              </div>
            )}
            {!editing && data?.last_updated && isInit && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                Updated {new Date(data.last_updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {!editing ? (
            <button className="btn" onClick={startEdit}>
              <Pencil size={11} />
              {isInit ? 'Update' : 'Set Initial Balance'}
            </button>
          ) : (
            <>
              <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                <Check size={11} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn" onClick={cancelEdit}>
                <X size={11} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: lastDeducted ? '1px solid var(--border)' : 'none' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            {isInit
              ? 'Enter new balance in MXN — overwrites current value'
              : 'Enter total cash before buying open positions — existing holdings will be deducted automatically'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-dim)' }}>MXN</span>
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
          {error && (
            <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.4rem' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {lastDeducted && !editing && (
        <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent2)' }}>
            Initial setup complete — deducted {fmt(lastDeducted)} for existing positions. Stored balance: {fmt(data!.amount)}
          </div>
        </div>
      )}
    </div>
  );
}
