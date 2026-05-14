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
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Holdings</h1>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {holdings.length} positions · {totalPnl >= 0 ? '+' : ''}{(totalPnl / Math.max(1, totalValue - totalPnl) * 100).toFixed(2)}% total return
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={13} /> Add Holding
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
          Loading…
        </div>
      ) : (
        <HoldingsTable
          holdings={holdings}
          onEdit={setEditTarget}
          onSell={setSellTarget}
        />
      )}

      {showAdd && <AddHoldingModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {editTarget && <EditHoldingModal holding={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
      {sellTarget && <SellModal holding={sellTarget} onClose={() => setSellTarget(null)} onSold={load} />}
    </div>
  );
}
