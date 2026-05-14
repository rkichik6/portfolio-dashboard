'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Eye, History } from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/holdings', label: 'Holdings', icon: TrendingUp },
  { href: '/watchlist', label: 'Watchlist', icon: Eye },
  { href: '/trades', label: 'Trade Log', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)', width: 180, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 40, padding: '0 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          COMMAND CENTER
        </span>
      </div>
      <nav style={{ flex: 1 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0 12px',
                height: 36,
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                background: active ? 'var(--accent-bg)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: active ? 700 : 400,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'all 0.1s',
              }}
            >
              <Icon size={12} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        v1.0 · MAY 2026
      </div>
    </aside>
  );
}
