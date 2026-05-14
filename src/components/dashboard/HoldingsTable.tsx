'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, TrendingDown } from 'lucide-react';
import ConvictionBadge from '@/components/shared/ConvictionBadge';
import PriceChange from '@/components/shared/PriceChange';
import StopLossBar from '@/components/dashboard/StopLossBar';
import { formatMxn, getStopLossPrice } from '@/lib/calculations';

export interface Holding {
  id: number;
  ticker: string;
  name: string;
  shares: number;
  entry_price_mxn: number;
  current_price_mxn: number;
  change_pct: number;
  pnl_pct: number;
  pnl_mxn: number;
  total_value_mxn: number;
  stop_loss_price: number;
  bucket: string;
  conviction: string;
  thesis: string | null;
  entry_date: string;
  price_stale?: boolean;
}

interface HoldingsTableProps {
  holdings: Holding[];
  onEdit: (h: Holding) => void;
  onSell: (h: Holding) => void;
}

export default function HoldingsTable({ holdings, onEdit, onSell }: HoldingsTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const bucketOrder = ['core', 'swing'];
  const sorted = [...holdings].sort((a, b) => {
    const bi = bucketOrder.indexOf(a.bucket) - bucketOrder.indexOf(b.bucket);
    return bi !== 0 ? bi : a.ticker.localeCompare(b.ticker);
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Holdings</span>
        <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>{holdings.length}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th>Ticker</th>
              <th>Bucket</th>
              <th>Shares</th>
              <th>Entry</th>
              <th>Current</th>
              <th>Day %</th>
              <th>P&L</th>
              <th>Value</th>
              <th>Stop Loss</th>
              <th>Conviction</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const open = expanded.has(h.id);
              const pnlPos = h.pnl_pct >= 0;
              const conviction = h.conviction as 'very-high' | 'high' | 'medium' | 'speculative';
              return (
                <>
                  <tr key={h.id} style={{ cursor: 'pointer' }} onClick={() => toggle(h.id)}>
                    <td style={{ width: 24, paddingRight: 0 }}>
                      {open ? <ChevronDown size={12} color="var(--text-dim)" /> : <ChevronRight size={12} color="var(--text-dim)" />}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>{h.ticker}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{h.name}</div>
                      {h.price_stale && <div style={{ fontSize: '0.65rem', color: 'var(--warning)' }}>Delayed</div>}
                    </td>
                    <td>
                      <span className="badge" style={{ color: h.bucket === 'core' ? 'var(--accent)' : 'var(--warning)', borderColor: h.bucket === 'core' ? 'var(--accent)' : 'var(--warning)' }}>
                        {h.bucket}
                      </span>
                    </td>
                    <td className="number">{h.shares}</td>
                    <td className="number" style={{ fontSize: '0.82rem' }}>{formatMxn(h.entry_price_mxn)}</td>
                    <td className="number" style={{ fontSize: '0.82rem' }}>{formatMxn(h.current_price_mxn)}</td>
                    <td><PriceChange value={h.change_pct} /></td>
                    <td>
                      <div style={{ fontFamily: 'Space Mono, monospace', color: pnlPos ? 'var(--accent2)' : 'var(--danger)', fontSize: '0.82rem' }}>
                        {pnlPos ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                      </div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem', color: pnlPos ? 'var(--accent2)' : 'var(--danger)' }}>
                        {pnlPos ? '+' : ''}{formatMxn(h.pnl_mxn)}
                      </div>
                    </td>
                    <td className="number" style={{ fontSize: '0.82rem' }}>{formatMxn(h.total_value_mxn)}</td>
                    <td>
                      <StopLossBar
                        entryPrice={h.entry_price_mxn}
                        currentPrice={h.current_price_mxn}
                        stopLossPrice={getStopLossPrice(h.entry_price_mxn, conviction)}
                      />
                    </td>
                    <td><ConvictionBadge conviction={h.conviction} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => onEdit(h)} title="Edit">
                          <Edit2 size={11} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => onSell(h)} title="Sell">
                          <TrendingDown size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr key={`${h.id}-expanded`}>
                      <td colSpan={12} style={{ background: 'var(--surface2)', padding: '0.75rem 1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Thesis</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>{h.thesis ?? 'No thesis recorded.'}</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Entry Date</div>
                              <div className="number" style={{ fontSize: '0.82rem' }}>{h.entry_date}</div>
                            </div>
                            <div>
                              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Stop Loss</div>
                              <div className="number" style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>{formatMxn(h.stop_loss_price)}</div>
                            </div>
                            <div>
                              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Cost</div>
                              <div className="number" style={{ fontSize: '0.82rem' }}>{formatMxn(h.entry_price_mxn * h.shares)}</div>
                            </div>
                            <div>
                              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Current Value</div>
                              <div className="number" style={{ fontSize: '0.82rem' }}>{formatMxn(h.total_value_mxn)}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
