import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseDemo, type DemoState, type DemoTrade } from './demo.ts';
import { formatSignedMoney } from './format.ts';
import {
  DASHBOARD_COPY,
  MULTIPLE_SCALE,
  activityLine,
  agentOf,
  arrivalsSince,
  buildDashboard,
  downsample,
  equityChange,
  exitKind,
  formatMultiple,
  formatScaleMark,
  multiplePosition,
  rejectKind,
  signalSide,
  toastFor,
  toastsForArrivals,
} from './dashboard.ts';
import { hrefForView, readAppView } from './view.ts';

assert.equal(readAppView(''), 'welt');
assert.equal(readAppView('?live=wss://localhost/live'), 'welt');
assert.equal(readAppView('?view=dashboard'), 'dashboard');
assert.equal(readAppView('?view=welt'), 'welt');
assert.equal(readAppView('view=dashboard'), 'dashboard');

const back = hrefForView(
  'welt',
  'https://sonny-oez.github.io/trading-welt/?view=dashboard&live=wss%3A%2F%2Flocalhost%2Flive#stand',
);
const backUrl = new URL(back, 'https://sonny-oez.github.io');
assert.equal(backUrl.pathname, '/trading-welt/');
assert.equal(backUrl.searchParams.get('view'), null);
assert.equal(backUrl.searchParams.get('live'), 'wss://localhost/live');
assert.equal(backUrl.hash, '#stand');

const forward = hrefForView('dashboard', 'https://sonny-oez.github.io/trading-welt/?live=wss%3A%2F%2Flocalhost%2Flive');
const forwardUrl = new URL(forward, 'https://sonny-oez.github.io');
assert.equal(forwardUrl.searchParams.get('view'), 'dashboard');
assert.equal(forwardUrl.searchParams.get('live'), 'wss://localhost/live');

assert.equal(rejectKind('REJECT: cost-filter:target_0.5<3x_roundtrip_0.8'), 'cost-filter');
assert.equal(rejectKind('REJECT: session_window:no_entries_22:30-08:00_Berlin'), 'session-window');
assert.equal(rejectKind('REJECT: other-rule'), 'other');
assert.equal(rejectKind('EMA9/21 Long-Kreuz'), null);
assert.equal(exitKind('stop; EMA9/21'), 'stop');
assert.equal(exitKind('take_profit; EMA9/21'), 'target');
assert.equal(exitKind('gap; EMA9/21'), 'gap');
assert.equal(exitKind('manual'), 'other');
assert.equal(signalSide('EMA9/21 Long-Kreuz auf 5m'), 'long');
assert.equal(signalSide('EMA9/21 Short-Kreuz auf 5m'), 'short');

assert.deepEqual(downsample([1, 2, 3], 10), [1, 2, 3]);
assert.equal(downsample([0, 1, 2, 3, 4], 3).length, 3);
assert.equal(formatMultiple(0.8585).includes('0,86'), true);
assert.equal(formatScaleMark(1), '1×');
assert.equal(formatScaleMark(0.5), '0,5×');
assert.equal(multiplePosition(1), (1 - MULTIPLE_SCALE[0]) / (MULTIPLE_SCALE[3] - MULTIPLE_SCALE[0]));
assert.equal(multiplePosition(9), 1);
assert.equal(multiplePosition(0), 0);
assert.equal(multiplePosition(null), null);
assert.deepEqual(equityChange(85, 0), { delta: 85, pct: null, multiple: null });
assert.equal(DASHBOARD_COPY.paper, 'Papier');
assert.equal(DASHBOARD_COPY.goal, 'Ziel —');
assert.equal(DASHBOARD_COPY.kicker.includes('Live'), false);

function trade(patch: Partial<DemoTrade> & Pick<DemoTrade, 'id' | 'reason' | 'action'>): DemoTrade {
  return {
    timeUtc: '2026-11-01T08:00:00.000Z',
    coin: 'ETH',
    side: 'buy',
    price: 100,
    size: 1,
    notional: 100,
    fee: 0.1,
    pnl: null,
    bot: 'Execution Trader',
    ...patch,
  };
}

