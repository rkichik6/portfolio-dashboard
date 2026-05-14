import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'portfolio.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      shares REAL NOT NULL,
      entry_price_mxn REAL NOT NULL,
      entry_date TEXT NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'core',
      conviction TEXT NOT NULL DEFAULT 'high',
      thesis TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      target_price_mxn REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#00d4ff'
    );

    CREATE TABLE IF NOT EXISTS watchlist_tags (
      watchlist_id INTEGER REFERENCES watchlist(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (watchlist_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS trade_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
      shares REAL NOT NULL,
      price_mxn REAL NOT NULL,
      total_mxn REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      realized_pnl_mxn REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker TEXT PRIMARY KEY,
      price_usd REAL NOT NULL,
      price_mxn REAL NOT NULL,
      change_pct REAL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fx_cache (
      pair TEXT PRIMARY KEY,
      rate REAL NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
}

function seedData() {
  const insertTag = db.prepare(
    `INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)`
  );
  const tags = [
    ['Waiting for Pullback', '#ffb800'],
    ['To Buy List', '#00ff9d'],
    ['Speculative', '#ff3d5a'],
    ['Earnings Play', '#a78bfa'],
    ['Long Term', '#00d4ff'],
    ['High Conviction', '#f97316'],
  ];
  for (const [name, color] of tags) {
    insertTag.run(name, color);
  }

  const insertHolding = db.prepare(`
    INSERT OR IGNORE INTO holdings (ticker, name, shares, entry_price_mxn, entry_date, bucket, conviction, thesis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const holdings = [
    ['PLTR', 'Palantir Technologies', 23, 2320, '2026-05-12', 'core', 'very-high', 'AI defense anchor. Q1 revenue up 85% YoY — fastest growth in company history.'],
    ['ALAB', 'Astera Labs', 8, 3400, '2026-05-12', 'core', 'high', 'AI data center connectivity chips. Q1 EPS beat by 238%. Revenue up 93% YoY.'],
    ['BBAI', 'BigBear.ai', 400, 72.43, '2026-05-12', 'swing', 'speculative', 'Speculative AI analytics play. High risk, high reward if AI defense contracts accelerate.'],
    ['SOUN', 'SoundHound AI', 150, 143.00, '2026-05-12', 'swing', 'high', 'Voice AI platform. Nvidia partnership adds credibility. Real revenue growth.'],
    ['QBTS', 'D-Wave Quantum', 50, 412.17, '2026-05-12', 'swing', 'speculative', 'Only dual-platform quantum company. Bookings up 1,994% YoY. Investor Day June 1.'],
    ['RGTI', 'Rigetti Computing', 25, 349.44, '2026-05-12', 'swing', 'speculative', 'Quantum pure play. Q1 revenue up 193% YoY. Small speculative bet.'],
  ];
  for (const h of holdings) {
    insertHolding.run(...h);
  }

  // Seed buy trade log entries for initial holdings
  const insertTrade = db.prepare(`
    INSERT OR IGNORE INTO trade_log (ticker, name, action, shares, price_mxn, total_mxn, date, notes)
    SELECT ?, ?, 'BUY', ?, ?, ?, ?, 'Initial portfolio position'
    WHERE NOT EXISTS (SELECT 1 FROM trade_log WHERE ticker = ? AND action = 'BUY')
  `);
  for (const h of holdings) {
    const [ticker, name, shares, price] = h as [string, string, number, number, ...unknown[]];
    insertTrade.run(ticker, name, shares, price, shares * price, '2026-05-12', ticker);
  }

  const insertWatchlist = db.prepare(`
    INSERT OR IGNORE INTO watchlist (ticker, name, target_price_mxn, notes)
    VALUES (?, ?, ?, ?)
  `);
  const watchlist = [
    ['TSM', 'TSMC', 7021, 'Backbone of AI chips. 72% market share. Waiting for pullback.'],
    ['IONQ', 'IonQ', 861, 'Best quantum fundamentals. Ran too hard post-earnings.'],
    ['CRWV', 'CoreWeave', 1893, 'Pure-play AI cloud. $100B backlog. Post-earnings drift.'],
    ['EMBJ', 'Embraer', 1000, 'Aerospace/defense opportunistic. Record backlog.'],
    ['CBRS', 'Cerebras', 2250, 'AI chip IPO. Wait for post-IPO pullback.'],
    ['QUBT', 'Quantum Computing Inc', 198, 'Photonics quantum play. Wait for pullback to $11.50 USD.'],
    ['MRVL', 'Marvell Technology', 2741, 'AI chips. Monitor for re-entry opportunity.'],
  ];
  for (const w of watchlist) {
    insertWatchlist.run(...w);
  }
}

export default getDb;
