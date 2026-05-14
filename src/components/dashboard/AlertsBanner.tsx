'use client';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export interface Alert {
  ticker: string;
  level: 'warning' | 'danger';
  message: string;
}

interface AlertsBannerProps {
  alerts: Alert[];
}

export default function AlertsBanner({ alerts }: AlertsBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 10px',
            height: 28,
            background: alert.level === 'danger' ? 'rgba(255,23,68,0.08)' : 'rgba(255,140,0,0.08)',
            borderTop: `1px solid ${alert.level === 'danger' ? 'var(--negative)' : 'var(--accent)'}`,
            borderLeft: `2px solid ${alert.level === 'danger' ? 'var(--negative)' : 'var(--accent)'}`,
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            color: alert.level === 'danger' ? 'var(--negative)' : 'var(--accent)',
          }}
        >
          {alert.level === 'danger'
            ? <AlertCircle size={11} style={{ flexShrink: 0 }} />
            : <AlertTriangle size={11} style={{ flexShrink: 0 }} />
          }
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span style={{ fontWeight: 700 }}>{alert.ticker}</span>
            {' — '}{alert.message}
          </span>
        </div>
      ))}
    </div>
  );
}
