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
    <div style={{ padding: '0 1.5rem', paddingTop: '1rem' }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 1rem',
            marginBottom: '0.4rem',
            background: alert.level === 'danger' ? 'rgba(255,61,90,0.1)' : 'rgba(255,184,0,0.1)',
            border: `1px solid ${alert.level === 'danger' ? 'var(--danger)' : 'var(--warning)'}`,
            color: alert.level === 'danger' ? 'var(--danger)' : 'var(--warning)',
          }}
        >
          {alert.level === 'danger'
            ? <AlertCircle size={14} />
            : <AlertTriangle size={14} />
          }
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.75rem' }}>
            <strong>{alert.ticker}</strong> — {alert.message}
          </span>
        </div>
      ))}
    </div>
  );
}
