'use client';
import { useEffect, useState } from 'react';
import { formatMxn } from '@/lib/calculations';
import type { WatchlistItem } from '@/components/watchlist/WatchlistCard';

export default function DashboardWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => r.json())
      .then((data: WatchlistItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <span>WATCHLIST</span>
        <span style={{ color: 'var(--text-dim)' }}>[{items.length}]</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th className="right">Current</th>
              <th className="right">Target</th>
              <th className="right">Gap %</th>
              <th>Tags</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const gapPos = (item.gap_pct ?? 0) > 0;
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ color: 'var(--text-ticker)', fontWeight: 700, fontSize: 13 }}>{item.ticker}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{item.name}</div>
                  </td>
                  <td className="right">
                    {item.current_price_mxn != null ? formatMxn(item.current_price_mxn) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td className="right">
                    {item.target_price_mxn != null ? formatMxn(item.target_price_mxn) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td className="right">
                    {item.gap_pct != null ? (
                      <span style={{ color: gapPos ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                        {gapPos ? '+' : ''}{item.gap_pct.toFixed(1)}%
                      </span>
                    ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {item.tags.map(tag => (
                        <span key={tag.id} className="badge" style={{ color: tag.color, borderColor: tag.color, fontSize: 8 }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.notes ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
