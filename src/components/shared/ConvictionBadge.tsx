const convictionConfig = {
  'very-high': { label: 'Very High', color: 'var(--accent2)', border: 'rgba(34,197,94,0.3)' },
  'high':      { label: 'High',      color: 'var(--accent)',  border: 'rgba(59,130,246,0.3)' },
  'medium':    { label: 'Medium',    color: 'var(--warning)', border: 'rgba(245,158,11,0.3)' },
  'speculative':{ label: 'Spec',     color: 'var(--danger)',  border: 'rgba(239,68,68,0.3)'  },
};

interface ConvictionBadgeProps {
  conviction: string;
}

export default function ConvictionBadge({ conviction }: ConvictionBadgeProps) {
  const cfg = convictionConfig[conviction as keyof typeof convictionConfig]
    ?? { label: conviction, color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span className="badge" style={{ color: cfg.color, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}
