'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import HoldingsTable, { Holding } from '@/components/dashboard/HoldingsTable';
import AddHoldingModal from '@/components/holdings/AddHoldingModal';
import EditHoldingModal from '@/components/holdings/EditHoldingModal';
import SellModal from '@/components/holdings/SellModal';

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
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

  useEffect(() => { load(); }, [load]);

  const totalValue = holdings.reduce((s, h) => s + h.total_value_mxn, 0);
  const totalPnl = holdings.reduce((s, h) => s + h.pnl_mxn, 0);

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>HOLDINGS</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {holdings.length} POSITIONS &nbsp;·&nbsp; {totalPnl >= 0 ? '+' : ''}{(totalPnl / Math.max(1, totalValue - totalPnl) * 100).toFixed(2)}% TOTAL RETURN
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={10} /> ADD HOLDING
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          LOADING...
        </div>
      ) : (
        <HoldingsTable holdings={holdings} onEdit={setEditTarget} onSell={setSellTarget} />
      )}

      {showAdd && <AddHoldingModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {editTarget && <EditHoldingModal holding={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
      {sellTarget && <SellModal holding={sellTarget} onClose={() => setSellTarget(null)} onSold={load} />}
    </div>
  );
}
