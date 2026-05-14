'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import WatchlistCard, { WatchlistItem } from '@/components/watchlist/WatchlistCard';
import AddWatchlistModal from '@/components/watchlist/AddWatchlistModal';
import AddHoldingModal from '@/components/holdings/AddHoldingModal';
import TagManager from '@/components/watchlist/TagManager';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface Tag {
  id: number;
  name: string;
  color: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [moveTarget, setMoveTarget] = useState<WatchlistItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [wlRes, tagsRes] = await Promise.all([
        fetch('/api/watchlist'),
        fetch('/api/tags'),
      ]);
      const [wl, tags] = await Promise.all([
        wlRes.json() as Promise<WatchlistItem[]>,
        tagsRes.json() as Promise<Tag[]>,
      ]);
      setItems(Array.isArray(wl) ? wl : []);
      setAllTags(Array.isArray(tags) ? tags : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleteTarget(null);
    load();
  }

  const filtered = activeTag
    ? items.filter(i => i.tags.some(t => t.id === activeTag))
    : items;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Watchlist</h1>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {items.length} stocks being monitored
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={13} /> Add to Watchlist
        </button>
      </div>

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            className="badge"
            onClick={() => setActiveTag(null)}
            style={{
              color: activeTag === null ? 'var(--bg)' : 'var(--text-dim)',
              borderColor: 'var(--muted)',
              background: activeTag === null ? 'var(--muted)' : 'transparent',
              cursor: 'pointer',
              padding: '0.25rem 0.6rem',
            }}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag.id}
              className="badge"
              onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
              style={{
                color: activeTag === tag.id ? 'var(--bg)' : tag.color,
                borderColor: tag.color,
                background: activeTag === tag.id ? tag.color : 'transparent',
                cursor: 'pointer',
                padding: '0.25rem 0.6rem',
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
          Loading...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {filtered.map(item => (
            <WatchlistCard
              key={item.id}
              item={item}
              onDelete={(id) => setDeleteTarget(id)}
              onMoveToHoldings={setMoveTarget}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              No watchlist items found.
            </div>
          )}
        </div>
      )}

      <TagManager />

      {showAdd && <AddWatchlistModal onClose={() => setShowAdd(false)} onSaved={load} />}

      {moveTarget && (
        <AddHoldingModal
          onClose={() => setMoveTarget(null)}
          onSaved={() => { setMoveTarget(null); load(); }}
          initial={{
            ticker: moveTarget.ticker,
            name: moveTarget.name,
            entry_price_mxn: moveTarget.current_price_mxn ?? moveTarget.target_price_mxn ?? undefined,
          }}
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
