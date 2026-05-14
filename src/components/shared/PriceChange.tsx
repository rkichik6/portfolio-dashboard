interface PriceChangeProps {
  value: number;
  suffix?: string;
  decimals?: number;
}

export default function PriceChange({ value, suffix = '%', decimals = 2 }: PriceChangeProps) {
  const positive = value >= 0;
  return (
    <span className="number" style={{ color: positive ? 'var(--accent2)' : 'var(--danger)', fontFamily: 'Space Mono, monospace' }}>
      {positive ? '+' : ''}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
