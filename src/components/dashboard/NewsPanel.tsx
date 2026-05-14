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
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'universe', label: 'Universe' },
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
    <div className="card" style={{ padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '0.75rem 1rem', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>News</span>
        </div>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: active === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: active === t.key ? 'var(--text)' : 'var(--text-dim)',
              fontSize: '0.8125rem',
              fontWeight: active === t.key ? 500 : 400,
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color 0.1s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '0.75rem 1rem', minHeight: 200 }}>
        {loading && (
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem' }}>
            Loading news…
          </div>
        )}
        {!loading && articles.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem' }}>
            No recent news available.
          </div>
        )}
        {!loading && articles.map((a, i) => (
          <div key={i} style={{ padding: '0.75rem 0', borderBottom: i < articles.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <span className="badge" style={{ color: 'var(--accent)', borderColor: 'rgba(59,130,246,0.3)', flexShrink: 0, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {a.ticker}
              </span>
              <div style={{ flex: 1 }}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text)', fontSize: '0.875rem', textDecoration: 'none', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}
                >
                  {a.headline}
                  <ExternalLink size={11} style={{ flexShrink: 0, marginTop: 3, color: 'var(--text-dim)' }} />
                </a>
                {a.summary && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.3rem', lineHeight: 1.5 }}>
                    {a.summary.slice(0, 150)}{a.summary.length > 150 ? '…' : ''}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                  {a.source} · {a.datetime ? format(new Date(a.datetime * 1000), 'MMM d, yyyy') : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
