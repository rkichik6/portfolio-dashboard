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

  const stats = [
    { label: 'Positions Value',  value: formatMxn(positionsValue), color: 'var(--text)' },
    { label: 'Cash Balance',     value: cashBalance > 0 ? formatMxn(cashBalance) : '—', color: cashBalance > 0 ? 'var(--positive)' : 'var(--text-dim)' },
    { label: 'Unrealized P&L',   value: `${pnlPositive ? '+' : ''}${formatMxn(totalPnl)}`, sub: `${pnlPositive ? '+' : ''}${totalPnlPct.toFixed(2)}%`, color: pnlPositive ? 'var(--positive)' : 'var(--negative)' },
    { label: 'Positions',        value: positions.toString(), color: 'var(--text)' },
    { label: 'Alerts',           value: alerts.toString(), color: alerts > 0 ? 'var(--negative)' : 'var(--text-dim)' },
  ];

  return (
    <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      {/* Section header */}
      <div className="section-header">TOTAL PORTFOLIO VALUE</div>

      {/* Grand total */}
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {formatMxn(grandTotal)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {formatMxn(positionsValue)} positions &nbsp;+&nbsp; {cashBalance > 0 ? formatMxn(cashBalance) : '$0.00 MXN'} cash
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '8px 16px',
            borderRight: i < stats.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: s.color }}>
              {s.value}
            </div>
            {s.sub && (
              <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
