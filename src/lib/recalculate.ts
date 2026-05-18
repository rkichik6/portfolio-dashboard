import Database from 'better-sqlite3';

type Db = InstanceType<typeof Database>;

interface TradeForCalc {
  action: string;
  shares: number;
  price_mxn: number;
  name: string;
  date: string;
}

export function recalculateHolding(db: Db, ticker: string, portfolioId: number): void {
  const trades = db.prepare(`
    SELECT action, shares, price_mxn, name, date FROM trade_log
    WHERE ticker = ? AND portfolio_id = ? AND deleted = 0
    ORDER BY date ASC, created_at ASC
  `).all(ticker, portfolioId) as TradeForCalc[];

  let totalShares = 0;
  let totalCost = 0;

  for (const t of trades) {
    if (t.action === 'BUY') {
      totalShares += t.shares;
      totalCost += t.shares * t.price_mxn;
    } else {
      const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
      totalShares -= t.shares;
      totalCost -= t.shares * avgCost;
      if (totalShares < -0.0001) throw new Error('NEGATIVE_POSITION');
    }
  }

  if (totalShares <= 0.0001) {
    db.prepare('DELETE FROM holdings WHERE ticker = ? AND portfolio_id = ?').run(ticker, portfolioId);
    return;
  }

  const avgPrice = totalCost / totalShares;
  const existing = db.prepare('SELECT id FROM holdings WHERE ticker = ? AND portfolio_id = ?').get(ticker, portfolioId) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE holdings SET shares = ?, entry_price_mxn = ?, updated_at = datetime('now') WHERE ticker = ? AND portfolio_id = ?`
    ).run(totalShares, avgPrice, ticker, portfolioId);
  } else {
    const firstBuy = trades.find(t => t.action === 'BUY');
    db.prepare(`
      INSERT INTO holdings (portfolio_id, ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'core', 'high', null, datetime('now'))
    `).run(
      portfolioId,
      ticker,
      firstBuy?.name ?? ticker,
      totalShares,
      avgPrice,
      firstBuy?.date ?? new Date().toISOString().slice(0, 10)
    );
  }
}
