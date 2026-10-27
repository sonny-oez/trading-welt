import { useSyncExternalStore } from 'react';
import type { DemoState } from './demo';
import {
  acceptLiveUrl,
  backoffMs,
  deskForEvent,
  LIVE_CONFIG_URL,
  LIVE_HIDE_PAUSE_MS,
  LIVE_PING_MS,
  liveOverride,
  mergeEvents,
  parseLiveConfig,
  parseLiveFrame,
  percentile50,
  rememberSample,
  socketIsDead,
  type LiveEvent,
  type LiveLink,
} from './live';
import { pulseStation } from '../scene/tradePulse';

interface Board {
  link: LiveLink;
  state: DemoState | null;
  events: LiveEvent[];
}

interface Latency {
  oneWayP50: number | null;
  rttP50: number | null;
  skewP50: number | null;
}

const emptyLatency: Latency = { oneWayP50: null, rttP50: null, skewP50: null };
let board: Board = { link: 'offline', state: null, events: [] };
let latency: Latency = emptyLatency;
const boardListeners = new Set<() => void>();
const latencyListeners = new Set<() => void>();

let draftBoard: Board | null = null;
let draftLatency = false;
let raf = 0;
const rttSamples: number[] = [];
const skewSamples: number[] = [];

function subscribeBoard(listener: () => void): () => void {
  boardListeners.add(listener);
  return () => boardListeners.delete(listener);
}

function subscribeLatency(listener: () => void): () => void {
  latencyListeners.add(listener);
  return () => latencyListeners.delete(listener);
}

function flush(): void {
  raf = 0;
  if (draftBoard) {
    const next = draftBoard;
    draftBoard = null;
    if (next.link !== board.link || next.state !== board.state || next.events !== board.events) {
      board = next;
      boardListeners.forEach((listener) => listener());
    }
  }
  if (draftLatency) {
    draftLatency = false;
    const rttP50 = percentile50(rttSamples);
    const next: Latency = {
      rttP50,
      oneWayP50: rttP50 == null ? null : rttP50 / 2,
      skewP50: percentile50(skewSamples),
    };
    if (next.rttP50 !== latency.rttP50 || next.oneWayP50 !== latency.oneWayP50 || next.skewP50 !== latency.skewP50) {
      latency = next;
      latencyListeners.forEach((listener) => listener());
    }
  }
}

function schedule(): void {
  if (raf) return;
  raf = requestAnimationFrame(flush);
}

function mutateBoard(update: (current: Board) => Board): void {
  draftBoard = update(draftBoard ?? board);
  schedule();
}

export function useLiveLink(): LiveLink {
  return useSyncExternalStore(subscribeBoard, () => board.link, () => 'offline');
}

export function useLiveState(): DemoState | null {
  return useSyncExternalStore(subscribeBoard, () => board.state, () => null);
}

export function useLiveEvents(): LiveEvent[] {
  return useSyncExternalStore(subscribeBoard, () => board.events, () => []);
}

export function useLiveLatency(): Latency {
  return useSyncExternalStore(subscribeLatency, () => latency, () => emptyLatency);
}

