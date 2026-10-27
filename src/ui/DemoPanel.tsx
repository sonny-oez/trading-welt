import { useEffect, useRef } from 'react';
import { classifyDemo, DEMO_COPY, type DemoState, type EquityPoint } from '../data/demo';
import { useDemo } from '../data/demoFeed';
import { formatBerlinStamp, formatMoney, formatPct, formatPx, formatSignedMoney, formatSize } from '../data/format';

function tone(value: number): string {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return '';
}

function EquityChart({ points, start }: { points: EquityPoint[]; start: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 10 || height < 10) return;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const series = points.length > 0 ? points : [{ t: '', equity: start }];
      const padL = 8;
      const padR = 56;
      const padT = 12;
      const padB = 10;
      const values = series.map((point) => point.equity);
      let lo = Math.min(...values, start);
      let hi = Math.max(...values, start);
      const span = hi - lo || Math.max(Math.abs(start) * 0.01, 1);
      lo -= span * 0.2;
      hi += span * 0.2;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;
      const yAt = (value: number) => padT + ((hi - value) / (hi - lo)) * plotH;
      const xAt = (index: number) =>
        series.length <= 1 ? padL + plotW / 2 : padL + (plotW * index) / (series.length - 1);

      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yAt(start));
      ctx.lineTo(padL + plotW, yAt(start));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      series.forEach((point, index) => {
        const x = xAt(index);
        const y = yAt(point.equity);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#e7c36a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(xAt(series.length - 1), padT + plotH);
      ctx.lineTo(xAt(0), padT + plotH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(231, 195, 106, 0.16)';
      ctx.fill();

      ctx.fillStyle = '#e7c36a';
      series.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(xAt(index), yAt(point.equity), 2.4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = 'rgba(226, 232, 244, 0.82)';
      ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatMoney(hi, false), width - padR + 6, yAt(hi));
      ctx.fillText(formatMoney(start, false), width - padR + 6, yAt(start));
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [points, start]);

  return <canvas ref={ref} className="equity-canvas" aria-label="Equity-Kurve" />;
}

function Metrics({ state }: { state: DemoState }) {
  const delta = state.equity - state.startEquity;
  const pct = state.startEquity !== 0 ? (delta / state.startEquity) * 100 : null;
  return (
    <>
      <p className="demo-equity">{formatMoney(state.equity)}</p>
      <p className={`demo-delta ${tone(delta)}`}>
        {formatSignedMoney(delta)}
        {pct == null ? '' : ` · ${formatPct(pct)}`}
        <span> gegen {formatMoney(state.startEquity)} Start</span>
      </p>
      <div className="demo-grid">
        <div>
          <span>Realisiert</span>
          <b className={tone(state.realizedPnl)}>{formatSignedMoney(state.realizedPnl)}</b>
        </div>
        <div>
          <span>Offen</span>
          <b className={tone(state.unrealizedPnl)}>{formatSignedMoney(state.unrealizedPnl)}</b>
        </div>
        <div>
          <span>Gebühren</span>
          <b>{formatMoney(state.feesPaid)}</b>
        </div>
        <div>
          <span>Cash</span>
          <b>{formatMoney(state.cash)}</b>
        </div>
      </div>
      <p className="demo-cap">Hebel-Limit {formatSize(state.maxLeverage)}×</p>
    </>
  );
}

function Positions({ state }: { state: DemoState }) {
  return (
    <section>
      <h3>Offene Positionen</h3>
      {state.positions.length === 0 ? <p className="empty">Keine offenen Positionen</p> : null}
      <ul className="demo-list">
        {state.positions.map((position) => (
          <li key={`${position.coin}-${position.openedUtc}`}>
            <div className="demo-line">
              <strong>{position.coin}</strong>
              <em className={position.side === 'long' ? 'up' : 'down'}>
                {position.side === 'long' ? 'Long' : 'Short'}
              </em>
            </div>
            <dl>
              <div>
                <dt>Größe</dt>
                <dd>{formatSize(position.size)}</dd>
              </div>
              <div>
                <dt>Einstieg</dt>
                <dd>{formatPx(position.entry)}</dd>
              </div>
              <div>
                <dt>Mark</dt>
                <dd>{formatPx(position.mark)}</dd>
              </div>
              <div>
                <dt>Hebel</dt>
                <dd>{formatSize(position.leverage)}×</dd>
              </div>
              <div>
                <dt>Stop</dt>
                <dd>{position.stop == null ? '—' : formatPx(position.stop)}</dd>
              </div>
              <div>
                <dt>Ziel</dt>
                <dd>{position.takeProfit == null ? '—' : formatPx(position.takeProfit)}</dd>
              </div>
              <div>
                <dt>Offen</dt>
                <dd className={tone(position.unrealizedPnl)}>{formatSignedMoney(position.unrealizedPnl)}</dd>
              </div>
              <div>
                <dt>Seit</dt>
                <dd>{formatBerlinStamp(position.openedUtc)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trades({ state }: { state: DemoState }) {
  return (
    <section>
      <h3>Trades</h3>
      {state.trades.length === 0 ? <p className="empty">Noch keine Trades</p> : null}
      <ul className="demo-list">
        {state.trades.map((trade) => (
          <li key={trade.id}>
            <div className="demo-line">
              <strong>
                {trade.coin} · {trade.side === 'buy' ? 'Kauf' : 'Verkauf'} ·{' '}
                {trade.action === 'open' ? 'Öffnen' : 'Schließen'}
              </strong>
            </div>
            <p className="demo-time">{formatBerlinStamp(trade.timeUtc)}</p>
            <dl>
              <div>
                <dt>Preis</dt>
                <dd>{formatPx(trade.price)}</dd>
              </div>
              <div>
                <dt>Größe</dt>
                <dd>{formatSize(trade.size)}</dd>
              </div>
              <div>
                <dt>Nominal</dt>
                <dd>{formatMoney(trade.notional)}</dd>
              </div>
              <div>
                <dt>Gebühr</dt>
                <dd>{formatMoney(trade.fee)}</dd>
              </div>
              <div>
                <dt>PnL</dt>
                <dd className={trade.pnl == null ? '' : tone(trade.pnl)}>
                  {trade.pnl == null ? '—' : formatSignedMoney(trade.pnl)}
                </dd>
              </div>
              <div>
                <dt>Bot</dt>
                <dd>{trade.bot || '—'}</dd>
              </div>
            </dl>
            {trade.reason ? <p className="demo-reason">{trade.reason}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DemoPanel() {
  const snapshot = useDemo();
  const view = classifyDemo(snapshot);
  const state = snapshot.state;

  return (
    <div className="demo">
      <p className="virtual-banner">{DEMO_COPY.virtual}</p>
      {view.kind === 'loading' ? <p className="empty">{DEMO_COPY.loading}</p> : null}
      {view.kind === 'missing' ? (
        <>
          <h2>{DEMO_COPY.missing}</h2>
          <p className="demo-note">
            Die Simulation veröffentlicht den virtuellen Kontostand, sobald sie läuft. Es wird kein echtes Geld
            bewegt.
          </p>
        </>
      ) : null}
      {state && view.kind !== 'missing' ? (
        <>
          {view.kind === 'paused' ? (
            <>
              <h2>{DEMO_COPY.paused}</h2>
              <p className="demo-note">
                {view.reason === 'stale'
                  ? 'Letztes Update ist älter als 30 Minuten.'
                  : 'Die Simulation meldet eine Pause.'}{' '}
                Stand {formatBerlinStamp(state.updatedUtc)}.
              </p>
            </>
          ) : null}
          {view.kind === 'stopped' ? (
            <>
              <h2>{DEMO_COPY.stopped}</h2>
              <p className="demo-note">Die letzten virtuellen Zahlen bleiben sichtbar.</p>
            </>
          ) : null}
          {view.kind === 'starting' ? (
            <>
              <h2>{DEMO_COPY.missing}</h2>
              <p className="demo-note">Stand {formatBerlinStamp(state.updatedUtc)}.</p>
            </>
          ) : null}
          {view.kind === 'running' ? (
            <p className="demo-note">Läuft · Stand {formatBerlinStamp(state.updatedUtc)}.</p>
          ) : null}
          <Metrics state={state} />
          {state.note ? <p className="demo-note">{state.note}</p> : null}
          <Positions state={state} />
          <section>
            <h3>Kontostand</h3>
            <EquityChart points={state.equityCurve} start={state.startEquity} />
          </section>
          <Trades state={state} />
        </>
      ) : null}
    </div>
  );
}
