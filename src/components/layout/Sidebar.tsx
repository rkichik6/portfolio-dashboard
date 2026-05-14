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
    <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', width: 200, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 48, padding: '0 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Command Center</span>
      </div>
      <nav style={{ padding: '0.5rem 0', flex: 1 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.6rem 1rem',
                color: active ? 'var(--text)' : 'var(--text-dim)',
                background: active ? 'var(--surface2)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: active ? 500 : 400,
                transition: 'all 0.1s',
              }}
            >
              <Icon size={14} color={active ? 'var(--accent)' : 'var(--muted)'} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--muted)' }}>
        v1.0 · May 2026
      </div>
    </aside>
  );
}
