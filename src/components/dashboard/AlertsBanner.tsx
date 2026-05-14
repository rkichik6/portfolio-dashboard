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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 1rem',
            background: alert.level === 'danger' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${alert.level === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
            color: alert.level === 'danger' ? 'var(--danger)' : 'var(--warning)',
          }}
        >
          {alert.level === 'danger'
            ? <AlertCircle size={13} style={{ flexShrink: 0 }} />
            : <AlertTriangle size={13} style={{ flexShrink: 0 }} />
          }
          <span style={{ fontSize: '0.8125rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{alert.ticker}</span>
            {' — '}{alert.message}
          </span>
        </div>
      ))}
    </div>
  );
}
