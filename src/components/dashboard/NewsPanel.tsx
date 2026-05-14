'use client';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface NewsArticle {
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: number;
  source: string;
  category: string;
}

type Tab = 'portfolio' | 'watchlist' | 'universe';
const tabs: { key: Tab; label: string }[] = [
  { key: 'portfolio', label: 'PORTFOLIO' },
  { key: 'watchlist', label: 'WATCHLIST' },
  { key: 'universe', label: 'UNIVERSE' },
];

export default function NewsPanel() {
  const [active, setActive] = useState<Tab>('portfolio');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchNews(tab: Tab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?category=${tab}`);
      const data = await res.json() as { articles: NewsArticle[] };
      setArticles(data.articles ?? []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNews(active); }, [active]);

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Section header + tabs */}
      <div style={{ display: 'flex', background: 'var(--accent-bg)', borderTop: '1px solid var(--accent)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '0 12px', height: 24, display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
          NEWS
        </div>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '0 12px',
              height: 24,
              background: active === t.key ? 'var(--accent)' : 'transparent',
              border: 'none',
              borderRight: '1px solid var(--border)',
              color: active === t.key ? '#000' : 'var(--text-dim)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Article list */}
      <div style={{ minHeight: 160 }}>
        {loading && (
          <div style={{ padding: 16, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
            FETCHING NEWS...
          </div>
        )}
        {!loading && articles.length === 0 && (
          <div style={{ padding: 16, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
            NO RECENT NEWS
          </div>
        )}
        {!loading && articles.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderBottom: i < articles.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>
              {a.ticker}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text)', fontSize: 12, textDecoration: 'none', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: 4 }}
              >
                <span>{a.headline}</span>
                <ExternalLink size={10} style={{ flexShrink: 0, marginTop: 3, color: 'var(--text-dim)' }} />
              </a>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {a.source} &nbsp;·&nbsp; {a.datetime ? format(new Date(a.datetime * 1000), 'MMM d, yyyy') : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
