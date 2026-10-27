import { isDemoStale, parsePaperState, type DemoFeed, type DemoState } from './demo.ts';

export const LIVE_CONFIG_URL =
  'https://raw.githubusercontent.com/sonny-oez/trading-welt/main/public/demo/live.json';

export const LIVE_DEAD_MS = 5_000;
export const LIVE_HIDE_PAUSE_MS = 5 * 60 * 1000;
export const LIVE_PING_MS = 5_000;
export const LIVE_EVENT_LIMIT = 200;
export const LIVE_SAMPLE_LIMIT = 30;

export const LIVE_KINDS = [
  'open',
  'close',
  'signal',
  'skeptic',
  'reject',
  'risk',
  'stop',
  'engine',
  'info',
] as const;

export type LiveKind = (typeof LIVE_KINDS)[number];
export type LiveLink = 'connected' | 'offline';

export interface LiveEvent {
  seq: number;
  tsMs: number;
  srcTsMs: number;
  kind: LiveKind;
  coin: string | null;
  text: string;
  data: unknown;
}

export type LiveFrame =
  | { type: 'hello'; serverTsMs: number; state: DemoState; recent: LiveEvent[] }
  | { type: 'state'; seq: number; tsMs: number; state: DemoState }
  | { type: 'event'; event: LiveEvent }
  | { type: 'heartbeat'; seq: number; tsMs: number }
  | { type: 'pong'; clientTsMs: number; serverTsMs: number }
  | { type: 'ignore' };

const KIND_SET = new Set<string>(LIVE_KINDS);

function recordOf(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  return input as Record<string, unknown>;
}

function finite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function acceptLiveUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol === 'wss:') return url.toString();
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol === 'ws:' && local) return url.toString();
  return null;
}

export function parseLiveConfig(input: unknown): { wsUrl: string | null } | null {
  const record = recordOf(input);
  if (!record || record.schema !== 1) return null;
  if (record.ws_url == null) return { wsUrl: null };
  const wsUrl = acceptLiveUrl(record.ws_url);
  if (!wsUrl) return { wsUrl: null };
  return { wsUrl };
}

export function liveOverride(search: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const raw = new URLSearchParams(query).get('live');
  if (raw == null || raw.trim() === '') return null;
  return acceptLiveUrl(raw);
}

function parseEvent(input: unknown): LiveEvent | null {
  const record = recordOf(input);
  if (!record) return null;
  if (record.type != null && record.type !== 'event') return null;
  const seq = finite(record.seq);
  const tsMs = finite(record.ts_ms);
  const srcTsMs = finite(record.src_ts_ms);
  const kind = typeof record.kind === 'string' ? record.kind : '';
  if (seq == null || tsMs == null || srcTsMs == null || !KIND_SET.has(kind)) return null;
  let coin: string | null = null;
  if (record.coin != null) {
    if (typeof record.coin !== 'string') return null;
    coin = record.coin.trim() || null;
  }
  if (record.text != null && typeof record.text !== 'string') return null;
  return {
    seq,
    tsMs,
    srcTsMs,
    kind: kind as LiveKind,
    coin,
    text: typeof record.text === 'string' ? record.text.trim() : '',
    data: record.data ?? null,
  };
}

export function parseLiveFrame(input: unknown): LiveFrame | null {
  const record = recordOf(input);
  if (!record || typeof record.type !== 'string') return null;
  if (record.type === 'hello') {
    if (record.schema !== 1 || record.mode !== 'paper') return null;
    const serverTsMs = finite(record.server_ts_ms);
    const stateRecord = recordOf(record.state);
    if (serverTsMs == null || !stateRecord) return null;
    const state = parsePaperState(stateRecord);
    if (!state) return null;
    const recent = Array.isArray(record.recent)
      ? record.recent.map(parseEvent).filter((event): event is LiveEvent => event != null)
      : [];
    return { type: 'hello', serverTsMs, state, recent };
  }
  if (record.type === 'state') {
    const seq = finite(record.seq);
    const tsMs = finite(record.ts_ms);
    const stateRecord = recordOf(record.state);
    if (seq == null || tsMs == null || !stateRecord) return null;
    const state = parsePaperState(stateRecord);
    if (!state) return null;
    return { type: 'state', seq, tsMs, state };
  }
  if (record.type === 'event') {
    const event = parseEvent(record);
    if (!event) return null;
    return { type: 'event', event };
  }
  if (record.type === 'heartbeat') {
    const seq = finite(record.seq);
    const tsMs = finite(record.ts_ms);
    if (seq == null || tsMs == null) return null;
    return { type: 'heartbeat', seq, tsMs };
  }
  if (record.type === 'pong') {
    const clientTsMs = finite(record.client_ts_ms);
    const serverTsMs = finite(record.server_ts_ms);
    if (clientTsMs == null || serverTsMs == null) return null;
    return { type: 'pong', clientTsMs, serverTsMs };
  }
  return { type: 'ignore' };
}

export function eventKey(event: LiveEvent): string {
  return `${event.seq}|${event.kind}|${event.srcTsMs}`;
}

export function mergeEvents(existing: readonly LiveEvent[], incoming: readonly LiveEvent[]): LiveEvent[] {
  const map = new Map<string, LiveEvent>();
  for (const event of existing) map.set(eventKey(event), event);
  for (const event of incoming) map.set(eventKey(event), event);
  return [...map.values()]
    .sort((a, b) => b.srcTsMs - a.srcTsMs || b.seq - a.seq)
    .slice(0, LIVE_EVENT_LIMIT);
}

export function backoffMs(attempt: number, rand = Math.random()): number {
  const safe = Math.max(0, Math.floor(attempt));
  const cap = Math.min(30_000, 1000 * 2 ** Math.min(safe, 5));
  const unit = Math.min(1, Math.max(0, rand));
  if (cap <= 1000) return 1000;
  return Math.round(1000 + unit * (cap - 1000));
}

export function socketIsDead(lastFrameMs: number, now: number, hidden: boolean): boolean {
  if (hidden) return false;
  return now - lastFrameMs > LIVE_DEAD_MS;
}

export function shouldPauseHidden(hiddenForMs: number): boolean {
  return hiddenForMs > LIVE_HIDE_PAUSE_MS;
}

export function percentile50(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left == null || right == null) return null;
  return (left + right) / 2;
}

export function rememberSample(values: number[], sample: number): void {
  if (!Number.isFinite(sample)) return;
  values.push(sample);
  if (values.length > LIVE_SAMPLE_LIMIT) values.shift();
}

export function deskForEvent(kind: LiveKind): string | null {
  if (kind === 'open' || kind === 'close') return 'ausfuehrung';
  if (kind === 'skeptic') return 'strategie';
  if (kind === 'reject') return 'risiko';
  return null;
}

export function pickDisplayed(live: DemoState | null, polled: DemoFeed, link: LiveLink): DemoFeed {
  if (link === 'connected' && live) return { phase: 'ready', state: live, stale: false };
  if (!live) return polled;
  if (!polled.state || live.updatedMs >= polled.state.updatedMs) {
    return { phase: 'ready', state: live, stale: isDemoStale(live.updatedMs) };
  }
  return polled;
}

export const KIND_LABEL: Record<LiveKind, string> = {
  open: 'Öffnen',
  close: 'Schließen',
  signal: 'Signal',
  skeptic: 'Skeptiker',
  reject: 'Ablehnung',
  risk: 'Risiko',
  stop: 'Stop',
  engine: 'Engine',
  info: 'Info',
};
