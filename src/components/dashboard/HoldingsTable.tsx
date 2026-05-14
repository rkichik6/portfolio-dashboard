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
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <span>HOLDINGS</span>
        <span style={{ color: 'var(--text-dim)' }}>[{holdings.length}]</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 20 }}></th>
              <th>Ticker</th>
              <th>Bucket</th>
              <th className="right">Shares</th>
              <th className="right">Entry</th>
              <th className="right">Current</th>
              <th className="right">Day %</th>
              <th className="right">P&L</th>
              <th className="right">Value</th>
              <th>Stop</th>
              <th>Conv</th>
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
                    <td style={{ width: 20, paddingRight: 0, color: 'var(--text-dim)' }}>
                      {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-ticker)', fontWeight: 700, fontSize: 13 }}>{h.ticker}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{h.name}</div>
                      {h.price_stale && <div style={{ fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase' }}>DELAYED</div>}
                    </td>
                    <td>
                      <span className="badge" style={{
                        color: h.bucket === 'core' ? 'var(--accent)' : 'var(--text-dim)',
                        borderColor: h.bucket === 'core' ? 'var(--accent)' : 'var(--text-dim)',
                      }}>
                        {h.bucket}
                      </span>
                    </td>
                    <td className="right">{h.shares}</td>
                    <td className="right">{formatMxn(h.entry_price_mxn)}</td>
                    <td className="right">{formatMxn(h.current_price_mxn)}</td>
                    <td className="right"><PriceChange value={h.change_pct} /></td>
                    <td className="right">
                      <div style={{ color: pnlPos ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                        {pnlPos ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: 10, color: pnlPos ? 'var(--positive)' : 'var(--negative)' }}>
                        {pnlPos ? '+' : ''}{formatMxn(h.pnl_mxn)}
                      </div>
                    </td>
                    <td className="right">{formatMxn(h.total_value_mxn)}</td>
                    <td>
                      <StopLossBar
                        entryPrice={h.entry_price_mxn}
                        currentPrice={h.current_price_mxn}
                        stopLossPrice={getStopLossPrice(h.entry_price_mxn, conviction)}
                      />
                    </td>
                    <td><ConvictionBadge conviction={h.conviction} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button className="btn" style={{ padding: '2px 5px' }} onClick={() => onEdit(h)} title="Edit">
                          <Edit2 size={9} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '2px 5px' }} onClick={() => onSell(h)} title="Sell">
                          <TrendingDown size={9} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={12} style={{ background: 'var(--surface2)', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
                          <div>
                            <div style={{ fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>THESIS</div>
                            <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{h.thesis ?? 'No thesis recorded.'}</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: 11 }}>
                            {[
                              { label: 'Entry Date', value: h.entry_date, color: 'var(--text)' },
                              { label: 'Stop Loss', value: formatMxn(h.stop_loss_price), color: 'var(--negative)' },
                              { label: 'Total Cost', value: formatMxn(h.entry_price_mxn * h.shares), color: 'var(--text)' },
                              { label: 'Current Value', value: formatMxn(h.total_value_mxn), color: 'var(--text)' },
                            ].map(item => (
                              <div key={item.label}>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{item.label}</div>
                                <div style={{ color: item.color, fontWeight: 600 }}>{item.value}</div>
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
