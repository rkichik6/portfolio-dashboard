'use client';
import { formatMxn } from '@/lib/calculations';

interface SummaryBarProps {
  positionsValue: number;
  cashBalance: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: number;
  alerts: number;
}

export default function SummaryBar({
  positionsValue,
  cashBalance,
  totalPnl,
  totalPnlPct,
  positions,
  alerts,
}: SummaryBarProps) {
  const grandTotal = positionsValue + cashBalance;
  const pnlPositive = totalPnl >= 0;

  const breakdown = [
    {
      label: 'Positions Value',
      value: formatMxn(positionsValue),
      color: 'var(--accent)',
    },
    {
      label: 'Cash Balance',
      value: cashBalance > 0 ? formatMxn(cashBalance) : '—',
      color: cashBalance > 0 ? 'var(--accent2)' : 'var(--muted)',
    },
    {
      label: 'Unrealized P&L',
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
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      {/* Grand total headline */}
      <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
          Total Portfolio Value
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {formatMxn(grandTotal)}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
          {formatMxn(positionsValue)} positions &nbsp;+&nbsp; {cashBalance > 0 ? formatMxn(cashBalance) : '$0.00 MXN'} cash
        </div>
      </div>

      {/* Breakdown stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {breakdown.map((s, i) => (
          <div key={i} style={{ padding: '0.75rem 1.25rem', borderRight: i < breakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: s.color, fontWeight: 700 }}>
              {s.value}
            </div>
            {s.sub && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: s.color, marginTop: '0.1rem' }}>
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
