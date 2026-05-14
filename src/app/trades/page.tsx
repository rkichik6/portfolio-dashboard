'use client';
import { useEffect, useState, useCallback } from 'react';
import { formatMxn } from '@/lib/calculations';

interface Trade {
  id: number;
  ticker: string;
  name: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price_mxn: number;
  total_mxn: number;
  date: string;
  notes: string | null;
  realized_pnl_mxn: number | null;
}

interface Summary {
  total_realized_pnl: number;
  total_trades: number;
  win_rate: number;
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_realized_pnl: 0, total_trades: 0, win_rate: 0 });
  const [loading, setLoading] = useState(true);
  const [filterTicker, setFilterTicker] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTicker) params.set('ticker', filterTicker);
      if (filterAction) params.set('action', filterAction);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const res = await fetch(`/api/trades?${params}`);
      const data = await res.json() as { trades: Trade[]; summary: Summary };
      setTrades(data.trades ?? []);
      setSummary(data.summary ?? { total_realized_pnl: 0, total_trades: 0, win_rate: 0 });
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [filterTicker, filterAction, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const pnlPos = summary.total_realized_pnl >= 0;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Trade Log</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Realized P&L', value: `${pnlPos ? '+' : ''}${formatMxn(summary.total_realized_pnl)}`, color: pnlPos ? 'var(--accent2)' : 'var(--danger)' },
          { label: 'Total Trades', value: summary.total_trades.toString(), color: 'var(--text)' },
          { label: 'Win Rate', value: `${summary.win_rate}%`, color: summary.win_rate >= 50 ? 'var(--accent2)' : 'var(--danger)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ width: 120 }}
          placeholder="Ticker filter"
          value={filterTicker}
          onChange={e => setFilterTicker(e.target.value.toUpperCase())}
        />
        <select className="form-select" style={{ width: 120 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">All actions</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <input
          className="form-input"
          style={{ width: 150 }}
          type="date"
          placeholder="From"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
        />
        <input
          className="form-input"
          style={{ width: 150 }}
          type="date"
          placeholder="To"
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
        />
        <button className="btn" onClick={() => { setFilterTicker(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); }}>
          Clear
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Action</th>
                <th>Shares</th>
                <th>Price (MXN)</th>
                <th>Total (MXN)</th>
                <th>Realized P&L</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && trades.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    No trades found.
                  </td>
                </tr>
              )}
              {!loading && trades.map(t => (
                <tr key={t.id}>
                  <td className="number" style={{ fontSize: '0.8rem' }}>{t.date}</td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: '0.82rem' }}>{t.ticker}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t.name}</div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      color: t.action === 'BUY' ? 'var(--accent2)' : 'var(--danger)',
                      borderColor: t.action === 'BUY' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                    }}>
                      {t.action}
                    </span>
                  </td>
                  <td className="number">{t.shares}</td>
                  <td className="number">{formatMxn(t.price_mxn)}</td>
                  <td className="number">{formatMxn(t.total_mxn)}</td>
                  <td>
                    {t.realized_pnl_mxn != null ? (
                      <span className="number" style={{ color: t.realized_pnl_mxn >= 0 ? 'var(--accent2)' : 'var(--danger)' }}>
                        {t.realized_pnl_mxn >= 0 ? '+' : ''}{formatMxn(t.realized_pnl_mxn)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)', maxWidth: 200 }}>{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
