'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Activity } from 'lucide-react';

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
      padding: '0 1.5rem',
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={15} color="var(--accent)" />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>RK Portfolio</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {fxRate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>USD/MXN</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text)', fontWeight: 700 }}>{fxRate.toFixed(2)}</span>
          </div>
        )}
        {lastUpdate && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)' }}>{lastUpdate}</span>
        )}
        <button onClick={handleRefresh} className="btn">
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </header>
  );
}
