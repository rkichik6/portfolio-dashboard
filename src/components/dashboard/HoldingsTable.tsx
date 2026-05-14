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

type SortDir = 'asc' | 'desc';
type SortCol = 'ticker' | 'bucket' | 'shares' | 'entry_price_mxn' | 'current_price_mxn' | 'change_pct' | 'pnl_pct' | 'total_value_mxn' | 'stop_loss_price' | 'conviction';

const CONVICTION_RANK: Record<string, number> = { speculative: 0, medium: 1, high: 2, 'very-high': 3 };

function arrow(col: SortCol, sortCol: SortCol, sortDir: SortDir) {
  if (col !== sortCol) return null;
  return <span style={{ color: '#ff8c00', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

interface HoldingsTableProps {
  holdings: Holding[];
  onEdit: (h: Holding) => void;
  onSell: (h: Holding) => void;
}

export default function HoldingsTable({ holdings, onEdit, onSell }: HoldingsTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>('total_value_mxn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };

  const sorted = [...holdings].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    switch (sortCol) {
      case 'ticker':            va = a.ticker;                       vb = b.ticker;                       break;
      case 'bucket':            va = a.bucket;                       vb = b.bucket;                       break;
      case 'shares':            va = a.shares;                       vb = b.shares;                       break;
      case 'entry_price_mxn':  va = a.entry_price_mxn;              vb = b.entry_price_mxn;              break;
      case 'current_price_mxn':va = a.current_price_mxn;            vb = b.current_price_mxn;            break;
      case 'change_pct':       va = a.change_pct;                   vb = b.change_pct;                   break;
      case 'pnl_pct':          va = a.pnl_pct;                      vb = b.pnl_pct;                      break;
      case 'total_value_mxn':  va = a.total_value_mxn;              vb = b.total_value_mxn;              break;
      case 'stop_loss_price':  va = a.stop_loss_price;              vb = b.stop_loss_price;              break;
      case 'conviction':        va = CONVICTION_RANK[a.conviction] ?? 0; vb = CONVICTION_RANK[b.conviction] ?? 0; break;
      default:                  va = a.total_value_mxn;              vb = b.total_value_mxn;
    }
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sortDir === 'asc' ? cmp : -cmp;
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
              <th style={thStyle} onClick={() => handleSort('ticker')}>Ticker{arrow('ticker', sortCol, sortDir)}</th>
              <th style={thStyle} onClick={() => handleSort('bucket')}>Bucket{arrow('bucket', sortCol, sortDir)}</th>
              <th className="right" style={thStyle} onClick={() => handleSort('shares')}>Shares{arrow('shares', sortCol, sortDir)}</th>
              <th className="right" style={thStyle} onClick={() => handleSort('entry_price_mxn')}>Entry{arrow('entry_price_mxn', sortCol, sortDir)}</th>
              <th className="right" style={thStyle} onClick={() => handleSort('current_price_mxn')}>Current{arrow('current_price_mxn', sortCol, sortDir)}</th>
              <th className="right" style={thStyle} onClick={() => handleSort('change_pct')}>Day %{arrow('change_pct', sortCol, sortDir)}</th>
              <th className="right" style={thStyle} onClick={() => handleSort('pnl_pct')}>P&L{arrow('pnl_pct', sortCol, sortDir)}</th>
              <th className="right" style={thStyle} onClick={() => handleSort('total_value_mxn')}>Value{arrow('total_value_mxn', sortCol, sortDir)}</th>
              <th style={thStyle} onClick={() => handleSort('stop_loss_price')}>Stop{arrow('stop_loss_price', sortCol, sortDir)}</th>
              <th style={thStyle} onClick={() => handleSort('conviction')}>Conv{arrow('conviction', sortCol, sortDir)}</th>
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