const state: DemoState = {
  schema: 1,
  mode: 'paper',
  status: 'running',
  updatedUtc: '2026-11-02T12:00:00.000Z',
  updatedMs: Date.parse('2026-11-02T12:00:00.000Z'),
  startEquity: 100,
  equity: 110,
  cash: 40,
  realizedPnl: 12,
  unrealizedPnl: -2,
  feesPaid: 1.5,
  maxLeverage: 10,
  coins: ['BTC', 'ETH'],
  positions: [
    {
      coin: 'BTC',
      side: 'long',
      size: 0.01,
      entry: 100,
      mark: 110,
      leverage: 2,
      stop: 90,
      takeProfit: 130,
      unrealizedPnl: 1.25,
      margin: 5,
      openedUtc: '2026-11-02T10:00:00.000Z',
    },
  ],
  trades: [
    trade({
      id: 'close-win',
      timeUtc: '2026-11-02T11:00:00.000Z',
      action: 'close',
      side: 'sell',
      coin: 'BTC',
      pnl: 4.5,
      reason: 'take_profit; EMA9/21 Long-Kreuz auf 5m + Trendfilter 1h-EMA50',
    }),
    trade({
      id: 'close-loss',
      timeUtc: '2026-11-02T10:00:00.000Z',
      action: 'close',
      side: 'buy',
      coin: 'SOL',
      pnl: -1.5,
      reason: 'stop; EMA9/21 Short-Kreuz auf 5m',
    }),
    trade({
      id: 'close-gap',
      timeUtc: '2026-11-02T09:00:00.000Z',
      action: 'close',
      coin: 'NEAR',
      pnl: 0,
      reason: 'gap; EMA9/21 Long-Kreuz',
    }),
    trade({
      id: 'open-1',
      timeUtc: '2026-11-02T08:00:00.000Z',
      action: 'open',
      coin: 'BTC',
      side: 'buy',
      reason: 'EMA9/21 Long-Kreuz auf 5m + Trendfilter 1h-EMA50 | Strategist→Risk Manager→Execution Trader',
    }),
    trade({
      id: 'rej-cost',
      timeUtc: '2026-11-02T07:00:00.000Z',
      action: 'open',
      coin: 'ETH',
      size: 0,
      price: 0,
      notional: 0,
      fee: 0,
      pnl: 0,
      bot: 'Risk Manager',
      reason: 'REJECT: cost-filter:target_0.5<3x_roundtrip_0.8',
    }),
    trade({
      id: 'rej-session',
      timeUtc: '2026-11-01T22:00:00.000Z',
      action: 'open',
      coin: 'SOL',
      size: 0,
      price: 0,
      notional: 0,
      fee: 0,
      pnl: 0,
      bot: 'Risk Manager',
      reason: 'REJECT: session_window:no_entries_22:30-08:00_Berlin',
    }),
  ],
  equityCurve: [
    { t: '2026-11-02T08:00:00.000Z', equity: 100 },
    { t: '2026-11-02T12:00:00.000Z', equity: 110 },
  ],
  note: 'VIRTUELL – kein echtes Geld',
};

const model = buildDashboard(state);
assert.equal(model.multiple, 1.1);
assert.equal(model.delta, 10);
assert.equal(model.deltaPct, 10);
assert.equal(model.curveIncludesStart, true);
assert.deepEqual(
  model.agents.map((agent) => agent.id),
  ['strategie', 'risiko', 'ausfuehrung', 'ausstieg'],
);
assert.equal(model.agents.every((agent) => agent.name !== 'Skeptiker'), true);

