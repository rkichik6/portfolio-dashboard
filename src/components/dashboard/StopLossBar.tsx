import { getStopBarColor } from '@/lib/calculations';

interface StopLossBarProps {
  entryPrice: number;
  currentPrice: number;
  stopLossPrice: number;
}

export default function StopLossBar({ entryPrice, currentPrice, stopLossPrice }: StopLossBarProps) {
  const distancePct = currentPrice > 0
    ? Math.max(0, ((currentPrice - stopLossPrice) / currentPrice) * 100)
    : 0;
  const barWidth = Math.min(100, distancePct * 2);
  const color = getStopBarColor(distancePct);

  return (
    <div style={{ minWidth: 80 }}>
      <div style={{ height: 3, background: 'var(--border2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${barWidth}%`,
          background: color,
          transition: 'width 0.3s',
        }} />
      </div>
      <div style={{ fontSize: 9, color, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {distancePct.toFixed(1)}% AWAY
      </div>
    </div>
  );
}
