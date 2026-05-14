import { fetchCompanyNews, FinnhubNewsItem } from './finnhub';
import { format, subDays } from 'date-fns';

export interface NewsArticle {
  ticker: string;
  headline: string;
  summary: string;
  url: string;
  datetime: number;
  source: string;
  category: 'portfolio' | 'watchlist' | 'universe';
}

const newsCache = new Map<string, { articles: NewsArticle[]; fetchedAt: number }>();
const NEWS_TTL_MS = 30 * 60 * 1000;

export async function getNewsForTickers(
  tickers: string[],
  category: NewsArticle['category']
): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  for (const ticker of tickers) {
    const cacheKey = `${ticker}-${today}`;
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < NEWS_TTL_MS) {
      articles.push(...cached.articles);
      continue;
    }

    const raw: FinnhubNewsItem[] = await fetchCompanyNews(ticker, weekAgo, today);
    const mapped: NewsArticle[] = raw.slice(0, 3).map(item => ({
      ticker,
      headline: item.headline,
      summary: item.summary,
      url: item.url,
      datetime: item.datetime,
      source: item.source,
      category,
    }));

    newsCache.set(cacheKey, { articles: mapped, fetchedAt: Date.now() });
    articles.push(...mapped);
  }

  return articles.sort((a, b) => b.datetime - a.datetime);
}
