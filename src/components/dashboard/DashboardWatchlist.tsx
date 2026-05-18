'use client';
import { useEffect, useState, useRef } from 'react';
import { formatMxn } from '@/lib/calculations';
import type { WatchlistItem } from '@/components/watchlist/WatchlistCard';

interface Signal {
  ticker: string;
  signal_direction: 'BUY' | 'LEAN_BUY' | 'NEUTRAL' | 'LEAN_SELL' | 'SELL';
  signal_strength: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentiment_strength: number;
  reasoning: string;
  generated_at: string;
}

function sigColor(dir: Signal['signal_direction']): string {
  if (dir === 'BUY' || dir === 'LEAN_BUY') return '#00c853';
  if (dir === 'SELL' || dir === 'LEAN_SELL') return '#ff1744';
  return '#ff8c00';
}

function senColor(sent: Signal['sentiment']): string {
  if (sent === 'POSITIVE') return '#00c853';
  if (sent === 'NEGATIVE') return '#ff1744';
  return '#ff8c00';
}

function SignalBars({ signal }: { signal: Signal | undefined }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 6, left: Math.max(8, rect.left - 60) });
    }
    setHovered(true);
  }

  if (!signal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 8, color: '#888888', width: 16, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>SIG</span>
          <div style={{ width: 48, height: 4, background: '#1a1a1a' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 8, color: '#888888', width: 16, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>SEN</span>
          <div style={{ width: 48, height: 4, background: '#1a1a1a' }} />
        </div>
      </div>
    );
  }

  const sc = sigColor(signal.signal_direction);
  const snc = senColor(signal.sentiment);
  const sigW = Math.round((signal.signal_strength / 100) * 48);
  const senW = Math.round((signal.sentiment_strength / 100) * 48);

  return (
    <>
      <div
        ref={containerRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 3, cursor: 'default' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 8, color: '#888888', width: 16, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>SIG</span>
          <div style={{ width: 48, height: 4, background: '#1a1a1a', position: 'relative', flexShrink: 0 }}>
            <div style={{ width: sigW, height: '100%', background: sc }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 8, color: '#888888', width: 16, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>SEN</span>
          <div style={{ width: 48, height: 4, background: '#1a1a1a', position: 'relative', flexShrink: 0 }}>
            <div style={{ width: senW, height: '100%', background: snc }} />
          </div>
        </div>
      </div>

      {hovered && (
        <div style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          zIndex: 200,
          background: '#0d0d0d',
          border: '1px solid #222222',
          padding: '8px 10px',
          minWidth: 200,
          maxWidth: 260,
          pointerEvents: 'none',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ fontSize: 11, color: '#e0e0e0', marginBottom: 6, lineHeight: 1.5 }}>
            {signal.reasoning}
          </div>
          <div style={{ fontSize: 10, color: sc, marginBottom: 2 }}>
            {signal.signal_direction.replace('_', ' ')} · {signal.signal_strength}%
          </div>
          <div style={{ fontSize: 10, color: snc, marginBottom: 5 }}>
            {signal.sentiment} · {signal.sentiment_strength}%
          </div>
          <div style={{ fontSize: 9, color: '#888888' }}>
            {new Date(signal.generated_at).toLocaleString()}
          </div>
        </div>
      )}
    </>
  );
}

interface DashboardWatchlistProps {
  portfolioId: number;
  signals?: Record<string, Signal>;
}

export default function DashboardWatchlist({ portfolioId, signals = {} }: DashboardWatchlistProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/watchlist?portfolio_id=${portfolioId}`)
      .then(r => r.json())
      .then((data: WatchlistItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [portfolioId]);

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
              <th>Signal</th>
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
                  <td style={{ verticalAlign: 'middle' }}>
                    <SignalBars signal={signals[item.ticker]} />
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
