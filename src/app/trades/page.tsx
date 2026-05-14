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
  const [sortCol, setSortCol] = useState<'date' | 'ticker' | 'action' | 'shares' | 'price_mxn' | 'total_mxn'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(col: typeof sortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function trArrow(col: typeof sortCol) {
    if (col !== sortCol) return null;
    return <span style={{ color: '#ff8c00', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

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

  const sortedTrades = [...trades].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'date':      cmp = a.date.localeCompare(b.date); break;
      case 'ticker':    cmp = a.ticker.localeCompare(b.ticker); break;
      case 'action':    cmp = a.action.localeCompare(b.action); break;
      case 'shares':    cmp = a.shares - b.shares; break;
      case 'price_mxn': cmp = a.price_mxn - b.price_mxn; break;
      case 'total_mxn': cmp = a.total_mxn - b.total_mxn; break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const pnlPos = summary.total_realized_pnl >= 0;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {[
          { label: 'Realized P&L', value: `${pnlPos ? '+' : ''}${formatMxn(summary.total_realized_pnl)}`, color: pnlPos ? 'var(--positive)' : 'var(--negative)' },
          { label: 'Total Trades', value: summary.total_trades.toString(), color: 'var(--text)' },
          { label: 'Win Rate', value: `${summary.win_rate}%`, color: summary.win_rate >= 50 ? 'var(--positive)' : 'var(--negative)' },
        ].map((s, i) => (
          <div key={i} style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <div className="section-header">{s.label.toUpperCase()}</div>
            <div style={{ padding: '8px 12px', fontSize: 18, fontWeight: 600, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ width: 110 }}
          placeholder="TICKER"
          value={filterTicker}
          onChange={e => setFilterTicker(e.target.value.toUpperCase())}
        />
        <select className="form-select" style={{ width: 110 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">ALL ACTIONS</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <input className="form-input" style={{ width: 140 }} type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        <input className="form-input" style={{ width: 140 }} type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        <button className="btn" onClick={() => { setFilterTicker(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); }}>
          CLEAR
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="section-header">TRADE LOG</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>Date{trArrow('date')}</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('ticker')}>Ticker{trArrow('ticker')}</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('action')}>Action{trArrow('action')}</th>
                <th className="right" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('shares')}>Shares{trArrow('shares')}</th>
                <th className="right" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('price_mxn')}>Price{trArrow('price_mxn')}</th>
                <th className="right" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('total_mxn')}>Total{trArrow('total_mxn')}</th>
                <th className="right">P&L</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LOADING...</td></tr>
              )}
              {!loading && trades.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NO TRADES FOUND</td></tr>
              )}
              {!loading && sortedTrades.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>
                    <div style={{ color: 'var(--text-ticker)', fontWeight: 700, fontSize: 13 }}>{t.ticker}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t.name}</div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      color: t.action === 'BUY' ? 'var(--positive)' : 'var(--negative)',
                      borderColor: t.action === 'BUY' ? 'var(--positive)' : 'var(--negative)',
                    }}>
                      {t.action}
                    </span>
                  </td>
                  <td className="right">{t.shares}</td>
                  <td className="right">{formatMxn(t.price_mxn)}</td>
                  <td className="right">{formatMxn(t.total_mxn)}</td>
                  <td className="right">
                    {t.realized_pnl_mxn != null ? (
                      <span style={{ color: t.realized_pnl_mxn >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                        {t.realized_pnl_mxn >= 0 ? '+' : ''}{formatMxn(t.realized_pnl_mxn)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: 200 }}>{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
