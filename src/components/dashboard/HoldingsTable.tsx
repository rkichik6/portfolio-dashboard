'use client';
import React, { useState } from 'react';
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
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Holdings</span>
        <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>{holdings.length}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th>Ticker</th>
              <th>Bucket</th>
              <th className="right">Shares</th>
              <th className="right">Entry</th>
              <th className="right">Current</th>
              <th className="right">Day %</th>
              <th className="right">P&L</th>
              <th className="right">Value</th>
              <th>Stop Loss</th>
              <th>Conviction</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const open = expanded.has(h.id);
              const pnlPos = h.pnl_pct >= 0;
              const conviction = h.conviction as 'very-high' | 'high' | 'medium' | 'speculative';
              return (
                <React.Fragment key={h.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggle(h.id)}>
                    <td style={{ width: 24, paddingRight: 0 }}>
                      {open ? <ChevronDown size={12} color="var(--text-dim)" /> : <ChevronRight size={12} color="var(--text-dim)" />}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: '0.82rem' }}>{h.ticker}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{h.name}</div>
                      {h.price_stale && <div style={{ fontSize: '0.65rem', color: 'var(--warning)' }}>Delayed</div>}
                    </td>
                    <td>
                      <span className="badge" style={{
                        color: h.bucket === 'core' ? 'var(--accent)' : 'var(--warning)',
                        borderColor: h.bucket === 'core' ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)',
                      }}>
                        {h.bucket}
                      </span>
                    </td>
                    <td className="number right">{h.shares}</td>
                    <td className="number right" style={{ fontSize: '0.82rem' }}>{formatMxn(h.entry_price_mxn)}</td>
                    <td className="number right" style={{ fontSize: '0.82rem' }}>{formatMxn(h.current_price_mxn)}</td>
                    <td className="right"><PriceChange value={h.change_pct} /></td>
                    <td className="right">
                      <div style={{ fontFamily: 'var(--font-mono)', color: pnlPos ? 'var(--accent2)' : 'var(--danger)', fontSize: '0.82rem' }}>
                        {pnlPos ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: pnlPos ? 'var(--accent2)' : 'var(--danger)' }}>
                        {pnlPos ? '+' : ''}{formatMxn(h.pnl_mxn)}
                      </div>
                    </td>
                    <td className="number right" style={{ fontSize: '0.82rem' }}>{formatMxn(h.total_value_mxn)}</td>
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
                    <tr>
                      <td colSpan={12} style={{ background: 'var(--surface2)', padding: '0.75rem 1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Thesis</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.6 }}>{h.thesis ?? 'No thesis recorded.'}</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                              { label: 'Entry Date', value: h.entry_date, mono: true },
                              { label: 'Stop Loss', value: formatMxn(h.stop_loss_price), mono: true, danger: true },
                              { label: 'Total Cost', value: formatMxn(h.entry_price_mxn * h.shares), mono: true },
                              { label: 'Current Value', value: formatMxn(h.total_value_mxn), mono: true },
                            ].map(item => (
                              <div key={item.label}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>{item.label}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: item.danger ? 'var(--danger)' : 'var(--text)' }}>{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
