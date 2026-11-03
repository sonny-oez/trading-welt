import { newTradeIds, type DemoPosition, type DemoState, type DemoTrade } from './demo.ts';
import { formatBerlinShort, formatSignedMoney, formatSize } from './format.ts';

export type AgentId = 'strategie' | 'risiko' | 'ausfuehrung' | 'ausstieg';
export type Tone = 'up' | 'down' | 'flat';

export const DASHBOARD_COPY = {
  paper: 'Papier',
  goal: 'Ziel —',
  goalHint: 'Kein Ziel in den Daten. Die Marken sind nur eine Skala.',
  pnlMissing: '—',
  pnlCaption: 'Summe',
  scoreMissing: 'Gewinn/Verlust —',
  noSignal: 'Noch kein Signal',
  noReject: 'Keine Ablehnung',
  noFill: 'Keine Eröffnung',
  noExit: 'Noch kein Schluss',
  noPosition: 'Keine offene Position',
  idle: 'ruhend',
  kicker: 'Trading-Welt · Papier',
} as const;

export const MULTIPLE_SCALE = [0.5, 1, 1.5, 2] as const;

export interface AgentModel {
  id: AgentId;
  name: string;
  subtitle: string;
  latest: string;
  note: string;
  score: string;
  pill: string | null;
  pnl: number | null;
  series: number[];
  tone: Tone;
  count: number;
}

export interface ActivityLine {
  id: string;
  timeUtc: string;
  agent: AgentId;
  title: string;
  detail: string;
  pnl: number | null;
}

export interface ToastCopy {
  id: string;
  kicker: string;
  title: string;
  body: string;
  amount: string | null;
  tone: Tone;
  agent: AgentId;
}

export interface DashboardModel {
  multiple: number | null;
  delta: number;
  deltaPct: number | null;
  series: number[];
  curveIncludesStart: boolean;
  agents: AgentModel[];
  activity: ActivityLine[];
  exitScore: string;
}

export function formatMultiple(value: number): string {
  return `${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}×`;
}

