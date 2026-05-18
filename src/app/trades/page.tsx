'use client';
import { useEffect, useState, useCallback } from 'react';
import { formatMxn } from '@/lib/calculations';
import EditTradeModal from '@/components/trades/EditTradeModal';
import { usePortfolio } from '@/context/PortfolioContext';

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
  deleted: number;
  deleted_at: string | null;
}

interface Summary {
  total_realized_pnl: number;
  total_trades: number;
  win_rate: number;
}

export default function TradesPage() {
  const { activePortfolioId } = usePortfolio();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_realized_pnl: 0, total_trades: 0, win_rate: 0 });
  const [loading, setLoading] = useState(true);
  const [filterTicker, setFilterTicker] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sortCol, setSortCol] = useState<'date' | 'ticker' | 'action' | 'shares' | 'price_mxn' | 'total_mxn'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showDeleted, setShowDeleted] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Trade | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState('');

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
      params.set('portfolio_id', String(activePortfolioId));
      if (filterTicker) params.set('ticker', filterTicker);
      if (filterAction) params.set('action', filterAction);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      if (showDeleted) params.set('showDeleted', '1');
      const res = await fetch(`/api/trades?${params}`);
      const data = await res.json() as { trades: Trade[]; summary: Summary };
      setTrades(data.trades ?? []);
      setSummary(data.summary ?? { total_realized_pnl: 0, total_trades: 0, win_rate: 0 });
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId, filterTicker, filterAction, filterFrom, filterTo, showDeleted]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/trades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? 'Failed to delete trade.');
        return;
      }
      window.dispatchEvent(new Event('cash-update'));
      setConfirmDelete(null);
      load();
    } catch {
      setDeleteError('Network error. Try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestore(id: number) {
    setRestoring(id);
    setRestoreError('');
    try {
      const res = await fetch('/api/trades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setRestoreError(data.error ?? 'Failed to restore trade.');
        return;
      }
      window.dispatchEvent(new Event('cash-update'));
      load();
    } catch {
      setRestoreError('Network error. Try again.');
    } finally {
      setRestoring(null);
    }
  }

  const sortedTrades = [...trades].sort((a, b) => {
    // Always put deleted rows at the bottom when mixed view is active
    if (showDeleted && a.deleted !== b.deleted) return a.deleted ? 1 : -1;

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
  const colSpan = showDeleted ? 10 : 9;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary stats */}
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

      {/* Restore error banner */}
      {restoreError && (
        <div style={{ fontSize: 11, color: 'var(--negative)', border: '1px solid var(--negative)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{restoreError}</span>
          <button onClick={() => setRestoreError('')} style={{ background: 'none', border: 'none', color: 'var(--negative)', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="section-header" style={{ justifyContent: 'space-between' }}>
          <span>TRADE LOG</span>
          <button
            className="btn"
            onClick={() => { setShowDeleted(d => !d); setRestoreError(''); }}
            style={{ fontSize: 9 }}
          >
            {showDeleted ? 'HIDE DELETED' : 'SHOW DELETED'}
          </button>
        </div>
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
                {showDeleted && <th style={{ color: 'var(--negative)', fontSize: 9 }}>DELETED</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={colSpan} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LOADING...</td></tr>
              )}
              {!loading && trades.length === 0 && (
                <tr><td colSpan={colSpan} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NO TRADES FOUND</td></tr>
              )}
              {!loading && sortedTrades.map(t => {
                const isDeleted = !!t.deleted;
                const dimColor = '#444444';
                const cellStyle = isDeleted ? { color: dimColor } : {};

                return (
                  <tr
                    key={t.id}
                    style={{ background: isDeleted ? '#0d0000' : undefined }}
                  >
                    <td style={cellStyle}>{t.date}</td>
                    <td>
                      <div style={{ color: isDeleted ? dimColor : 'var(--text-ticker)', fontWeight: 700, fontSize: 13 }}>{t.ticker}</div>
                      <div style={{ fontSize: 10, color: dimColor }}>{t.name}</div>
                    </td>
                    <td>
                      {isDeleted ? (
                        <span className="badge" style={{ color: dimColor, borderColor: dimColor }}>{t.action}</span>
                      ) : (
                        <span className="badge" style={{
                          color: t.action === 'BUY' ? 'var(--positive)' : 'var(--negative)',
                          borderColor: t.action === 'BUY' ? 'var(--positive)' : 'var(--negative)',
                        }}>
                          {t.action}
                        </span>
                      )}
                    </td>
                    <td className="right" style={cellStyle}>{t.shares}</td>
                    <td className="right" style={cellStyle}>{formatMxn(t.price_mxn)}</td>
                    <td className="right" style={cellStyle}>{formatMxn(t.total_mxn)}</td>
                    <td className="right">
                      {t.realized_pnl_mxn != null ? (
                        <span style={{ color: isDeleted ? dimColor : (t.realized_pnl_mxn >= 0 ? 'var(--positive)' : 'var(--negative)'), fontWeight: 600 }}>
                          {t.realized_pnl_mxn >= 0 ? '+' : ''}{formatMxn(t.realized_pnl_mxn)}
                        </span>
                      ) : (
                        <span style={{ color: isDeleted ? dimColor : 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: dimColor, maxWidth: 200 }}>{t.notes ?? '—'}</td>
                    {showDeleted && (
                      <td style={{ fontSize: 9, whiteSpace: 'nowrap' }}>
                        {isDeleted && (
                          <div>
                            <div style={{ color: 'var(--negative)', letterSpacing: '0.06em', marginBottom: 1 }}>DELETED</div>
                            <div style={{ color: '#555555' }}>{t.deleted_at ? t.deleted_at.slice(0, 10) : ''}</div>
                          </div>
                        )}
                      </td>
                    )}
                    <td>
                      {isDeleted ? (
                        <button
                          onClick={() => handleRestore(t.id)}
                          disabled={restoring === t.id}
                          style={{
                            background: 'none', border: 'none', cursor: restoring === t.id ? 'not-allowed' : 'pointer',
                            fontSize: 10, color: '#888888', fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0,
                            opacity: restoring === t.id ? 0.5 : 1,
                          }}
                          onMouseEnter={e => { if (restoring !== t.id) e.currentTarget.style.color = '#00c853'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#888888'; }}
                        >
                          {restoring === t.id ? 'RESTORING...' : 'RESTORE'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => setEditTrade(t)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 10, color: '#888888', fontFamily: 'var(--font-mono)',
                              textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ff8c00')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#888888')}
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => { setDeleteError(''); setConfirmDelete(t); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 10, color: '#888888', fontFamily: 'var(--font-mono)',
                              textTransform: 'uppercase', letterSpacing: '0.06em', padding: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ff1744')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#888888')}
                          >
                            DEL
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editTrade && (
        <EditTradeModal
          trade={editTrade}
          onClose={() => setEditTrade(null)}
          onSaved={() => { setEditTrade(null); load(); }}
        />
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            width: 380, maxWidth: '95vw', fontFamily: 'var(--font-mono)',
          }}>
            <div className="section-header">CONFIRM DELETE</div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                Delete this trade? It will be soft-deleted and can be restored later.
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                <div><span style={{ color: 'var(--text-ticker)', fontWeight: 700 }}>{confirmDelete.ticker}</span> — {confirmDelete.name}</div>
                <div>
                  <span style={{ color: confirmDelete.action === 'BUY' ? 'var(--positive)' : 'var(--negative)' }}>{confirmDelete.action}</span>
                  {' '}{confirmDelete.shares} shares @ {formatMxn(confirmDelete.price_mxn)}
                </div>
                <div>{confirmDelete.date}</div>
              </div>
              <div style={{ fontSize: 11, color: '#888888', lineHeight: 1.5 }}>
                Cash balance and holdings will be recalculated automatically.
              </div>
              {deleteError && (
                <div style={{ fontSize: 11, color: 'var(--negative)', border: '1px solid var(--negative)', padding: '6px 10px' }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setConfirmDelete(null)} disabled={deleting}>CANCEL</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: 'var(--negative)', border: '1px solid var(--negative)',
                    color: '#000', padding: '4px 12px', fontSize: 11,
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'DELETING...' : 'DELETE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
