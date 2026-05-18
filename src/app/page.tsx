'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import SummaryBar from '@/components/dashboard/SummaryBar';
import HoldingsTable, { Holding } from '@/components/dashboard/HoldingsTable';
import AlertsBanner, { Alert } from '@/components/dashboard/AlertsBanner';
import NewsPanel from '@/components/dashboard/NewsPanel';
import CashBalance from '@/components/dashboard/CashBalance';
import PortfolioTreemap from '@/components/dashboard/PortfolioTreemap';
import DashboardWatchlist from '@/components/dashboard/DashboardWatchlist';
import EditHoldingModal from '@/components/holdings/EditHoldingModal';
import BuyModal from '@/components/holdings/BuyModal';
import SellModal from '@/components/holdings/SellModal';
import { getAlertLevel, getStopLossPrice } from '@/lib/calculations';
import { usePortfolio } from '@/context/PortfolioContext';
import type { Signal } from '@/app/api/signals/route';
import type { WatchlistItem } from '@/components/watchlist/WatchlistCard';

function getMexicoTime(): { weekday: string; totalMinutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date()).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    weekday: parts.weekday,
    totalMinutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
  };
}

function isSignalRefreshTime(): boolean {
  const { weekday, totalMinutes } = getMexicoTime();
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const marketHours = totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60;
  const preMarket830 = totalMinutes >= 8 * 60 + 30 && totalMinutes < 8 * 60 + 45;
  return marketHours || preMarket830;
}

export default function DashboardPage() {
  const { activePortfolioId } = usePortfolio();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashAmount, setCashAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [sellInitialTicker, setSellInitialTicker] = useState<string | undefined>();

  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsLastUpdated, setSignalsLastUpdated] = useState<Date | null>(null);
  const signalsGeneratingRef = useRef(false);
  const signalsInitRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/holdings?portfolio_id=${activePortfolioId}`);
      const data = await res.json() as Holding[];
      setHoldings(Array.isArray(data) ? data : []);
    } catch {
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId]);

  // Reset state when portfolio changes
  useEffect(() => {
    setHoldings([]);
    setSignals({});
    signalsInitRef.current = false;
    signalsGeneratingRef.current = false;
    setLoading(true);
  }, [activePortfolioId]);

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

  // Core signal generation function — always uses current closure values
  const runSignalGeneration = useCallback(async (forceAll: boolean) => {
    if (signalsGeneratingRef.current) return;
    signalsGeneratingRef.current = true;
    setSignalsLoading(true);

    try {
      const [wRes, sigRes] = await Promise.all([
        fetch(`/api/watchlist?portfolio_id=${activePortfolioId}`).then(r => r.json()).catch(() => []),
        fetch(`/api/signals?portfolio_id=${activePortfolioId}`).then(r => r.json()).catch(() => ({})),
      ]);

      const existingSignals: Record<string, Signal> = sigRes;
      const watchlistItems: WatchlistItem[] = Array.isArray(wRes) ? wRes : [];

      const holdingsToSend = forceAll
        ? holdings
        : holdings.filter(h => !existingSignals[h.ticker]);
      const watchlistToSend = forceAll
        ? watchlistItems
        : watchlistItems.filter(w => !existingSignals[w.ticker]);

      if (!forceAll && holdingsToSend.length === 0 && watchlistToSend.length === 0) {
        setSignals(existingSignals);
        return;
      }

      const res = await fetch('/api/generate-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: holdingsToSend.map(h => ({
            ticker: h.ticker,
            name: h.name,
            bucket: h.bucket,
            entry_price_mxn: h.entry_price_mxn,
            current_price_mxn: h.current_price_mxn,
            pnl_pct: h.pnl_pct,
            change_pct: h.change_pct,
            stop_loss_price: h.stop_loss_price,
            conviction: h.conviction,
            type: 'holding',
          })),
          watchlist: watchlistToSend.map(w => ({
            ticker: w.ticker,
            name: w.name,
            current_price_mxn: w.current_price_mxn,
            target_price_mxn: w.target_price_mxn,
            gap_pct: w.gap_pct,
            type: 'watchlist',
          })),
          portfolio_id: activePortfolioId,
          portfolio_total_mxn: totalValue,
          portfolio_cash_mxn: cashAmount,
          force_all: forceAll,
        }),
      });

      const data = await res.json() as { signals?: Record<string, Signal> };
      if (data.signals) {
        setSignals(data.signals);
        setSignalsLastUpdated(new Date());
      }
    } catch (err) {
      console.error('[signals] generation error:', err);
    } finally {
      signalsGeneratingRef.current = false;
      setSignalsLoading(false);
    }
  }, [holdings, totalValue, cashAmount, activePortfolioId]);

  // Initialize signals once after holdings first load
  useEffect(() => {
    if (holdings.length === 0 || signalsInitRef.current) return;
    signalsInitRef.current = true;
    runSignalGeneration(false);
  }, [holdings, runSignalGeneration]);

  // Auto-refresh signals every 60 min during market hours / 8:30 AM CT
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSignalRefreshTime()) return;
      if (signalsGeneratingRef.current) return;
      const elapsed = signalsLastUpdated ? Date.now() - signalsLastUpdated.getTime() : Infinity;
      if (elapsed > 60 * 60 * 1000) runSignalGeneration(true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [signalsLastUpdated, runSignalGeneration]);

  const handleRefreshSignals = useCallback(() => {
    runSignalGeneration(true);
  }, [runSignalGeneration]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SummaryBar
        positionsValue={totalValue}
        cashBalance={cashAmount}
        totalPnl={totalPnl}
        totalPnlPct={totalPnlPct}
        positions={holdings.length}
        alerts={alerts.length}
      />

      {alerts.length > 0 && (
        <div style={{ padding: '0 16px', marginTop: 16 }}>
          <AlertsBanner alerts={alerts} />
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CashBalance portfolioId={activePortfolioId} onBalanceChange={setCashAmount} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            LOADING PORTFOLIO...
          </div>
        ) : (
          <>
            <PortfolioTreemap holdings={holdings} />
            <HoldingsTable
              holdings={holdings}
              onEdit={setEditTarget}
              onBuy={() => setShowBuy(true)}
              onSell={h => { setSellInitialTicker(h?.ticker); setShowSell(true); }}
              signals={signals}
              signalsLoading={signalsLoading}
              signalsLastUpdated={signalsLastUpdated}
              onRefreshSignals={handleRefreshSignals}
            />
            <DashboardWatchlist portfolioId={activePortfolioId} signals={signals} />
            <NewsPanel />
          </>
        )}
      </div>

      {editTarget && (
        <EditHoldingModal
          holding={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
      {showBuy && (
        <BuyModal
          holdings={holdings}
          portfolioId={activePortfolioId}
          onClose={() => setShowBuy(false)}
          onSaved={load}
        />
      )}
      {showSell && (
        <SellModal
          holdings={holdings}
          portfolioId={activePortfolioId}
          initialTicker={sellInitialTicker}
          onClose={() => { setShowSell(false); setSellInitialTicker(undefined); }}
          onSold={() => { load(); setShowSell(false); setSellInitialTicker(undefined); }}
        />
      )}
    </div>
  );
}
