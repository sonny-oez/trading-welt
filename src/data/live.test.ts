import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  acceptLiveUrl,
  backoffMs,
  deskForEvent,
  liveOverride,
  mergeEvents,
  parseLiveConfig,
  parseLiveFrame,
  percentile50,
  pickDisplayed,
  shouldPauseHidden,
  socketIsDead,
  LIVE_HIDE_PAUSE_MS,
  type LiveEvent,
} from './live.ts';
import type { DemoState } from './demo.ts';

assert.equal(acceptLiveUrl('wss://desk.example/live'), 'wss://desk.example/live');
assert.equal(acceptLiveUrl('ws://localhost:8791/live'), 'ws://localhost:8791/live');
assert.equal(acceptLiveUrl('ws://127.0.0.1:8791/live'), 'ws://127.0.0.1:8791/live');
assert.equal(acceptLiveUrl('ws://10.0.0.8/live'), null);
assert.equal(acceptLiveUrl('http://localhost/live'), null);
assert.equal(acceptLiveUrl('wss://user:secret@desk.example/live'), null);
assert.equal(acceptLiveUrl(''), null);
assert.equal(acceptLiveUrl(null), null);

assert.deepEqual(parseLiveConfig({ schema: 1, ws_url: null }), { wsUrl: null });
assert.deepEqual(parseLiveConfig({ schema: 1, ws_url: 'wss://desk.example/live' }), {
  wsUrl: 'wss://desk.example/live',
});
assert.equal(parseLiveConfig({ schema: 2, ws_url: null }), null);
assert.deepEqual(parseLiveConfig({ schema: 1, ws_url: 'ws://evil/live' }), { wsUrl: null });

assert.equal(liveOverride('?live=wss://desk.example/live'), 'wss://desk.example/live');
assert.equal(liveOverride('?live=http://desk.example/live'), null);
assert.equal(liveOverride(''), null);

const state = {
  status: 'running',
  updated_utc: '2026-10-27T18:00:00.000Z',
  start_equity: 100,
  equity: '103.4',
  cash: 40,
  realized_pnl: 2,
  unrealized_pnl: 1.4,
  fees_paid: 0.2,
  max_leverage: 10,
  coins: ['BTC', 'ETH', 'SOL'],
  positions: [
    {
      coin: 'BTC',
      side: 'long',
      size: 0.001,
      entry: 80000,
      mark: 81200,
      leverage: 4,
      stop: 78000,
      take_profit: null,
      unrealized_pnl: 1.2,
      margin: 20,
      opened_utc: '2026-10-27T17:00:00.000Z',
    },
  ],
  trades: [],
  equity_curve: [{ t: '2026-10-27T18:00:00.000Z', equity: 103.4 }],
  label: 'Papier',
};

const hello = parseLiveFrame({
  type: 'hello',
  schema: 1,
  mode: 'paper',
  server_ts_ms: 1000,
  state,
  recent: [
    {
      type: 'event',
      seq: 2,
      ts_ms: 2000,
      src_ts_ms: 1900,
      kind: 'open',
      coin: 'BTC',
      text: 'Long eröffnet',
      data: { ok: true },
    },
    { seq: 1, ts_ms: 1500, src_ts_ms: 1400, kind: 'nope', text: 'weg' },
    { seq: 3, ts_ms: 2100, src_ts_ms: 2050, kind: 'info', coin: null, text: 'bereit' },
  ],
});
assert.equal(hello?.type, 'hello');
if (hello?.type === 'hello') {
  assert.equal(hello.state.equity, 103.4);
  assert.equal(hello.state.note, 'Papier');
  assert.equal(hello.state.positions[0]?.margin, 20);
  assert.equal(hello.recent.length, 2);
  assert.equal(hello.recent[0]?.kind, 'open');
}

assert.equal(parseLiveFrame({ type: 'hello', schema: 2, mode: 'paper', server_ts_ms: 1, state }), null);
assert.equal(parseLiveFrame({ type: 'hello', schema: 1, mode: 'live', server_ts_ms: 1, state }), null);
assert.equal(parseLiveFrame('nope'), null);
assert.deepEqual(parseLiveFrame({ type: 'future', n: 1 }), { type: 'ignore' });

