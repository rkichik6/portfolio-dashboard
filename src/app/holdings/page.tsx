'use client';
import { useEffect, useState, useCallback } from 'react';
import HoldingsTable, { Holding } from '@/components/dashboard/HoldingsTable';
import BuyModal from '@/components/holdings/BuyModal';
import EditHoldingModal from '@/components/holdings/EditHoldingModal';
import SellModal from '@/components/holdings/SellModal';
import { usePortfolio } from '@/context/PortfolioContext';

export default function HoldingsPage() {
  const { activePortfolioId } = usePortfolio();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [sellInitialTicker, setSellInitialTicker] = useState<string | undefined>();

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

  useEffect(() => { load(); }, [load]);

  const totalValue = holdings.reduce((s, h) => s + h.total_value_mxn, 0);
  const totalCost = holdings.reduce((s, h) => s + h.entry_price_mxn * h.shares, 0);
  const totalPnl = totalValue - totalCost;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>HOLDINGS</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {holdings.length} POSITIONS &nbsp;·&nbsp; {totalPnl >= 0 ? '+' : ''}{(totalCost > 0 ? (totalPnl / totalCost) * 100 : 0).toFixed(2)}% TOTAL RETURN
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-buy" onClick={() => setShowBuy(true)}>BUY</button>
          <button className="btn btn-sell" onClick={() => { setSellInitialTicker(undefined); setShowSell(true); }}>SELL</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          LOADING...
        </div>
      ) : (
        <HoldingsTable
          holdings={holdings}
          onEdit={setEditTarget}
          onBuy={() => setShowBuy(true)}
          onSell={h => { setSellInitialTicker(h?.ticker); setShowSell(true); }}
          signals={{}}
          signalsLoading={false}
          signalsLastUpdated={null}
          onRefreshSignals={() => {}}
        />
      )}

      {editTarget && <EditHoldingModal holding={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
      {showBuy && (
        <BuyModal
          holdings={holdings}
          portfolioId={activePortfolioId}
          onClose={() => setShowBuy(false)}
          onSaved={load}
        />
      )}
      {showSell && holdings.length > 0 && (
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
