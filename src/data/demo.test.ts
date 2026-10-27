import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEMO_COPY,
  DEMO_STATE_URL,
  classifyDemo,
  isDemoStale,
  newTradeIds,
  parseDemo,
  type DemoState,
} from './demo.ts';

assert.equal(
  DEMO_STATE_URL,
  'https://raw.githubusercontent.com/sonny-oez/trading-welt/main/public/demo/state.json',
);
assert.equal(DEMO_COPY.missing, 'Demo startet gleich / noch keine Trades');
assert.equal(DEMO_COPY.paused, 'Simulation pausiert');
assert.equal(DEMO_COPY.virtual, 'VIRTUELL – kein echtes Geld');

const base = {
  schema: 1,
  mode: 'paper',
  status: 'running',
  updated_utc: '2026-10-27T12:00:00.000Z',
  start_equity: 100,
  equity: '103.4',
  cash: 40.2,
  realized_pnl: 2.1,
  unrealized_pnl: 1.3,
  fees_paid: 0.18,
  max_leverage: 10,
  coins: ['BTC', 'ETH', 'SOL'],
  positions: [
    {
      coin: 'BTC',
      side: 'long',
      size: 0.001,
      entry: 80000,
      mark: 81200,
      leverage: 5,
      stop: 78000,
      take_profit: 85000,
      unrealized_pnl: 1.2,
      opened_utc: '2026-10-27T11:00:00.000Z',
    },
    {
      coin: 'ETH',
      side: 'short',
      size: '0.02',
      entry: 3000,
      mark: 2950,
      leverage: 3,
      stop: null,
      take_profit: null,
      unrealized_pnl: 0.1,
      opened_utc: '2026-10-27T11:30:00.000Z',
    },
    { coin: '', side: 'long', size: 1, entry: 1, mark: 1, leverage: 1, unrealized_pnl: 0, opened_utc: 'nope' },
  ],
  trades: [
    {
      id: 'older',
      time_utc: '2026-10-27T11:00:00.000Z',
      coin: 'BTC',
      side: 'buy',
      action: 'open',
      price: 80000,
      size: 0.001,
      notional: 80,
      fee: 0.04,
      pnl: null,
      reason: 'Signal',
      bot: 'Ausführung',
    },
    {
      id: 'newer',
      time_utc: '2026-10-27T11:40:00.000Z',
      coin: 'ETH',
      side: 'sell',
      action: 'close',
      price: 2950,
      size: 0.01,
      notional: 29.5,
      fee: 0.02,
      pnl: 0.4,
      reason: 'Ziel',
      bot: 'Ausführung',
    },
    { id: 'bad', time_utc: 'not-a-date', coin: 'SOL', side: 'buy', action: 'open' },
  ],
  equity_curve: [
    { t: '2026-10-27T11:40:00.000Z', equity: 103.4 },
    { t: '2026-10-27T11:00:00.000Z', equity: 100 },
  ],
  note: 'Nur virtuell.',
};

const parsed = parseDemo(base);
assert.ok(parsed);
assert.equal(parsed.schema, 1);
assert.equal(parsed.mode, 'paper');
assert.equal(parsed.equity, 103.4);
assert.equal(parsed.positions.length, 2);
assert.equal(parsed.positions[1]?.stop, null);
assert.equal(parsed.positions[1]?.takeProfit, null);
assert.equal(parsed.positions[1]?.size, 0.02);
assert.deepEqual(
  parsed.trades.map((trade) => trade.id),
  ['newer', 'older'],
);
assert.equal(parsed.trades[1]?.pnl, null);
assert.deepEqual(
  parsed.equityCurve.map((point) => point.equity),
  [100, 103.4],
);
assert.equal(parsed.maxLeverage, 10);
assert.deepEqual(parsed.coins, ['BTC', 'ETH', 'SOL']);

assert.equal(parseDemo({ ...base, schema: 2 }), null);
assert.equal(parseDemo({ ...base, mode: 'live' }), null);
assert.equal(parseDemo({ ...base, status: 'halt' }), null);
assert.equal(parseDemo({ ...base, updated_utc: 'gestern' }), null);
assert.equal(parseDemo(null), null);

const stamp = Date.parse('2026-10-27T12:00:00.000Z');
assert.equal(isDemoStale(stamp, stamp + 30 * 60 * 1000), false);
assert.equal(isDemoStale(stamp, stamp + 29 * 60 * 1000), false);
assert.equal(isDemoStale(stamp, stamp + 30 * 60 * 1000 + 1), true);

assert.deepEqual(newTradeIds(null, [{ id: 'a' }]), []);
assert.deepEqual(newTradeIds(new Set(['a']), [{ id: 'a' }, { id: 'b' }]), ['b']);

function feed(state: DemoState | null, phase: 'loading' | 'missing' | 'ready', stale: boolean) {
  return { phase, state, stale };
}

assert.equal(classifyDemo(feed(null, 'loading', false)).kind, 'loading');
assert.equal(classifyDemo(feed(null, 'missing', false)).kind, 'missing');
assert.equal(classifyDemo(feed(parsed, 'ready', true)).kind, 'paused');
assert.equal(classifyDemo(feed({ ...parsed, status: 'paused' }, 'ready', false)).kind, 'paused');
if (classifyDemo(feed(parsed, 'ready', true)).kind === 'paused') {
  assert.equal(classifyDemo(feed(parsed, 'ready', true)).kind, 'paused');
}
const staleView = classifyDemo(feed(parsed, 'ready', true));
assert.equal(staleView.kind, 'paused');
if (staleView.kind === 'paused') assert.equal(staleView.reason, 'stale');
const pausedView = classifyDemo(feed({ ...parsed, status: 'paused' }, 'ready', false));
if (pausedView.kind === 'paused') assert.equal(pausedView.reason, 'status');
assert.equal(classifyDemo(feed({ ...parsed, status: 'stopped' }, 'ready', false)).kind, 'stopped');
assert.equal(
  classifyDemo(feed({ ...parsed, status: 'starting', trades: [], positions: [] }, 'ready', false)).kind,
  'starting',
);
assert.equal(classifyDemo(feed(parsed, 'ready', false)).kind, 'running');

const placeholder = parseDemo(JSON.parse(fs.readFileSync('public/demo/state.json', 'utf8')));
assert.ok(placeholder);
assert.equal(placeholder.status, 'starting');
assert.equal(placeholder.equity, 100);
assert.equal(placeholder.startEquity, 100);
assert.equal(placeholder.cash, 100);
assert.equal(placeholder.trades.length, 0);
assert.equal(placeholder.positions.length, 0);
assert.equal(placeholder.maxLeverage, 10);
assert.equal(classifyDemo(feed(placeholder, 'ready', false)).kind, 'starting');

console.log('demo ok');
