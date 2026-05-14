export type Conviction = 'very-high' | 'high' | 'medium' | 'speculative';
export type Bucket = 'core' | 'swing';

const STOP_LOSS_MAP: Record<Conviction, number> = {
  'very-high': 0.18,
  'high': 0.18,
  'medium': 0.12,
  'speculative': 0.30,
};

export function getStopLossPct(conviction: Conviction): number {
  return STOP_LOSS_MAP[conviction] ?? 0.18;
}

export function getStopLossPrice(entryPrice: number, conviction: Conviction): number {
  return entryPrice * (1 - getStopLossPct(conviction));
}

export function getPnlPct(entryPrice: number, currentPrice: number): number {
  if (entryPrice === 0) return 0;
  return ((currentPrice - entryPrice) / entryPrice) * 100;
}

export function getPnlMxn(entryPrice: number, currentPrice: number, shares: number): number {
  return (currentPrice - entryPrice) * shares;
}

export function getDistanceToStop(currentPrice: number, stopLossPrice: number): number {
  if (currentPrice === 0) return 0;
  return ((currentPrice - stopLossPrice) / currentPrice) * 100;
}

export function getAlertLevel(distanceToStop: number): 'none' | 'warning' | 'danger' {
  if (distanceToStop < 5) return 'danger';
  if (distanceToStop < 10) return 'warning';
  return 'none';
}

export function getStopBarColor(distancePct: number): string {
  if (distancePct < 5) return '#ff1744';
  if (distancePct < 10) return '#ff8c00';
  return '#00c853';
}

export function formatMxn(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getRealizedPnl(
  buyPrice: number,
  sellPrice: number,
  shares: number
): number {
  return (sellPrice - buyPrice) * shares;
}
