import { useSyncExternalStore } from 'react';
import { DEMO_STATE_URL, isDemoStale, newTradeIds, parseDemo, type DemoFeed } from './demo';
import { pulseExecution } from '../scene/tradePulse';

const POLL_MS = 60_000;

let feed: DemoFeed = { phase: 'loading', state: null, stale: false };
const listeners = new Set<() => void>();
let knownTrades: Set<string> | null = null;

function emit(next: DemoFeed): void {
  if (next.phase === feed.phase && next.state === feed.state && next.stale === feed.stale) return;
  feed = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemo(): DemoFeed {
  return useSyncExternalStore(subscribe, () => feed, () => feed);
}

async function pull(): Promise<void> {
  if (document.hidden) return;
  try {
    const response = await fetch(`${DEMO_STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseDemo(await response.json());
    if (!parsed) throw new Error('ungültig');
    const arrived = newTradeIds(knownTrades, parsed.trades);
    knownTrades = new Set(parsed.trades.map((trade) => trade.id));
    if (arrived.length > 0) pulseExecution();
    emit({ phase: 'ready', state: parsed, stale: isDemoStale(parsed.updatedMs) });
  } catch {
    if (!feed.state) {
      emit({ phase: 'missing', state: null, stale: false });
      return;
    }
    emit({ phase: 'ready', state: feed.state, stale: isDemoStale(feed.state.updatedMs) });
  }
}

export function startDemoFeed(): () => void {
  let stopped = false;
  let timer = 0;

  const tick = () => {
    if (stopped || document.hidden) return;
    void pull();
  };

  const loop = () => {
    tick();
    timer = window.setTimeout(loop, POLL_MS);
  };

  const onVisibility = () => {
    if (!document.hidden) tick();
  };

  document.addEventListener('visibilitychange', onVisibility);
  loop();

  const staleTimer = window.setInterval(() => {
    if (!feed.state) return;
    const stale = isDemoStale(feed.state.updatedMs);
    if (stale !== feed.stale) emit({ ...feed, stale });
  }, 15_000);

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    window.clearInterval(staleTimer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
