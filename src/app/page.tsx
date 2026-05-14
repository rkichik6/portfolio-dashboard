'use client';
import { useEffect, useState, useCallback } from 'react';
import SummaryBar from '@/components/dashboard/SummaryBar';
import HoldingsTable, { Holding } from '@/components/dashboard/HoldingsTable';
import AlertsBanner, { Alert } from '@/components/dashboard/AlertsBanner';
import NewsPanel from '@/components/dashboard/NewsPanel';
import CashBalance from '@/components/dashboard/CashBalance';
import EditHoldingModal from '@/components/holdings/EditHoldingModal';
import SellModal from '@/components/holdings/SellModal';
import { getAlertLevel, getStopLossPrice } from '@/lib/calculations';

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashAmount, setCashAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [sellTarget, setSellTarget] = useState<Holding | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/holdings');
      const data = await res.json() as Holding[];
      setHoldings(Array.isArray(data) ? data : []);
    } catch {
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) || 300000);
    const handleRefresh = () => load();
    window.addEventListener('portfolio-refresh', handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('portfolio-refresh', handleRefresh);
    };
  }, [load]);

  const totalValue = holdings.reduce((s, h) => s + h.total_value_mxn, 0);
  const totalCost = holdings.reduce((s, h) => s + h.entry_price_mxn * h.shares, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const alerts: Alert[] = holdings
    .map(h => {
      const conviction = h.conviction as 'very-high' | 'high' | 'medium' | 'speculative';
      const stopPrice = getStopLossPrice(h.entry_price_mxn, conviction);
      const dist = h.current_price_mxn > 0
        ? ((h.current_price_mxn - stopPrice) / h.current_price_mxn) * 100
        : 100;
      const level = getAlertLevel(dist);
      if (level === 'none') return null;
      return {
        ticker: h.ticker,
        level,
        message: level === 'danger'
          ? `Stop-loss breach imminent — ${dist.toFixed(1)}% above stop`
          : `Approaching stop-loss — ${dist.toFixed(1)}% away`,
      } as Alert;
    })
    .filter(Boolean) as Alert[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <SummaryBar
        totalValue={totalValue}
        totalPnl={totalPnl}
        totalPnlPct={totalPnlPct}
        positions={holdings.length}
        alerts={alerts.length}
        cashBalance={cashAmount}
      />

      {alerts.length > 0 && (
        <div style={{ padding: '0 1.5rem' }}>
          <AlertsBanner alerts={alerts} />
        </div>
      )}

      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <CashBalance onBalanceChange={setCashAmount} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Loading portfolio...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <HoldingsTable
              holdings={holdings}
              onEdit={setEditTarget}
              onSell={h => setSellTarget(h)}
            />
            <NewsPanel />
          </div>
        )}
      </div>

      {editTarget && (
        <EditHoldingModal
          holding={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
      {sellTarget && (
        <SellModal
          holding={sellTarget}
          onClose={() => setSellTarget(null)}
          onSold={() => { load(); }}
        />
      )}
    </div>
  );
}
