const convictionConfig = {
  'very-high': { label: 'Very High', color: '#00ff9d' },
  'high': { label: 'High', color: '#00d4ff' },
  'medium': { label: 'Medium', color: '#ffb800' },
  'speculative': { label: 'Spec', color: '#ff3d5a' },
};

interface ConvictionBadgeProps {
  conviction: string;
}

export default function ConvictionBadge({ conviction }: ConvictionBadgeProps) {
  const cfg = convictionConfig[conviction as keyof typeof convictionConfig] ?? { label: conviction, color: '#4a6080' };
  return (
    <span className="badge" style={{ color: cfg.color, borderColor: cfg.color }}>
      {cfg.label}
    </span>
  );
}