async function discoverUrl(): Promise<string | null> {
  const override = liveOverride(window.location.search);
  if (override) return override;
  try {
    const response = await fetch(`${LIVE_CONFIG_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return parseLiveConfig(await response.json())?.wsUrl ?? null;
  } catch {
    return null;
  }
}

export function startLiveFeed(): () => void {
  let stopped = false;
  let paused = false;
  let socket: WebSocket | null = null;
  let attempt = 0;
  let reconnectTimer = 0;
  let pingTimer = 0;
  let watchTimer = 0;
  let hideTimer = 0;
  let hiddenAt = 0;
  let lastFrame = 0;
  let lastSeq = -1;
  let url: string | null = null;
  const armed = { current: false };

  const setOffline = () => {
    mutateBoard((current) => (current.link === 'offline' ? current : { ...current, link: 'offline' }));
  };

  const stopTimers = () => {
    window.clearInterval(pingTimer);
    window.clearInterval(watchTimer);
    pingTimer = 0;
    watchTimer = 0;
  };

  const dropSocket = () => {
    stopTimers();
    if (!socket) return;
    const current = socket;
    socket = null;
    current.onopen = null;
    current.onmessage = null;
    current.onclose = null;
    current.onerror = null;
    current.close();
  };

  const scheduleReconnect = () => {
    window.clearTimeout(reconnectTimer);
    const delay = backoffMs(attempt);
    attempt += 1;
    reconnectTimer = window.setTimeout(connect, delay);
  };

  const applyMessage = (raw: unknown) => {
    const frame = parseLiveFrame(raw);
    if (!frame || frame.type === 'ignore') return;
    if (frame.type === 'heartbeat') {
      if (frame.seq < lastSeq) return;
      lastSeq = frame.seq;
      rememberSample(skewSamples, Date.now() - frame.tsMs);
      draftLatency = true;
      schedule();
      return;
    }
    if (frame.type === 'pong') {
      const rtt = Date.now() - frame.clientTsMs;
      if (rtt >= 0 && rtt < 60_000) rememberSample(rttSamples, rtt);
      draftLatency = true;
      schedule();
      return;
    }
    if (frame.type === 'hello') {
      lastSeq = frame.recent.reduce((max, event) => Math.max(max, event.seq), lastSeq);
      armed.current = true;
      mutateBoard(() => ({
        link: 'connected',
        state: frame.state,
        events: mergeEvents([], frame.recent),
      }));
      return;
    }
    if (frame.type === 'state') {
      if (frame.seq < lastSeq) return;
      lastSeq = frame.seq;
      mutateBoard((current) => ({ ...current, link: 'connected', state: frame.state }));
      return;
    }
    if (frame.event.seq < lastSeq) return;
    lastSeq = frame.event.seq;
    const desk = armed.current ? deskForEvent(frame.event.kind) : null;
    if (desk) pulseStation(desk);
    armed.current = true;
    mutateBoard((current) => ({
      ...current,
      link: 'connected',
      events: mergeEvents(current.events, [frame.event]),
    }));
  };

  function connect() {
    if (stopped || paused || !url) return;
    const target = acceptLiveUrl(url);
    if (!target) return;
    dropSocket();
    const ws = new WebSocket(target);
    socket = ws;
    ws.onopen = () => {
      if (socket !== ws) return;
      attempt = 0;
      lastFrame = Date.now();
      mutateBoard((current) => ({ ...current, link: 'connected' }));
      const ping = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', client_ts_ms: Date.now() }));
        }
      };
      ping();
      pingTimer = window.setInterval(ping, LIVE_PING_MS);
      watchTimer = window.setInterval(() => {
        if (socket === ws && socketIsDead(lastFrame, Date.now(), document.hidden)) ws.close();
      }, 1000);
    };
    ws.onmessage = (message) => {
      if (socket !== ws || typeof message.data !== 'string') return;
      lastFrame = Date.now();
      try {
        applyMessage(JSON.parse(message.data));
      } catch {
        /* Ignore malformed frames. */
      }
    };
    ws.onerror = () => {
      ws.close();
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = null;
      stopTimers();
      setOffline();
      if (!stopped && !paused && url) scheduleReconnect();
    };
  }

  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!document.hidden) return;
        paused = true;
        window.clearTimeout(reconnectTimer);
        dropSocket();
        setOffline();
      }, LIVE_HIDE_PAUSE_MS + 1);
      return;
    }
    window.clearTimeout(hideTimer);
    const hiddenFor = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    const resume = paused || hiddenFor > LIVE_HIDE_PAUSE_MS;
    paused = false;
    if (!url) return;
    if (resume || !socket || socket.readyState !== WebSocket.OPEN) {
      attempt = 0;
      window.clearTimeout(reconnectTimer);
      connect();
      return;
    }
    if (socketIsDead(lastFrame, Date.now(), false)) socket.close();
  };

  void discoverUrl().then((next) => {
    if (stopped) return;
    url = next;
    if (url && !document.hidden) connect();
  });
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopped = true;
    paused = true;
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(hideTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    dropSocket();
  };
}
