interface PriceChangeProps {
  value: number;
  suffix?: string;
  decimals?: number;
}

export default function PriceChange({ value, suffix = '%', decimals = 2 }: PriceChangeProps) {
  const positive = value >= 0;
  return (
    <span style={{ color: positive ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
      {positive ? '+' : ''}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
