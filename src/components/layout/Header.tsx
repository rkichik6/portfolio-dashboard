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
    } catch { /* ignore */ }
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
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      height: 40,
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        RK PORTFOLIO
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {fxRate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>USD/MXN</span>
            <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{fxRate.toFixed(2)}</span>
          </div>
        )}
        {lastUpdate && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{lastUpdate}</span>
        )}
        <button onClick={handleRefresh} className="btn" style={{ padding: '3px 8px' }}>
          <RefreshCw size={10} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </header>
  );
}