const strategie = model.agents[0];
const risiko = model.agents[1];
const ausfuehrung = model.agents[2];
const ausstieg = model.agents[3];
assert.ok(strategie);
assert.ok(risiko);
assert.ok(ausfuehrung);
assert.ok(ausstieg);
assert.equal(strategie.count, 1);
assert.equal(strategie.subtitle, 'EMA 9/21 · 1h-EMA50');
assert.equal(strategie.latest, 'BTC · Long-Kreuz');
assert.equal(strategie.score, DASHBOARD_COPY.scoreMissing);
assert.equal(strategie.pnl, null);
assert.equal(risiko.count, 2);
assert.equal(risiko.note, '1 Kostenfilter · 1 Sitzungsfenster');
assert.equal(risiko.latest, 'ETH · Kostenfilter');
assert.equal(risiko.pnl, null);
assert.equal(ausfuehrung.count, 1);
assert.equal(ausfuehrung.pill, null);
assert.equal(ausfuehrung.note.includes('BTC Long'), true);
assert.equal(ausfuehrung.note.includes('1,25'), true);
assert.equal(ausstieg.count, 3);
assert.equal(ausstieg.score, '1 Gewinn · 1 Verlust · 1 unverändert');
assert.equal(ausstieg.pnl, 3);
assert.equal(ausstieg.tone, 'up');
assert.equal(ausstieg.note, '1 Stop · 1 Ziel · 1 Kurslücke');
assert.equal(model.exitScore, ausstieg.score);
assert.equal(model.activity.length, state.trades.length);
assert.equal(model.activity[0]?.title, 'Ausstieg BTC · Ziel');
assert.equal(agentOf(state.trades[4]!), 'risiko');

const rejectToast = toastFor(state.trades[4]!);
assert.equal(rejectToast.kicker, 'Trading-Welt · Papier');
assert.equal(rejectToast.amount, null);
assert.equal(rejectToast.body.includes('virtuell'), true);
assert.equal(rejectToast.body.includes('Live'), false);
assert.equal(rejectToast.title.includes('abgelehnt'), true);

const winToast = toastFor(state.trades[0]!);
assert.equal(winToast.amount, formatSignedMoney(4.5));
assert.equal(winToast.tone, 'up');

assert.deepEqual(arrivalsSince(null, state.trades), []);
assert.deepEqual(
  arrivalsSince(new Set(['open-1']), state.trades).map((row) => row.id),
  state.trades.filter((row) => row.id !== 'open-1').map((row) => row.id),
);
const burst = toastsForArrivals(state.trades, 2);
assert.equal(burst.length, 2);
assert.equal(burst[1]?.body.includes('+4 weitere'), true);
assert.equal(burst[0]?.body.includes('weitere'), false);

const empty = buildDashboard({
  ...state,
  equity: 100,
  startEquity: 0,
  positions: [],
  trades: [],
  equityCurve: [],
});
assert.equal(empty.multiple, null);
assert.equal(empty.activity.length, 0);
assert.equal(empty.agents.every((agent) => agent.pnl === null), true);
assert.equal(empty.agents[3]?.score, DASHBOARD_COPY.scoreMissing);

const published = parseDemo(JSON.parse(fs.readFileSync('public/demo/state.json', 'utf8')));
assert.ok(published);
const liveBoard = buildDashboard(published);
const rawRejects = published.trades.filter((row) => row.reason.startsWith('REJECT:') || row.bot === 'Risk Manager');
const rawOpens = published.trades.filter(
  (row) => row.action === 'open' && !row.reason.startsWith('REJECT:') && row.bot !== 'Risk Manager',
);
const rawCloses = published.trades.filter(
  (row) => row.action === 'close' && row.bot !== 'Risk Manager' && !row.reason.startsWith('REJECT:'),
);
assert.equal(liveBoard.agents[1]?.count, rawRejects.length);
assert.equal(liveBoard.agents[2]?.count, rawOpens.length);
assert.equal(liveBoard.agents[3]?.count, rawCloses.length);
assert.equal(liveBoard.activity.length, published.trades.length);
assert.equal(liveBoard.multiple, published.equity / published.startEquity);
const closeWins = rawCloses.filter((row) => (row.pnl ?? 0) > 0).length;
const closeLosses = rawCloses.filter((row) => (row.pnl ?? 0) < 0).length;
assert.equal(liveBoard.exitScore.includes(`${closeWins} Gewinn`), true);
assert.equal(liveBoard.exitScore.includes(`${closeLosses} Verlust`), true);
assert.equal(JSON.stringify(DASHBOARD_COPY).includes('Live'), false);
assert.equal(activityLine(rawRejects[0] ?? state.trades[4]!).title.includes('Live'), false);

console.log('dashboard ok');
