'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowRight, Trash2 } from 'lucide-react';
import { WatchlistItem } from '@/components/watchlist/WatchlistCard';
import { formatMxn } from '@/lib/calculations';
import AddWatchlistModal from '@/components/watchlist/AddWatchlistModal';
import BuyModal from '@/components/holdings/BuyModal';
import TagManager from '@/components/watchlist/TagManager';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { usePortfolio } from '@/context/PortfolioContext';

interface Tag {
  id: number;
  name: string;
  color: string;
}

export default function WatchlistPage() {
  const { activePortfolioId } = usePortfolio();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [moveTarget, setMoveTarget] = useState<WatchlistItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<'ticker' | 'current_price_mxn' | 'target_price_mxn' | 'gap_pct' | 'tags'>('ticker');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(col: typeof sortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function wlArrow(col: typeof sortCol) {
    if (col !== sortCol) return null;
    return <span style={{ color: '#ff8c00', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const load = useCallback(async () => {
    try {
      const [wlRes, tagsRes] = await Promise.all([fetch(`/api/watchlist?portfolio_id=${activePortfolioId}`), fetch('/api/tags')]);
      const [wl, tags] = await Promise.all([wlRes.json() as Promise<WatchlistItem[]>, tagsRes.json() as Promise<Tag[]>]);
      setItems(Array.isArray(wl) ? wl : []);
      setAllTags(Array.isArray(tags) ? tags : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setDeleteTarget(null);
    load();
  }

  const base = activeTag ? items.filter(i => i.tags.some(t => t.id === activeTag)) : items;

  const filtered = [...base].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'ticker':           cmp = a.ticker.localeCompare(b.ticker); break;
      case 'current_price_mxn':
        if (a.current_price_mxn == null && b.current_price_mxn == null) cmp = 0;
        else if (a.current_price_mxn == null) cmp = 1;
        else if (b.current_price_mxn == null) cmp = -1;
        else cmp = a.current_price_mxn - b.current_price_mxn; break;
      case 'target_price_mxn':
        if (a.target_price_mxn == null && b.target_price_mxn == null) cmp = 0;
        else if (a.target_price_mxn == null) cmp = 1;
        else if (b.target_price_mxn == null) cmp = -1;
        else cmp = a.target_price_mxn - b.target_price_mxn; break;
      case 'gap_pct':
        if (a.gap_pct == null && b.gap_pct == null) cmp = 0;
        else if (a.gap_pct == null) cmp = 1;
        else if (b.gap_pct == null) cmp = -1;
        else cmp = a.gap_pct - b.gap_pct; break;
      case 'tags':
        cmp = (a.tags[0]?.name ?? '').localeCompare(b.tags[0]?.name ?? ''); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          WATCHLIST &nbsp;<span style={{ color: 'var(--text-dim)' }}>[{items.length}]</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={10} /> ADD
        </button>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            className="badge"
            onClick={() => setActiveTag(null)}
            style={{
              cursor: 'pointer', padding: '2px 8px',
              color: activeTag === null ? '#000' : 'var(--text-dim)',
              borderColor: 'var(--text-dim)',
              background: activeTag === null ? 'var(--text-dim)' : 'transparent',
            }}
          >ALL</button>
          {allTags.map(tag => (
            <button
              key={tag.id}
              className="badge"
              onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
              style={{
                cursor: 'pointer', padding: '2px 8px',
                color: activeTag === tag.id ? '#000' : tag.color,
                borderColor: tag.color,
                background: activeTag === tag.id ? tag.color : 'transparent',
              }}
            >{tag.name}</button>
          ))}
        </div>
      )}

      {/* Watchlist table */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="section-header" style={{ justifyContent: 'space-between' }}>
          <span>WATCHLIST</span>
          <span style={{ color: 'var(--text-dim)' }}>[{filtered.length}]</span>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LOADING...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('ticker')}>Ticker{wlArrow('ticker')}</th>
                  <th>Company</th>
                  <th className="right" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('current_price_mxn')}>Current{wlArrow('current_price_mxn')}</th>
                  <th className="right" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('target_price_mxn')}>Target{wlArrow('target_price_mxn')}</th>
                  <th className="right" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('gap_pct')}>Gap{wlArrow('gap_pct')}</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('tags')}>Tags{wlArrow('tags')}</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NO ITEMS</td></tr>
                )}
                {filtered.map(item => {
                  const gapPos = (item.gap_pct ?? 0) > 0;
                  return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-ticker)', fontWeight: 700, fontSize: 13 }}>{item.ticker}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{item.name}</td>
                      <td className="right">{item.current_price_mxn != null ? formatMxn(item.current_price_mxn) : '—'}</td>
                      <td className="right" style={{ color: 'var(--accent)' }}>{item.target_price_mxn != null ? formatMxn(item.target_price_mxn) : '—'}</td>
                      <td className="right" style={{ color: item.gap_pct != null ? (gapPos ? 'var(--positive)' : 'var(--negative)') : 'var(--text-dim)', fontWeight: item.gap_pct != null ? 600 : 400 }}>
                        {item.gap_pct != null ? `${gapPos ? '+' : ''}${item.gap_pct.toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {item.tags.map(tag => (
                            <span key={tag.id} className="badge" style={{ color: tag.color, borderColor: tag.color }}>{tag.name}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.notes ?? '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button className="btn" style={{ padding: '2px 5px' }} onClick={() => setMoveTarget(item)} title="Move to Holdings">
                            <ArrowRight size={9} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '2px 5px' }} onClick={() => setDeleteTarget(item.id)} title="Remove">
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TagManager />

      {showAdd && <AddWatchlistModal portfolioId={activePortfolioId} onClose={() => setShowAdd(false)} onSaved={load} />}
      {moveTarget && (
        <BuyModal
          holdings={[]}
          portfolioId={activePortfolioId}
          onClose={() => setMoveTarget(null)}
          onSaved={() => { setMoveTarget(null); load(); }}
          initial={{ ticker: moveTarget.ticker, name: moveTarget.name, price_mxn: moveTarget.current_price_mxn ?? moveTarget.target_price_mxn ?? undefined }}
        />
      )}
      {deleteTarget !== null && (
        <ConfirmDialog
          title="Remove from Watchlist"
          message="Remove this stock from your watchlist? This cannot be undone."
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Remove"
          danger
        />
      )}
    </div>
  );
}
