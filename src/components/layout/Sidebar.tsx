'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Eye, History, Activity } from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/holdings', label: 'Holdings', icon: TrendingUp },
  { href: '/watchlist', label: 'Watchlist', icon: Eye },
  { href: '/trades', label: 'Trade Log', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', width: 220, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={18} color="var(--accent)" />
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.8rem', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>RK Portfolio</span>
      </div>
      <nav style={{ padding: '0.75rem 0', flex: 1 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 1rem',
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                background: active ? 'var(--surface2)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none',
                fontFamily: 'Space Mono, monospace',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'Space Mono, monospace' }}>
        v1.0 · May 2026
      </div>
    </aside>
  );
}
