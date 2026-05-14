'use client';
import { useEffect, useRef, useState } from 'react';

interface SearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

interface TickerSearchProps {
  defaultValue?: string;
  onSelect: (ticker: string, name: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function TickerSearch({
  defaultValue = '',
  onSelect,
  onChange,
  placeholder = 'Search ticker...',
}: TickerSearchProps) {
  const [query, setQuery] = useState(defaultValue.toUpperCase());
  const [results, setResults] = useState<SearchResult[]>([]);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(!!defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchPrices(symbols: string[]) {
    if (symbols.length === 0) return;
    try {
      const res = await fetch(`/api/prices?tickers=${symbols.join(',')}`);
      const data = await res.json() as Record<string, { price_usd: number }>;
      const map: Record<string, number | null> = {};
      for (const sym of symbols) {
        const usd = data[sym]?.price_usd;
        map[sym] = usd && usd > 0 ? usd : null;
      }
      setPrices(map);
    } catch { /* stay at {} — all rows show "--" */ }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function handleChange(raw: string) {
    const val = raw.toUpperCase();
    setQuery(val);
    setSelected(false);
    onChange?.(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setResults([]);
      setPrices({});
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
        const data = await res.json() as { results: SearchResult[] };
        const list = data.results ?? [];
        setResults(list);
        setPrices({});
        setOpen(list.length > 0);
        if (list.length > 0) fetchPrices(list.map(r => r.displaySymbol));
      } catch {
        setResults([]);
        setPrices({});
        setOpen(false);
      }
    }, 300);
  }

  function handleSelect(r: SearchResult) {
    const ticker = r.displaySymbol;
    setQuery(ticker);
    setSelected(true);
    setOpen(false);
    setResults([]);
    onSelect(ticker, r.description);
    onChange?.(ticker);
  }

  const typeLabel = (type: string) =>
    type === 'ETP' ? 'ETF' : type === 'Common Stock' ? 'STOCK' : type.toUpperCase();

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="form-input"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          borderColor: selected ? '#ff8c00' : undefined,
        }}
        value={query}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 1,
          background: '#0d0d0d',
          border: '1px solid #222222',
          zIndex: 300,
          maxHeight: 216,
          overflowY: 'auto',
        }}>
          {results.map(r => (
            <div
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#111100')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff', flexShrink: 0, minWidth: 60, fontFamily: 'var(--font-mono)' }}>
                {r.displaySymbol}
              </span>
              <span style={{ fontSize: 12, color: '#e0e0e0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                {r.description}
              </span>
              <span style={{ fontSize: 11, color: '#888888', flexShrink: 0, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                {typeLabel(r.type)}
              </span>
              <span style={{ fontSize: 12, color: '#e0e0e0', flexShrink: 0, fontFamily: 'var(--font-mono)', minWidth: 56, textAlign: 'right' }}>
                {r.displaySymbol in prices
                  ? (prices[r.displaySymbol] != null ? `$${prices[r.displaySymbol]!.toFixed(2)}` : '--')
                  : '--'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
