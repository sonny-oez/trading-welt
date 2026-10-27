import type { Asset, Book, Candle, Coin, Level } from './types.ts';
import { COINS } from './types.ts';

/** Hyperliquid funding is an hourly rate. Annualized percent = rate × 24 × 365 × 100. */
export function annualizedFundingPct(hourly: number): number {
  return hourly * 24 * 365 * 100;
}

export function changePct(mark: number, prevDay: number): number | null {
  if (!Number.isFinite(mark) || !Number.isFinite(prevDay) || prevDay === 0) return null;
  return ((mark - prevDay) / prevDay) * 100;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

interface RawCtx {
  funding?: unknown;
  openInterest?: unknown;
  prevDayPx?: unknown;
  dayNtlVlm?: unknown;
  markPx?: unknown;
  midPx?: unknown;
}

export function parseMeta(payload: unknown): Partial<Record<Coin, Asset>> {
  if (!Array.isArray(payload) || payload.length < 2) return {};
  const meta = payload[0] as { universe?: { name?: unknown }[] } | null;
  const ctxs = payload[1];
  if (!meta || !Array.isArray(meta.universe) || !Array.isArray(ctxs)) return {};

  const wanted = new Set<string>(COINS);
  const out: Partial<Record<Coin, Asset>> = {};

  meta.universe.forEach((entry, index) => {
    const name = typeof entry?.name === 'string' ? entry.name : '';
    if (!wanted.has(name)) return;
    const coin = name as Coin;
    const ctx = ctxs[index] as RawCtx | undefined;
    if (!ctx) return;
    const mark = num(ctx.markPx);
    const prevDay = num(ctx.prevDayPx);
    const funding = num(ctx.funding);
    const oiBase = num(ctx.openInterest);
    const volumeUsd = num(ctx.dayNtlVlm);
    if (mark == null || prevDay == null || funding == null || oiBase == null || volumeUsd == null) return;
    out[coin] = {
      coin,
      mark,
      mid: num(ctx.midPx) ?? mark,
      prevDay,
      changePct: changePct(mark, prevDay),
      fundingHourly: funding,
      fundingAnnPct: annualizedFundingPct(funding),
      oiBase,
      oiUsd: oiBase * mark,
      volumeUsd,
    };
  });

  return out;
}

function parseLevels(raw: unknown, descending: boolean): Level[] {
  if (!Array.isArray(raw)) return [];
  const levels: Level[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const record = row as { px?: unknown; sz?: unknown; n?: unknown };
    const px = num(record.px);
    const sz = num(record.sz);
    if (px == null || sz == null) continue;
    levels.push({ px, sz, n: num(record.n) ?? 0, notional: px * sz });
  }
  levels.sort((a, b) => (descending ? b.px - a.px : a.px - b.px));
  return levels.slice(0, 12);
}

export function parseBook(payload: unknown, expected: Coin): Book | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as { levels?: unknown; time?: unknown; coin?: unknown };
  if (typeof record.coin === 'string' && record.coin !== expected) return null;
  if (!Array.isArray(record.levels) || record.levels.length < 2) return null;
  const bids = parseLevels(record.levels[0], true);
  const asks = parseLevels(record.levels[1], false);
  if (bids.length === 0 && asks.length === 0) return null;
  return {
    coin: expected,
    bids,
    asks,
    time: num(record.time) ?? Date.now(),
  };
}

export function parseCandles(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) return [];
  const out: Candle[] = [];
  for (const row of payload) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const t = num(record.t);
    const o = num(record.o);
    const h = num(record.h);
    const l = num(record.l);
    const c = num(record.c);
    if (t == null || o == null || h == null || l == null || c == null) continue;
    const vBase = num(record.v) ?? 0;
    out.push({ t, o, h, l, c, vBase, vUsd: vBase * c });
  }
  out.sort((a, b) => a.t - b.t);
  return out.slice(-26);
}