const beat = parseLiveFrame({ type: 'heartbeat', seq: '4', ts_ms: 3000 });
assert.deepEqual(beat, { type: 'heartbeat', seq: 4, tsMs: 3000 });
assert.equal(parseLiveFrame({ type: 'heartbeat', seq: 1 }), null);

const pong = parseLiveFrame({ type: 'pong', client_ts_ms: 10, server_ts_ms: 12 });
assert.deepEqual(pong, { type: 'pong', clientTsMs: 10, serverTsMs: 12 });

const opened = parseLiveFrame({
  type: 'event',
  seq: 8,
  ts_ms: 4000,
  src_ts_ms: 3990,
  kind: 'skeptic',
  coin: 'ETH',
  text: 'Zu früh',
});
assert.equal(opened?.type, 'event');

assert.equal(backoffMs(0, 0), 1000);
assert.equal(backoffMs(0, 1), 1000);
assert.equal(backoffMs(1, 0), 1000);
assert.equal(backoffMs(1, 1), 2000);
assert.equal(backoffMs(2, 0.5), 2500);
assert.equal(backoffMs(10, 0), 1000);
assert.equal(backoffMs(10, 1), 30000);
assert.ok(backoffMs(4, 0.25) >= 1000 && backoffMs(4, 0.25) <= 16000);

assert.equal(socketIsDead(0, 5000, false), false);
assert.equal(socketIsDead(0, 5001, false), true);
assert.equal(socketIsDead(0, 60_000, true), false);
assert.equal(shouldPauseHidden(LIVE_HIDE_PAUSE_MS), false);
assert.equal(shouldPauseHidden(LIVE_HIDE_PAUSE_MS + 1), true);

assert.equal(percentile50([]), null);
assert.equal(percentile50([4, 1, 3]), 3);
assert.equal(percentile50([1, 2, 3, 4]), 2.5);

const older: LiveEvent = { seq: 1, tsMs: 1, srcTsMs: 100, kind: 'info', coin: null, text: 'alt', data: null };
const newer: LiveEvent = { seq: 2, tsMs: 2, srcTsMs: 300, kind: 'reject', coin: 'SOL', text: 'nein', data: null };
const merged = mergeEvents([older], [newer, { ...older, text: 'alt' }]);
assert.deepEqual(
  merged.map((event) => event.seq),
  [2, 1],
);
assert.equal(mergeEvents(Array.from({ length: 205 }, (_, i) => ({ ...older, seq: i, srcTsMs: i })), []).length, 200);

assert.equal(deskForEvent('open'), 'ausfuehrung');
assert.equal(deskForEvent('close'), 'ausfuehrung');
assert.equal(deskForEvent('skeptic'), 'strategie');
assert.equal(deskForEvent('reject'), 'risiko');
assert.equal(deskForEvent('signal'), null);

const polledState = { ...(hello?.type === 'hello' ? hello.state : ({} as DemoState)), updatedMs: 1 };
const liveState = { ...polledState, equity: 110, updatedMs: 50 };
const polled = { phase: 'ready' as const, state: polledState, stale: false };
assert.equal(pickDisplayed(liveState, polled, 'connected').state?.equity, 110);
assert.equal(pickDisplayed(liveState, polled, 'offline').state?.equity, 110);
assert.equal(pickDisplayed(null, polled, 'offline').state?.equity, polledState.equity);
const olderLive = { ...liveState, updatedMs: 0, equity: 90 };
assert.equal(pickDisplayed(olderLive, polled, 'offline').state?.equity, polledState.equity);
assert.equal(pickDisplayed(olderLive, polled, 'connected').state?.equity, 90);

const placeholder = parseLiveConfig(JSON.parse(fs.readFileSync('public/demo/live.json', 'utf8')));
assert.deepEqual(placeholder, { wsUrl: null });

console.log('live ok');