export function formatScaleMark(value: number): string {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)}×`;
}

export function equityChange(equity: number, startEquity: number): {
  delta: number;
  pct: number | null;
  multiple: number | null;
} {
  const delta = equity - startEquity;
  if (startEquity === 0) return { delta, pct: null, multiple: null };
  return {
    delta,
    pct: (delta / startEquity) * 100,
    multiple: equity / startEquity,
  };
}

/** Position of a multiple on the fixed 0,5×–2× scale. Outside values sit on the edge. */
export function multiplePosition(multiple: number | null): number | null {
  if (multiple == null || !Number.isFinite(multiple)) return null;
  const min = MULTIPLE_SCALE[0];
  const max = MULTIPLE_SCALE[MULTIPLE_SCALE.length - 1];
  const clamped = Math.min(max, Math.max(min, multiple));
  return (clamped - min) / (max - min);
}

export function downsample(values: readonly number[], max: number): number[] {
  if (max < 2 || values.length <= max) return [...values];
  const out: number[] = [];
  const step = (values.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) out.push(values[Math.round(i * step)] ?? values[values.length - 1] ?? 0);
  return out;
}

export function rejectKind(reason: string): 'cost-filter' | 'session-window' | 'other' | null {
  if (!reason.startsWith('REJECT:')) return null;
  const body = reason.slice('REJECT:'.length).trim().toLowerCase();
  if (body.startsWith('cost-filter')) return 'cost-filter';
  if (body.startsWith('session_window')) return 'session-window';
  return 'other';
}

export function exitKind(reason: string): 'stop' | 'target' | 'gap' | 'other' {
  const head = reason.split(';')[0]?.trim().toLowerCase() ?? '';
  if (head === 'stop' || head.startsWith('stop ')) return 'stop';
  if (head === 'take_profit' || head.startsWith('take_profit')) return 'target';
  if (head === 'gap' || head.startsWith('gap ')) return 'gap';
  return 'other';
}

export function signalSide(reason: string): 'long' | 'short' | null {
  if (reason.includes('Long-Kreuz')) return 'long';
  if (reason.includes('Short-Kreuz')) return 'short';
  return null;
}

export function agentOf(trade: DemoTrade): AgentId {
  if (trade.bot === 'Risk Manager' || rejectKind(trade.reason)) return 'risiko';
  if (trade.action === 'close') return 'ausstieg';
  return 'ausfuehrung';
}

function rejectLabel(kind: ReturnType<typeof rejectKind>): string {
  if (kind === 'cost-filter') return 'Kostenfilter';
  if (kind === 'session-window') return 'Sitzungsfenster';
  return 'Ablehnung';
}

function exitLabel(kind: ReturnType<typeof exitKind>): string {
  if (kind === 'stop') return 'Stop';
  if (kind === 'target') return 'Ziel';
  if (kind === 'gap') return 'Kurslücke';
  return 'Schluss';
}

function clip(value: string, max = 72): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function signalSubtitle(reason: string): string {
  const hasEma = reason.includes('EMA9/21');
  const hasTrend = reason.includes('1h-EMA50');
  if (hasEma && hasTrend) return 'EMA 9/21 · 1h-EMA50';
  if (hasEma) return 'EMA 9/21';
  const head = reason.split('|')[0]?.split(';')[0]?.trim() ?? '';
  if (!head || head.startsWith('REJECT:')) return 'Signale';
  return clip(head, 42);
}

function countWord(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function scoreText(wins: number, losses: number, flats: number, unknown: number): string {
  if (wins + losses + flats + unknown === 0) return DASHBOARD_COPY.scoreMissing;
  const parts = [countWord(wins, 'Gewinn', 'Gewinne'), countWord(losses, 'Verlust', 'Verluste')];
  if (flats > 0) parts.push(countWord(flats, 'unverändert', 'unverändert'));
  if (unknown > 0) parts.push(countWord(unknown, 'ohne PnL', 'ohne PnL'));
  return parts.join(' · ');
}

function toneOf(value: number | null): Tone {
  if (value == null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function joinCounts(parts: string[], empty: string): string {
  return parts.length > 0 ? parts.join(' · ') : empty;
}

export function activityLine(trade: DemoTrade): ActivityLine {
  const agent = agentOf(trade);
  if (agent === 'risiko') {
    const kind = rejectKind(trade.reason);
    return {
      id: trade.id,
      timeUtc: trade.timeUtc,
      agent,
      title: kind ? `Risiko hat ${trade.coin} abgelehnt` : `Risiko · ${trade.coin}`,
      detail: kind ? rejectLabel(kind) : clip(trade.reason || 'Ereignis'),
      pnl: null,
    };
  }
  if (agent === 'ausstieg') {
    return {
      id: trade.id,
      timeUtc: trade.timeUtc,
      agent,
      title: `Ausstieg ${trade.coin} · ${exitLabel(exitKind(trade.reason))}`,
      detail: formatSize(trade.size),
      pnl: trade.pnl,
    };
  }
  const side = signalSide(trade.reason);
  const signal = side === 'long' ? 'Long-Kreuz' : side === 'short' ? 'Short-Kreuz' : 'Eröffnung';
  const dir = trade.side === 'buy' ? 'Kauf' : 'Verkauf';
  return {
    id: trade.id,
    timeUtc: trade.timeUtc,
    agent,
    title: `Ausführung ${dir} ${trade.coin}`,
    detail: `${signal} · ${formatSize(trade.size)}`,
    pnl: null,
  };
}

export function toastFor(trade: DemoTrade, extra = 0): ToastCopy {
  const line = activityLine(trade);
  const stamp = formatBerlinShort(Date.parse(line.timeUtc));
  const more = extra > 0 ? ` · +${extra} weitere` : '';
  return {
    id: trade.id,
    kicker: DASHBOARD_COPY.kicker,
    title: line.title,
    body: `${line.detail} · virtuell · ${stamp}${more}`,
    amount: line.pnl == null ? null : formatSignedMoney(line.pnl),
    tone: toneOf(line.pnl),
    agent: line.agent,
  };
}

export function toastsForArrivals(trades: readonly DemoTrade[], limit = 3): ToastCopy[] {
  const shown = trades.slice(0, limit);
  const extra = trades.length - shown.length;
  return shown.map((trade, index) => toastFor(trade, index === shown.length - 1 ? extra : 0));
}

export function arrivalsSince(previous: ReadonlySet<string> | null, trades: readonly DemoTrade[]): DemoTrade[] {
  const ids = new Set(newTradeIds(previous, trades));
  return trades.filter((trade) => ids.has(trade.id));
}

function positionNote(positions: readonly DemoPosition[]): string {
  if (positions.length === 0) return DASHBOARD_COPY.noPosition;
  const ordered = [...positions].sort((a, b) => Date.parse(b.openedUtc) - Date.parse(a.openedUtc));
  const first = ordered[0];
  if (!first) return DASHBOARD_COPY.noPosition;
  const side = first.side === 'long' ? 'Long' : 'Short';
  const extra = ordered.length > 1 ? ` · +${ordered.length - 1}` : '';
  return `${first.coin} ${side} · ${formatSignedMoney(first.unrealizedPnl)}${extra}`;
}

function cumulative(trades: readonly DemoTrade[]): { series: number[]; sum: number | null } {
  const ordered = [...trades].reverse();
  let acc = 0;
  let any = false;
  const series = ordered.map((trade) => {
    if (trade.pnl != null) {
      acc += trade.pnl;
      any = true;
    }
    return acc;
  });
  return { series: any ? series : [], sum: any ? acc : null };
}

export function buildDashboard(state: DemoState): DashboardModel {
  const change = equityChange(state.equity, state.startEquity);
  const curve = state.equityCurve.map((point) => point.equity);
  const series = downsample(curve, 64);
  let curveIncludesStart = true;
  if (curve.length > 0) {
    const min = Math.min(...curve);
    const max = Math.max(...curve);
    curveIncludesStart = state.startEquity >= min && state.startEquity <= max;
  }

  const signals = state.trades.filter((trade) => agentOf(trade) === 'ausfuehrung' && trade.action === 'open');
  const rejects = state.trades.filter((trade) => agentOf(trade) === 'risiko');
  const fills = signals;
  const exits = state.trades.filter((trade) => agentOf(trade) === 'ausstieg');

  let long = 0;
  let short = 0;
  let otherSignals = 0;
  for (const trade of signals) {
    const side = signalSide(trade.reason);
    if (side === 'long') long += 1;
    else if (side === 'short') short += 1;
    else otherSignals += 1;
  }
  const latestSignal = signals[0];

  let cost = 0;
  let session = 0;
  let otherReject = 0;
  for (const trade of rejects) {
    const kind = rejectKind(trade.reason);
    if (kind === 'cost-filter') cost += 1;
    else if (kind === 'session-window') session += 1;
    else otherReject += 1;
  }
  const latestReject = rejects[0];

  let stops = 0;
  let targets = 0;
  let gaps = 0;
  let otherExits = 0;
  let wins = 0;
  let losses = 0;
  let flats = 0;
  let unknown = 0;
  for (const trade of exits) {
    const kind = exitKind(trade.reason);
    if (kind === 'stop') stops += 1;
    else if (kind === 'target') targets += 1;
    else if (kind === 'gap') gaps += 1;
    else otherExits += 1;
    if (trade.pnl == null) unknown += 1;
    else if (trade.pnl > 0) wins += 1;
    else if (trade.pnl < 0) losses += 1;
    else flats += 1;
  }
  const exitScore = scoreText(wins, losses, flats, unknown);
  const exitSeries = cumulative(exits);
  const latestExit = exits[0];
  const latestFill = fills[0];

  const signalParts = [
    long ? `${long} Long` : '',
    short ? `${short} Short` : '',
    otherSignals ? countWord(otherSignals, 'sonstiges Signal', 'sonstige Signale') : '',
  ].filter(Boolean);

  const rejectParts = [
    cost ? `${cost} Kostenfilter` : '',
    session ? `${session} Sitzungsfenster` : '',
    otherReject ? countWord(otherReject, 'sonstige Ablehnung', 'sonstige Ablehnungen') : '',
  ].filter(Boolean);

  const exitParts = [
    stops ? `${stops} Stop` : '',
    targets ? countWord(targets, 'Ziel', 'Ziele') : '',
    gaps ? countWord(gaps, 'Kurslücke', 'Kurslücken') : '',
    otherExits ? countWord(otherExits, 'sonstiger Schluss', 'sonstige Schlüsse') : '',
  ].filter(Boolean);

  const agents: AgentModel[] = [
    {
      id: 'strategie',
      name: 'Strategie',
      subtitle: latestSignal ? signalSubtitle(latestSignal.reason) : 'Signale',
      latest: latestSignal ? `${latestSignal.coin} · ${signalSide(latestSignal.reason) === 'long' ? 'Long-Kreuz' : signalSide(latestSignal.reason) === 'short' ? 'Short-Kreuz' : 'Signal'}` : DASHBOARD_COPY.noSignal,
      note: joinCounts(signalParts, DASHBOARD_COPY.noSignal),
      score: DASHBOARD_COPY.scoreMissing,
      pill: signals.length === 0 ? DASHBOARD_COPY.idle : null,
      pnl: null,
      series: [],
      tone: 'flat',
      count: signals.length,
    },
    {
      id: 'risiko',
      name: 'Risiko',
      subtitle: 'Ablehnungen',
      latest: latestReject
        ? `${latestReject.coin} · ${rejectKind(latestReject.reason) ? rejectLabel(rejectKind(latestReject.reason)) : clip(latestReject.reason || 'Ereignis', 32)}`
        : DASHBOARD_COPY.noReject,
      note: joinCounts(rejectParts, DASHBOARD_COPY.noReject),
      score: DASHBOARD_COPY.scoreMissing,
      pill: rejects.length === 0 ? DASHBOARD_COPY.idle : null,
      pnl: null,
      series: [],
      tone: 'flat',
      count: rejects.length,
    },
    {
      id: 'ausfuehrung',
      name: 'Ausführung',
      subtitle: 'Eröffnungen',
      latest: latestFill
        ? `${latestFill.coin} · ${latestFill.side === 'buy' ? 'Kauf' : 'Verkauf'} · ${formatSize(latestFill.size)}`
        : DASHBOARD_COPY.noFill,
      note:
        state.positions.length === 0
          ? `${countWord(fills.length, 'Eröffnung', 'Eröffnungen')} · ohne Position`
          : `${countWord(fills.length, 'Eröffnung', 'Eröffnungen')} · ${positionNote(state.positions)}`,
      score: DASHBOARD_COPY.scoreMissing,
      pill: null,
      pnl: null,
      series: [],
      tone: 'flat',
      count: fills.length,
    },
    {
      id: 'ausstieg',
      name: 'Ausstieg',
      subtitle: 'Stop, Ziel, Kurslücke',
      latest: latestExit ? `${latestExit.coin} · ${exitLabel(exitKind(latestExit.reason))}` : DASHBOARD_COPY.noExit,
      note: joinCounts(exitParts, DASHBOARD_COPY.noExit),
      score: exitScore,
      pill: exits.length === 0 ? DASHBOARD_COPY.idle : null,
      pnl: exitSeries.sum,
      series: downsample(exitSeries.series, 24),
      tone: toneOf(exitSeries.sum),
      count: exits.length,
    },
  ];

  return {
    multiple: change.multiple,
    delta: change.delta,
    deltaPct: change.pct,
    series,
    curveIncludesStart,
    agents,
    activity: state.trades.map(activityLine),
    exitScore,
  };
}
