'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function Header() {
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  async function fetchFx() {
    try {
      const res = await fetch('/api/fx');
      const data = await res.json() as { rate: number };
      setFxRate(data.rate);
      setLastUpdate(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // ignore
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchFx();
    window.dispatchEvent(new Event('portfolio-refresh'));
    setRefreshing(false);
  }

  useEffect(() => {
    fetchFx();
    const interval = setInterval(fetchFx, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0.65rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {fxRate && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span style={{ color: 'var(--muted)' }}>USD/MXN </span>
            <span style={{ color: 'var(--accent)' }}>{fxRate.toFixed(2)}</span>
          </div>
        )}
        {lastUpdate && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', color: 'var(--muted)' }}>
            Updated {lastUpdate}
          </div>
        )}
      </div>
      <button
        onClick={handleRefresh}
        className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        Refresh
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </header>
  );
}
