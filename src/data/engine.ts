import { parseDesk } from './desk';
import { parseBook, parseCandles, parseMeta } from './parse';
import { getMarket, setDesk, setMarket, subscribeMarket } from './store';
import { COINS, type Coin } from './types';

const INFO_URL = 'https://api.hyperliquid.xyz/info';
const WS_URL = 'wss://api.hyperliquid.xyz/ws';

let refreshImpl = (): void => {};

export function refreshNow(): void {
  refreshImpl();
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function noticeFor(error: unknown, hadData: boolean): string {
  if (error instanceof Error && error.message.includes('429')) return 'Zu viele Anfragen';
  return hadData ? 'Letzte Daten' : 'Keine Verbindung';
}

async function postInfo(body: unknown, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(INFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function loadDesk(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}desk-status.json`, { cache: 'no-cache' });
    if (!response.ok) return;
    const parsed = parseDesk(await response.json());
    if (parsed) setDesk(parsed);
  } catch {
    /* Bundled fallback stays in place. */
  }
}

export function startEngine(): () => void {
  const controller = new AbortController();
  let stopped = false;
  let metaTimer = 0;
  let bookTimer = 0;
  let candleTimer = 0;
  let ws: WebSocket | null = null;
  let wsRetry = 1000;
  let reconnectTimer = 0;
  let allowWs = true;
  let subscribedCoin: Coin | null = null;
  let bookPending: unknown = null;
  let bookFlush = 0;
  let midPending: Record<string, string> | null = null;
  let midFlush = 0;
  let seenCoin = getMarket().selected;

  const pollMeta = async () => {
    if (stopped || document.hidden) return;
    try {
      const data = await postInfo({ type: 'metaAndAssetCtxs' }, controller.signal);
      if (stopped) return;
      const parsed = parseMeta(data);
      if (!COINS.some((coin) => parsed[coin])) throw new Error('leer');
      setMarket((state) => ({
        ...state,
        assets: parsed,
        status: 'live',
        updatedAt: Date.now(),
        notice: null,
      }));
    } catch (error) {
      if (stopped || isAbort(error)) return;
      setMarket((state) => ({
        ...state,
        status: 'offline',
        notice: noticeFor(error, state.updatedAt != null),
      }));
    }
  };

  const pollBook = async (force = false) => {
    if (stopped || document.hidden) return;
    if (!force && getMarket().wsConnected) return;
    const coin = getMarket().selected;
    try {
      const data = await postInfo({ type: 'l2Book', coin }, controller.signal);
      if (stopped || getMarket().selected !== coin) return;
      const book = parseBook(data, coin);
      if (book) setMarket({ book });
    } catch {
      /* Keep the last book. */
    }
  };

  const pollCandles = async (coin = getMarket().selected) => {
    if (stopped || document.hidden) return;
    const now = Date.now();
    try {
      const data = await postInfo(
        {
          type: 'candleSnapshot',
          req: {
            coin,
            interval: '1h',
            startTime: now - 24 * 60 * 60 * 1000,
            endTime: now,
          },
        },
        controller.signal,
      );
      if (stopped) return;
      const candles = parseCandles(data);
      setMarket((state) => ({
        ...state,
        candles: { ...state.candles, [coin]: candles },
        candleError: { ...state.candleError, [coin]: false },
      }));
    } catch {
      if (stopped) return;
      setMarket((state) => {
        if (state.candles[coin]?.length) return state;
        return { ...state, candleError: { ...state.candleError, [coin]: true } };
      });
    }
  };

  const send = (payload: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const sendSub = (coin: Coin) => {
    send({ method: 'subscribe', subscription: { type: 'allMids' } });
    if (subscribedCoin && subscribedCoin !== coin) {
      send({ method: 'unsubscribe', subscription: { type: 'l2Book', coin: subscribedCoin } });
    }
    send({ method: 'subscribe', subscription: { type: 'l2Book', coin } });
    subscribedCoin = coin;
  };

  const queueMids = (mids: Record<string, string>) => {
    midPending = mids;
    if (midFlush) return;
    midFlush = window.setTimeout(() => {
      midFlush = 0;
      const pending = midPending;
      midPending = null;
      if (!pending) return;
      setMarket((state) => {
        let changed = false;
        const assets = { ...state.assets };
        for (const coin of COINS) {
          const raw = pending[coin];
          const prev = assets[coin];
          if (!raw || !prev) continue;
          const mid = Number(raw);
          if (!Number.isFinite(mid) || prev.mid === mid) continue;
          assets[coin] = { ...prev, mid };
          changed = true;
        }
        return changed ? { ...state, assets } : state;
      });
    }, 500);
  };

  const queueBook = (data: unknown) => {
    bookPending = data;
    if (bookFlush) return;
    bookFlush = window.setTimeout(() => {
      bookFlush = 0;
      const pending = bookPending;
      bookPending = null;
      const coin = getMarket().selected;
      const book = parseBook(pending, coin);
      if (!book) return;
      setMarket((state) => (state.selected === coin ? { ...state, book } : state));
    }, 250);
  };

  const connectWs = () => {
    if (stopped || !allowWs || document.hidden || ws) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      return;
    }
    ws = socket;
    socket.onopen = () => {
      if (ws !== socket) return;
      wsRetry = 1000;
      setMarket({ wsConnected: true });
      sendSub(getMarket().selected);
    };
    socket.onmessage = (event) => {
      if (ws !== socket) return;
      let message: { channel?: string; data?: { mids?: Record<string, string> } };
      try {
        message = JSON.parse(String(event.data)) as typeof message;
      } catch {
        return;
      }
      if (message.channel === 'allMids' && message.data?.mids) queueMids(message.data.mids);
      else if (message.channel === 'l2Book') queueBook(message.data);
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (ws === socket) ws = null;
      subscribedCoin = null;
      setMarket({ wsConnected: false });
      if (stopped || !allowWs || document.hidden) return;
      window.clearTimeout(reconnectTimer);
      const wait = wsRetry;
      wsRetry = Math.min(wsRetry * 2, 20_000);
      reconnectTimer = window.setTimeout(connectWs, wait);
    };
  };

  const stopWs = () => {
    allowWs = false;
    window.clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
  };

  const onVisibility = () => {
    if (document.hidden) {
      stopWs();
      return;
    }
    allowWs = true;
    wsRetry = 1000;
    void pollMeta();
    void pollBook(true);
    void pollCandles();
    connectWs();
  };

  const unsub = subscribeMarket(() => {
    const coin = getMarket().selected;
    if (coin === seenCoin) return;
    seenCoin = coin;
    if (getMarket().wsConnected) sendSub(coin);
    void pollBook(true);
    void pollCandles(coin);
  });

  refreshImpl = () => {
    void pollMeta();
    void pollBook(true);
    void pollCandles();
  };

  void loadDesk();
  void pollMeta();
  void pollBook(true);
  void pollCandles();
  connectWs();
  metaTimer = window.setInterval(() => void pollMeta(), 8000);
  bookTimer = window.setInterval(() => void pollBook(false), 4000);
  candleTimer = window.setInterval(() => void pollCandles(), 60_000);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopped = true;
    controller.abort();
    stopWs();
    window.clearInterval(metaTimer);
    window.clearInterval(bookTimer);
    window.clearInterval(candleTimer);
    window.clearTimeout(midFlush);
    window.clearTimeout(bookFlush);
    document.removeEventListener('visibilitychange', onVisibility);
    unsub();
    refreshImpl = () => {};
  };
}
