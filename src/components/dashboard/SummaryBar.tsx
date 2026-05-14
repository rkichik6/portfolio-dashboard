'use client';
import { formatMxn } from '@/lib/calculations';

interface SummaryBarProps {
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: number;
  alerts: number;
}

export default function SummaryBar({ totalValue, totalPnl, totalPnlPct, positions, alerts }: SummaryBarProps) {
  const pnlPositive = totalPnl >= 0;

  const stats = [
    {
      label: 'Portfolio Value',
      value: formatMxn(totalValue),
      color: 'var(--accent)',
    },
    {
      label: 'Total P&L',
      value: `${pnlPositive ? '+' : ''}${formatMxn(totalPnl)}`,
      sub: `${pnlPositive ? '+' : ''}${totalPnlPct.toFixed(2)}%`,
      color: pnlPositive ? 'var(--accent2)' : 'var(--danger)',
    },
    {
      label: 'Positions',
      value: positions.toString(),
      color: 'var(--text)',
    },
    {
      label: 'Alerts',
      value: alerts.toString(),
      color: alerts > 0 ? 'var(--danger)' : 'var(--muted)',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: '1rem 1.25rem',
          borderRight: i < stats.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            {s.label}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '1.1rem', color: s.color, fontWeight: 700 }}>
            {s.value}
          </div>
          {s.sub && (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', color: s.color, marginTop: '0.15rem' }}>
              {s.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
