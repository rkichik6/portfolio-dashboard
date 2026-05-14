export interface MarketStatus {
  label: string;
  color: string;
}

// NYSE/NASDAQ market holidays 2025–2026
const MARKET_HOLIDAYS = new Set([
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day observed (Jul 4 = Sat)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
]);

export function getMarketStatus(): MarketStatus {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});

  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = parts.weekday; // 'Sun', 'Mon', …
  const totalMinutes = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);

  if (weekday === 'Sun' || weekday === 'Sat') return { label: 'MARKET CLOSED', color: '#ff1744' };
  if (MARKET_HOLIDAYS.has(dateStr))           return { label: 'MARKET CLOSED', color: '#ff1744' };

  // Times in America/Mexico_City per user spec
  if (totalMinutes >= 7 * 60 + 30 && totalMinutes < 9 * 60 + 30) return { label: 'PRE-MARKET',    color: '#ff8c00' };
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60)      return { label: 'MARKET OPEN',   color: '#00c853' };
  if (totalMinutes >= 16 * 60      && totalMinutes <= 19 * 60)     return { label: 'AFTER-HOURS',   color: '#3b82f6' };

  return { label: 'MARKET CLOSED', color: '#ff1744' };
}
