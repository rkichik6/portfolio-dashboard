const convictionConfig = {
  'very-high':   { label: 'V.HIGH', color: '#ff8c00' },
  'high':        { label: 'HIGH',   color: '#888888' },
  'medium':      { label: 'MED',    color: '#888888' },
  'speculative': { label: 'SPEC',   color: '#555555' },
};

interface ConvictionBadgeProps {
  conviction: string;
}

export default function ConvictionBadge({ conviction }: ConvictionBadgeProps) {
  const cfg = convictionConfig[conviction as keyof typeof convictionConfig]
    ?? { label: conviction.toUpperCase(), color: '#555555' };
  return (
    <span className="badge" style={{ color: cfg.color, borderColor: cfg.color }}>
      {cfg.label}
    </span>
  );
}
