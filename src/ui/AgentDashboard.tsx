import { useEffect, useRef, useState } from 'react';
import {
  DASHBOARD_COPY,
  MULTIPLE_SCALE,
  buildDashboard,
  arrivalsSince,
  formatMultiple,
  formatScaleMark,
  multiplePosition,
  toastsForArrivals,
  type AgentId,
  type AgentModel,
  type ToastCopy,
  type Tone,
} from '../data/dashboard';
import { DEMO_COPY, classifyDemo, type DemoTrade } from '../data/demo';
import { useDemo } from '../data/demoFeed';
import { formatBerlinHour, formatBerlinShort, formatBerlinStamp, formatMoney, formatPct, formatSignedMoney, formatSize } from '../data/format';
import { usePrefersReducedMotion } from '../hooks';
import './dashboard.css';

const LOGO = `${import.meta.env.BASE_URL}favicon.png`;
const TOAST_MS = 5600;

function plainSigned(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value);
}

function toneClass(tone: Tone): string {
  if (tone === 'up') return 'up';
  if (tone === 'down') return 'down';
  return '';
}

function useBerlinClock(): string {
  const [label, setLabel] = useState(() => formatBerlinHour(Date.now()));
  useEffect(() => {
    const tick = () => setLabel(formatBerlinHour(Date.now()));
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return label;
}

function useRollingNumber(value: number | null, reduced: boolean): number | null {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const first = useRef(true);

  useEffect(() => {
    if (value == null) {
      first.current = false;
      shownRef.current = null;
      setShown(null);
      return;
    }
    const from = shownRef.current;
    if (first.current || reduced || from == null || from === value) {
      first.current = false;
      shownRef.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      const eased = 1 - (1 - t) ** 3;
      const next = t === 1 ? value : from + (value - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return shown;
}

function useArrivalToasts(trades: readonly DemoTrade[] | null): {
  toasts: ToastCopy[];
  dismiss: (id: string) => void;
} {
  const seen = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<ToastCopy[]>([]);

  useEffect(() => {
    if (!trades) return;
    const previous = seen.current;
    seen.current = new Set(trades.map((trade) => trade.id));
    const fresh = arrivalsSince(previous, trades);
    if (fresh.length === 0) return;
    setToasts(toastsForArrivals(fresh));
  }, [trades]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = window.setTimeout(() => setToasts([]), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toasts]);

  return {
    toasts,
    dismiss: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
  };
}

function Glyph({ id }: { id: AgentId }) {
  if (id === 'strategie') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M2 12.5 6.2 8l2.3 2.2L14 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 3.5h4V7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'risiko') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M8 1.8 13.2 4v3.6c0 3.2-2.1 5.3-5.2 6.6C4.9 12.9 2.8 10.8 2.8 7.6V4L8 1.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 5.2v3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="10.6" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (id === 'ausfuehrung') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M3 8h10M9.2 4.2 13 8l-3.8 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path d="M8 2.2v11.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 3.2h4.6L11 6.2l1.6 3H8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IdleBars() {
  const heights = [14, 22, 16, 28, 18, 24, 12, 20];
  return (
    <div className="dash-idle" aria-hidden>
      {heights.map((height, index) => (
        <i key={index} style={{ height }} />
      ))}
    </div>
  );
}

function LineSpark({ values, tone, label, mini = false }: { values: number[]; tone: Tone; label: string; mini?: boolean }) {
  const w = 320;
  const h = mini ? 42 : 78;
  if (values.length < 2) return <div className="dash-spark-note">{label}</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * w;
    const y = 6 + (1 - (value - min) / span) * (h - 12);
    return [x, y] as const;
  });
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(' ');
  const last = coords[coords.length - 1] ?? [w, h / 2];
  const fill = `${line} L${w} ${h} L0 ${h} Z`;
  const color = tone === 'up' ? '#30d158' : tone === 'down' ? '#ff453a' : '#8e8e93';
  return (
    <svg className={mini ? 'dash-spark mini' : 'dash-spark'} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <path d={fill} fill={color} opacity="0.16" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={mini ? 3 : 4} fill={color} />
    </svg>
  );
}

function AgentCard({ agent }: { agent: AgentModel }) {
  return (
    <article className="dash-card" data-agent={agent.id}>
      <div className="dash-card-head">
        <span className="dash-glyph">
          <Glyph id={agent.id} />
        </span>
        <div>
          <strong>{agent.name}</strong>
          <em>{agent.subtitle}</em>
        </div>
        {agent.pill ? <span className="dash-pill">{agent.pill}</span> : null}
      </div>
      <p className="dash-latest">{agent.latest}</p>
      <p className="dash-note">{agent.note}</p>
      {agent.series.length >= 2 ? (
        <LineSpark values={agent.series} tone={agent.tone} label={`${agent.name}: Summe PnL`} mini />
      ) : (
        <IdleBars />
      )}
      <div className="dash-foot">
        <span className="dash-score">{agent.score}</span>
        <span className={`dash-pnl ${toneClass(agent.tone)}`}>
          {agent.pnl == null ? DASHBOARD_COPY.pnlMissing : plainSigned(agent.pnl)}
          <small>{agent.pnl == null ? 'PnL' : DASHBOARD_COPY.pnlCaption}</small>
        </span>
      </div>
    </article>
  );
}

function Toasts({ toasts, dismiss }: { toasts: ToastCopy[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="dash-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className="dash-toast"
          data-agent={toast.agent}
          aria-label={`${toast.title}. Hinweis schließen.`}
          onClick={() => dismiss(toast.id)}
        >
          <span className="dash-glyph" data-agent={toast.agent}>
            <Glyph id={toast.agent} />
          </span>
          <span className="dash-toast-copy">
            <small>{toast.kicker}</small>
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </span>
          {toast.amount ? <b className={toneClass(toast.tone)}>{toast.amount}</b> : <b>—</b>}
        </button>
      ))}
    </div>
  );
}

export function AgentDashboard({ onShowWorld }: { onShowWorld: () => void }) {
  const feed = useDemo();
  const view = classifyDemo(feed);
  const state = feed.state;
  const reduced = usePrefersReducedMotion();
  const clock = useBerlinClock();
  const board = state ? buildDashboard(state) : null;
  const shownEquity = useRollingNumber(state ? state.equity : null, reduced);
  const { toasts, dismiss } = useArrivalToasts(state ? state.trades : null);
  const shownChange =
    shownEquity != null && state
      ? {
          delta: shownEquity - state.startEquity,
          multiple: state.startEquity === 0 ? null : shownEquity / state.startEquity,
          pct: state.startEquity === 0 ? null : ((shownEquity - state.startEquity) / state.startEquity) * 100,
        }
      : null;
  const equityTone: Tone = board == null ? 'flat' : board.delta > 0 ? 'up' : board.delta < 0 ? 'down' : 'flat';
  const running = view.kind === 'running';
  const spot = multiplePosition(shownChange?.multiple ?? null);
  const startSpot = multiplePosition(1);

  let alert: string | null = null;
  if (view.kind === 'loading') alert = DEMO_COPY.loading;
  else if (view.kind === 'missing' || view.kind === 'starting') alert = DEMO_COPY.missing;
  else if (view.kind === 'paused') {
    alert =
      view.reason === 'stale'
        ? `${DEMO_COPY.paused}. Letztes Update ist älter als 30 Minuten.`
        : `${DEMO_COPY.paused}. Die Simulation meldet eine Pause.`;
  } else if (view.kind === 'stopped') alert = DEMO_COPY.stopped;

  return (
    <div className="dash">
      <Toasts toasts={toasts} dismiss={dismiss} />
      <div className="dash-wrap">
        <div className="dash-status">
          <time className="dash-clock" dateTime={new Date().toISOString()}>
            {clock}
          </time>
          <span className={`dash-island ${toneClass(equityTone)}`}>
            <i />
            {shownChange?.multiple == null ? '—' : formatMultiple(shownChange.multiple)}
          </span>
          <button type="button" className="dash-welt" onClick={onShowWorld} aria-label="3D-Welt">
            Welt
          </button>
        </div>

        <header className="dash-brand">
          <img className="dash-logo" src={LOGO} alt="" />
          <div className="dash-brand-text">
            <h1>Trading-Welt</h1>
            <p>Papierkonto · {board ? `${board.agents.length} Rollen` : 'virtuell'}</p>
          </div>
          <span className={running ? 'dash-paper is-running' : 'dash-paper'}>
            <i />
            {DASHBOARD_COPY.paper}
          </span>
        </header>

        <p className="dash-banner">{DEMO_COPY.virtual}</p>
        {alert ? <p className="dash-alert">{alert}</p> : null}
        {state && running ? <p className="dash-stand">Läuft · Stand {formatBerlinStamp(state.updatedUtc)}.</p> : null}
        {state && view.kind !== 'running' && view.kind !== 'loading' && view.kind !== 'missing' ? (
          <p className="dash-note">Stand {formatBerlinStamp(state.updatedUtc)}.</p>
        ) : null}

        {state && state.coins.length > 0 ? (
          <ul className="dash-coins" aria-label="Münzen im Papierkonto">
            {state.coins.map((coin) => (
              <li key={coin}>{coin}</li>
            ))}
          </ul>
        ) : null}

        {state && board && shownEquity != null && shownChange ? (
          <div className="dash-body">
            <section className="dash-equity-block" aria-label="Kontostand">
              <div className="dash-kicker-row">
                <span>Kontostand · Start {formatMoney(state.startEquity)} virtuell</span>
                <span className={`dash-multiple ${toneClass(equityTone)}`}>
                  {shownChange.multiple == null ? '—' : formatMultiple(shownChange.multiple)}
                </span>
              </div>
              <p className="dash-equity">{formatMoney(shownEquity, false)}</p>
              <p className="dash-unit">virtuelle USD</p>
              <p className={`dash-delta ${toneClass(equityTone)}`}>
                {formatSignedMoney(shownChange.delta)}
                {shownChange.pct == null ? '' : ` (${formatPct(shownChange.pct)})`}
                <span> · virtuell</span>
              </p>
              <LineSpark
                values={board.series}
                tone={equityTone}
                label={board.series.length < 2 ? 'Keine Kontokurve' : `Kontokurve, ${state.equityCurve.length} Punkte`}
              />
              {board.series.length >= 2 && !board.curveIncludesStart ? (
                <p className="dash-spark-note">Der Startwert liegt außerhalb der gelieferten Kurve.</p>
              ) : null}
              <div className="dash-metrics">
                <div>
                  <span>Realisiert</span>
                  <b className={toneClass(state.realizedPnl > 0 ? 'up' : state.realizedPnl < 0 ? 'down' : 'flat')}>
                    {formatSignedMoney(state.realizedPnl)}
                  </b>
                </div>
                <div>
                  <span>Offen</span>
                  <b className={toneClass(state.unrealizedPnl > 0 ? 'up' : state.unrealizedPnl < 0 ? 'down' : 'flat')}>
                    {formatSignedMoney(state.unrealizedPnl)}
                  </b>
                </div>
                <div>
                  <span>Gebühren</span>
                  <b>{formatMoney(state.feesPaid)}</b>
                </div>
              </div>
            </section>

            <div className="dash-cards">
              {board.agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>

            <section className="dash-log" aria-label="Aktivität">
              <header>
                <h2>Aktivität</h2>
                <span>{board.exitScore} · virtuell</span>
              </header>
              {board.activity.length === 0 ? <p className="dash-empty">Noch keine Ereignisse</p> : null}
              <ul>
                {board.activity.map((line) => (
                  <li key={line.id} data-agent={line.agent}>
                    <i className="dash-dot" />
                    <div className="dash-what">
                      <time dateTime={line.timeUtc}>{formatBerlinShort(Date.parse(line.timeUtc))}</time>
                      <strong>{line.title}</strong>
                      <span>{line.detail}</span>
                    </div>
                    <b className={line.pnl == null ? 'dash-amt' : `dash-amt ${toneClass(line.pnl > 0 ? 'up' : line.pnl < 0 ? 'down' : 'flat')}`}>
                      {line.pnl == null ? '—' : formatSignedMoney(line.pnl)}
                    </b>
                  </li>
                ))}
              </ul>
            </section>

            <section className="dash-scale" aria-label="Vielfaches vom Start">
              <header>
                <h2>Vielfaches vom Start</h2>
                <span>{DASHBOARD_COPY.goal}</span>
              </header>
              <div className="dash-track">
                {startSpot != null ? <i className="dash-start" style={{ left: `${startSpot * 100}%` }} title="Start 1×" /> : null}
                {spot != null ? <i className={`dash-now ${toneClass(equityTone)}`} style={{ left: `${spot * 100}%` }} /> : null}
              </div>
              <div className="dash-marks">
                {MULTIPLE_SCALE.map((mark) => (
                  <span key={mark}>{formatScaleMark(mark)}</span>
                ))}
              </div>
              <p>
                Stand {board.multiple == null ? '—' : formatMultiple(board.multiple)}. {DASHBOARD_COPY.goalHint}
              </p>
            </section>
          </div>
        ) : null}

        <p className="dash-foot-note">
          Papierkonto · keine echten Orders
          {state ? ` · Hebel-Limit ${formatSize(state.maxLeverage)}×` : ''}
        </p>
      </div>
    </div>
  );
}
