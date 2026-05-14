'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Treemap } from 'recharts';
import { formatMxn, formatNewsTime, getDistanceToStop, getStopLossPrice } from '@/lib/calculations';
import type { Holding } from '@/components/dashboard/HoldingsTable';
import { X } from 'lucide-react';

interface NewsArticle {
  ticker: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

function getCellColor(changePct: number): string {
  const t = Math.min(Math.abs(changePct) / 5, 1);
  if (changePct > 0.15) return `rgb(${lerp(17, 0, t)},${lerp(40, 200, t)},${lerp(20, 83, t)})`;
  if (changePct < -0.15) return `rgb(${lerp(40, 255, t)},${lerp(17, 23, t)},${lerp(20, 68, t)})`;
  return '#1a1a1a';
}

interface PortfolioTreemapProps {
  holdings: Holding[];
}

export default function PortfolioTreemap({ holdings }: PortfolioTreemapProps) {
  const [newsMap, setNewsMap] = useState<Record<string, NewsArticle[]>>({});
  const [tooltip, setTooltip] = useState<{ h: Holding; x: number; y: number } | null>(null);
  const [modal, setModal] = useState<Holding | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetch('/api/news?category=portfolio')
      .then(r => r.json())
      .then((data: { articles: NewsArticle[] }) => {
        const map: Record<string, NewsArticle[]> = {};
        for (const article of data.articles ?? []) {
          if (!map[article.ticker]) map[article.ticker] = [];
          if (map[article.ticker].length < 2) map[article.ticker].push(article);
        }
        setNewsMap(map);
      })
      .catch(() => {});
  }, []);

  const holdingByTicker = useMemo(
    () => Object.fromEntries(holdings.map(h => [h.ticker, h])),
    [holdings]
  );

  const treemapData = useMemo(
    () => holdings.filter(h => h.total_value_mxn > 0).map(h => ({ name: h.ticker, value: h.total_value_mxn })),
    [holdings]
  );

  const renderCell = useCallback((props: any) => {
    const { x = 0, y = 0, width = 0, height = 0, name = '', depth = 0 } = props;
    if (depth !== 1 || width < 4 || height < 4) return <g />;
    const h = holdingByTicker[name];
    if (!h) return <g />;

    const color = getCellColor(h.change_pct);
    const showTicker = width > 35 && height > 18;
    const showPct = width > 55 && height > 35;
    const fontSize = Math.max(9, Math.min(13, width / 5));

    return (
      <g
        onMouseEnter={(e) => {
          const rect = wrapperRef.current?.getBoundingClientRect();
          if (rect) setTooltip({ h, x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setTooltip(null)}
        onClick={() => { setTooltip(null); setModal(h); }}
        style={{ cursor: 'pointer' }}
      >
        <rect x={x} y={y} width={width} height={height} fill={color} stroke="#000000" strokeWidth={1} />
        {showTicker && (
          <text
            x={x + width / 2}
            y={y + height / 2 + (showPct ? -8 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight={700}
            fontFamily="IBM Plex Mono, monospace"
          >
            {name}
          </text>
        )}
        {showPct && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={Math.max(8, fontSize - 2)}
            fontFamily="IBM Plex Mono, monospace"
            opacity={0.85}
          >
            {h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%
          </text>
        )}
      </g>
    );
  }, [holdingByTicker]);

  if (holdings.length === 0) return null;

  const modalConviction = modal?.conviction as 'very-high' | 'high' | 'medium' | 'speculative' | undefined;
  const stopDist = modal && modalConviction
    ? getDistanceToStop(modal.current_price_mxn, getStopLossPrice(modal.entry_price_mxn, modalConviction))
    : 0;
  const modalNews = modal ? (newsMap[modal.ticker] ?? []) : [];

  const tooltipH = tooltip?.h;
  const tipNews = tooltipH ? (newsMap[tooltipH.ticker] ?? []) : [];
  const tipRight = tooltip && tooltip.x > containerWidth / 2;

  return (
    <>
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="section-header">PORTFOLIO MAP</div>
        <div ref={wrapperRef} style={{ position: 'relative', height: 200 }}>
          {containerWidth > 0 && (
            <Treemap
              width={containerWidth}
              height={200}
              data={treemapData}
              dataKey="value"
              isAnimationActive={false}
              content={renderCell}
            />
          )}
          {tooltip && tooltipH && (
            <div style={{
              position: 'absolute',
              left: tipRight ? tooltip.x - 196 : tooltip.x + 12,
              top: Math.min(tooltip.y + 12, 200 - 140),
              background: '#0d0d0d',
              border: '1px solid var(--accent)',
              padding: '8px 10px',
              zIndex: 100,
              minWidth: 184,
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{tooltipH.ticker}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6 }}>{tooltipH.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', fontSize: 10 }}>
                <span style={{ color: 'var(--text-dim)' }}>Entry</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatMxn(tooltipH.entry_price_mxn)}</span>
                <span style={{ color: 'var(--text-dim)' }}>Current</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatMxn(tooltipH.current_price_mxn)}</span>
                <span style={{ color: 'var(--text-dim)' }}>Day %</span>
                <span style={{ color: tooltipH.change_pct >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                  {tooltipH.change_pct >= 0 ? '+' : ''}{tooltipH.change_pct.toFixed(2)}%
                </span>
                <span style={{ color: 'var(--text-dim)' }}>P&L</span>
                <span style={{ color: tooltipH.pnl_pct >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                  {tooltipH.pnl_pct >= 0 ? '+' : ''}{tooltipH.pnl_pct.toFixed(2)}%
                </span>
              </div>
              {tipNews.length > 0 && (
                <div style={{ marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                  {tipNews.map((n, i) => (
                    <div key={i} style={{ marginTop: i > 0 ? 6 : 0 }}>
                      <div style={{ fontSize: 9, marginBottom: 2 }}>
                        <span style={{ color: '#888888' }}>{n.datetime ? formatNewsTime(n.datetime) : ''}</span>
                        {n.source && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>{n.source.toUpperCase()}</span>}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.4 }}>{n.headline}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.ticker} — {modal.name}</h3>
              <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={() => setModal(null)}>
                <X size={12} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px', marginBottom: 16 }}>
                {[
                  { label: 'Entry Price', value: formatMxn(modal.entry_price_mxn) },
                  { label: 'Current Price', value: formatMxn(modal.current_price_mxn) },
                  { label: 'Day Change', value: `${modal.change_pct >= 0 ? '+' : ''}${modal.change_pct.toFixed(2)}%`, color: modal.change_pct >= 0 ? 'var(--positive)' : 'var(--negative)' },
                  { label: 'P&L %', value: `${modal.pnl_pct >= 0 ? '+' : ''}${modal.pnl_pct.toFixed(2)}%`, color: modal.pnl_pct >= 0 ? 'var(--positive)' : 'var(--negative)' },
                  { label: 'P&L (MXN)', value: formatMxn(modal.pnl_mxn), color: modal.pnl_mxn >= 0 ? 'var(--positive)' : 'var(--negative)' },
                  { label: 'Dist. to Stop', value: `${stopDist.toFixed(1)}%`, color: stopDist < 5 ? 'var(--negative)' : stopDist < 10 ? 'var(--warning)' : 'var(--positive)' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{stat.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: stat.color ?? 'var(--text)' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              {modalNews.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>RECENT NEWS</div>
                  {modalNews.map((article, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < modalNews.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: 10, marginBottom: 4 }}>
                        <span style={{ color: '#888888' }}>{article.datetime ? formatNewsTime(article.datetime) : ''}</span>
                        {article.source && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>{article.source.toUpperCase()}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ color: 'var(--text)', fontSize: 11, lineHeight: 1.5 }}>{article.headline}</span>
                        {article.url && (
                          <button
                            onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: '0 2px' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--accent)')}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
