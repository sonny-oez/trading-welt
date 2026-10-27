export const DEMO_STATE_URL =
  'https://raw.githubusercontent.com/sonny-oez/trading-welt/main/public/demo/state.json';

export const DEMO_STALE_MS = 30 * 60 * 1000;

export const DEMO_COPY = {
  virtual: 'VIRTUELL – kein echtes Geld',
  missing: 'Demo startet gleich / noch keine Trades',
  paused: 'Simulation pausiert',
  stopped: 'Simulation gestoppt',
  loading: 'Demo wird geladen…',
} as const;

export type DemoStatus = 'starting' | 'running' | 'paused' | 'stopped';

export interface DemoPosition {
  coin: string;
  side: 'long' | 'short';
  size: number;
  entry: number;
  mark: number;
  leverage: number;
  stop: number | null;
  takeProfit: number | null;
  unrealizedPnl: number;
  margin: number | null;
  openedUtc: string;
}

export interface DemoTrade {
  id: string;
  timeUtc: string;
  coin: string;
  side: 'buy' | 'sell';
  action: 'open' | 'close';
  price: number;
  size: number;
  notional: number;
  fee: number;
  pnl: number | null;
  reason: string;
  bot: string;
}

export interface EquityPoint {
  t: string;
  equity: number;
}

export interface DemoState {
  schema: 1;
  mode: 'paper';
  status: DemoStatus;
  updatedUtc: string;
  updatedMs: number;
  startEquity: number;
  equity: number;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  feesPaid: number;
  maxLeverage: number;
  coins: string[];
  positions: DemoPosition[];
  trades: DemoTrade[];
  equityCurve: EquityPoint[];
  note: string;
}

export type DemoPhase = 'loading' | 'missing' | 'ready';

export interface DemoFeed {
  phase: DemoPhase;
  state: DemoState | null;
  stale: boolean;
}

export type DemoView =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'starting' }
  | { kind: 'paused'; reason: 'stale' | 'status' }
  | { kind: 'stopped' }
  | { kind: 'running' };

const STATUSES: readonly DemoStatus[] = ['starting', 'running', 'paused', 'stopped'];

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function optionalNum(value: unknown): number | null | undefined {
  if (value == null || value === '') return null;
  const parsed = num(value);
  return parsed == null ? undefined : parsed;
}

function timeMs(value: unknown): number | null {
  const iso = text(value);
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function parsePosition(item: unknown): DemoPosition | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const coin = text(row.coin);
  const side = row.side === 'long' || row.side === 'short' ? row.side : null;
  const size = num(row.size);
  const entry = num(row.entry);
  const mark = num(row.mark);
  const leverage = num(row.leverage);
  const stop = optionalNum(row.stop);
  const takeProfit = optionalNum(row.take_profit);
  const unrealizedPnl = num(row.unrealized_pnl);
  const margin = row.margin == null || row.margin === '' ? null : num(row.margin);
  const openedMs = timeMs(row.opened_utc);
  if (!coin || !side || size == null || entry == null || mark == null || leverage == null) return null;
  if (stop === undefined || takeProfit === undefined || unrealizedPnl == null || openedMs == null) return null;
  if (margin === undefined || (row.margin != null && row.margin !== '' && margin == null)) return null;
  return {
    coin,
    side,
    size,
    entry,
    mark,
    leverage,
    stop,
    takeProfit,
    unrealizedPnl,
    margin,
    openedUtc: text(row.opened_utc),
  };
}

function parseTrade(item: unknown): DemoTrade | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const id = text(row.id);
  const time = timeMs(row.time_utc);
  const coin = text(row.coin);
  const side = row.side === 'buy' || row.side === 'sell' ? row.side : null;
  const action = row.action === 'open' || row.action === 'close' ? row.action : null;
  const price = num(row.price);
  const size = num(row.size);
  const notional = num(row.notional);
  const fee = num(row.fee);
  const pnl = optionalNum(row.pnl);
  if (!id || time == null || !coin || !side || !action) return null;
  if (price == null || size == null || notional == null || fee == null || pnl === undefined) return null;
  return {
    id,
    timeUtc: text(row.time_utc),
    coin,
    side,
    action,
    price,
    size,
    notional,
    fee,
    pnl,
    reason: text(row.reason),
    bot: text(row.bot),
  };
}

function parseCurve(item: unknown): EquityPoint | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const ms = timeMs(row.t);
  const equity = num(row.equity);
  if (ms == null || equity == null) return null;
  return { t: text(row.t), equity };
}

export function parsePaperState(record: Record<string, unknown>): DemoState | null {
  if (!STATUSES.includes(record.status as DemoStatus)) return null;
  const updatedMs = timeMs(record.updated_utc);
  const startEquity = num(record.start_equity);
  const equity = num(record.equity);
  const cash = num(record.cash);
  const realizedPnl = num(record.realized_pnl);
  const unrealizedPnl = num(record.unrealized_pnl);
  const feesPaid = num(record.fees_paid);
  const maxLeverage = num(record.max_leverage);
  if (
    updatedMs == null ||
    startEquity == null ||
    equity == null ||
    cash == null ||
    realizedPnl == null ||
    unrealizedPnl == null ||
    feesPaid == null ||
    maxLeverage == null
  ) {
    return null;
  }
  if (!Array.isArray(record.coins) || !Array.isArray(record.positions) || !Array.isArray(record.trades)) {
    return null;
  }
  if (!Array.isArray(record.equity_curve)) return null;

  const coins = record.coins.map((coin) => text(coin)).filter(Boolean);
  const positions = record.positions.map(parsePosition).filter((row): row is DemoPosition => row != null);
  const trades = record.trades
    .map(parseTrade)
    .filter((row): row is DemoTrade => row != null)
    .sort((a, b) => {
      const delta = Date.parse(b.timeUtc) - Date.parse(a.timeUtc);
      if (delta !== 0) return delta;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  const equityCurve = record.equity_curve
    .map(parseCurve)
    .filter((row): row is EquityPoint => row != null)
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t));

  return {
    schema: 1,
    mode: 'paper',
    status: record.status as DemoStatus,
    updatedUtc: text(record.updated_utc),
    updatedMs,
    startEquity,
    equity,
    cash,
    realizedPnl,
    unrealizedPnl,
    feesPaid,
    maxLeverage,
    coins,
    positions,
    trades,
    equityCurve,
    note: text(record.label) || text(record.note),
  };
}

export function parseDemo(input: unknown): DemoState | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  if (record.schema !== 1 || record.mode !== 'paper') return null;
  return parsePaperState(record);
}

export function isDemoStale(updatedMs: number, now = Date.now()): boolean {
  return now - updatedMs > DEMO_STALE_MS;
}

export function newTradeIds(previous: ReadonlySet<string> | null, trades: Pick<DemoTrade, 'id'>[]): string[] {
  if (previous == null) return [];
  return trades.map((trade) => trade.id).filter((id) => !previous.has(id));
}

export function classifyDemo(feed: DemoFeed): DemoView {
  if (feed.phase === 'loading') return { kind: 'loading' };
  if (feed.phase === 'missing' || !feed.state) return { kind: 'missing' };
  if (feed.stale) return { kind: 'paused', reason: 'stale' };
  if (feed.state.status === 'paused') return { kind: 'paused', reason: 'status' };
  if (feed.state.status === 'stopped') return { kind: 'stopped' };
  if (feed.state.status === 'starting' && feed.state.trades.length === 0 && feed.state.positions.length === 0) {
    return { kind: 'starting' };
  }
  return { kind: 'running' };
}
