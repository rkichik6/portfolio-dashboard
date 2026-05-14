'use client';
import { Trash2, ArrowRight } from 'lucide-react';
import { formatMxn } from '@/lib/calculations';

export interface WatchlistItem {
  id: number;
  ticker: string;
  name: string;
  target_price_mxn: number | null;
  current_price_mxn: number | null;
  gap_pct: number | null;
  notes: string | null;
  tags: { id: number; name: string; color: string }[];
}

interface WatchlistCardProps {
  item: WatchlistItem;
  onDelete: (id: number) => void;
  onMoveToHoldings: (item: WatchlistItem) => void;
}

export default function WatchlistCard({ item, onDelete, onMoveToHoldings }: WatchlistCardProps) {
  const gapPos = (item.gap_pct ?? 0) > 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: '0.875rem' }}>{item.ticker}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>{item.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button className="btn" style={{ padding: '0.2rem 0.4rem' }} onClick={() => onMoveToHoldings(item)} title="Move to Holdings">
            <ArrowRight size={11} />
          </button>
          <button className="btn btn-danger" style={{ padding: '0.2rem 0.4rem' }} onClick={() => onDelete(item.id)} title="Remove">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {item.current_price_mxn != null && (
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.15rem' }}>Current</div>
            <div className="number" style={{ fontSize: '0.82rem' }}>{formatMxn(item.current_price_mxn)}</div>
          </div>
        )}
        {item.target_price_mxn != null && (
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.15rem' }}>Target</div>
            <div className="number" style={{ fontSize: '0.82rem', color: 'var(--warning)' }}>{formatMxn(item.target_price_mxn)}</div>
          </div>
        )}
        {item.gap_pct != null && (
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.15rem' }}>Gap to Target</div>
            <div className="number" style={{ fontSize: '0.82rem', color: gapPos ? 'var(--accent2)' : 'var(--danger)' }}>
              {gapPos ? '+' : ''}{item.gap_pct.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {item.notes && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {item.notes}
        </div>
      )}

      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {item.tags.map(tag => (
            <span
              key={tag.id}
              className="badge"
              style={{ color: tag.color, borderColor: tag.color, fontSize: '0.6rem' }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
