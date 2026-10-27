import raw from './desk-status.json';
import type { BotProfile, DeskStatus, SafetyFlags } from './types';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseDesk(input: unknown): DeskStatus | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  if (!Array.isArray(record.bots)) return null;

  const bots: BotProfile[] = [];
  for (const item of record.bots) {
    if (!item || typeof item !== 'object') continue;
    const bot = item as Record<string, unknown>;
    const station = text(bot.station);
    const name = text(bot.name);
    const role = text(bot.role);
    const description = text(bot.description);
    const status = text(bot.status);
    if (!station || !name || !role || !description || !status) continue;
    bots.push({ station, name, role, description, status });
  }
  if (bots.length === 0) return null;

  const safetyRaw =
    record.safety && typeof record.safety === 'object'
      ? (record.safety as Partial<SafetyFlags>)
      : {};

  return {
    mode: text(record.mode) || 'Recherche',
    headline: text(record.headline) || 'Recherche-Desk',
    bots,
    safety: {
      tradingEnabled: Boolean(safetyRaw.tradingEnabled),
      riskLimitsSet: Boolean(safetyRaw.riskLimitsSet),
      apiWalletConnected: Boolean(safetyRaw.apiWalletConnected),
      openOrders: Boolean(safetyRaw.openOrders),
    },
  };
}

const fallback = parseDesk(raw);
if (!fallback) throw new Error('desk-status.json ist ungültig');

export const DEFAULT_DESK: DeskStatus = fallback;
