import { useEffect, useRef, useState } from 'react';
import { formatBerlinHour, formatBerlinShort, formatPx, formatUsd } from '../data/format';
import { useMarket } from '../data/store';
import type { Candle } from '../data/types';
import { CoinSwitch } from './CoinSwitch';

function drawChart(
  canvas: HTMLCanvasElement,
  candles: Candle[],
  showVolume: boolean,
  hover: number | null,
) {
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
  if (candles.length === 0) return;

  const padL = 8;
  const padR = 58;
  const padT = 10;
  const padB = 18;
  const volH = showVolume ? Math.max(36, height * 0.22) : 0;
  const plotH = height - padT - padB - volH;
  const plotW = width - padL - padR;
  let lo = Math.min(...candles.map((candle) => candle.l));
  let hi = Math.max(...candles.map((candle) => candle.h));
  const span = hi - lo || Math.abs(hi) * 0.01 || 1;
  lo -= span * 0.08;
  hi += span * 0.08;
  const slot = plotW / candles.length;
  const xAt = (index: number) => padL + slot * index + slot / 2;
  const yAt = (price: number) => padT + ((hi - price) / (hi - lo)) * plotH;

  ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 3; i += 1) {
    const price = lo + ((hi - lo) * (3 - i)) / 3;
    const y = yAt(price);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR + 2, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(226, 232, 244, 0.72)';
    ctx.fillText(formatPx(price), width - padR + 6, y);
  }

  candles.forEach((candle, index) => {
    const x = xAt(index);
    const up = candle.c >= candle.o;
    const color = up ? '#3ee0a2' : '#ff5c7a';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, yAt(candle.h));
    ctx.lineTo(x, yAt(candle.l));
    ctx.stroke();
    const top = Math.min(yAt(candle.o), yAt(candle.c));
    const body = Math.max(1.2, Math.abs(yAt(candle.c) - yAt(candle.o)));
    const bw = Math.max(2, slot * 0.62);
    ctx.globalAlpha = hover === index ? 1 : 0.92;
    ctx.fillRect(x - bw / 2, top, bw, body);
    ctx.globalAlpha = 1;
  });

  if (showVolume) {
    const maxV = Math.max(...candles.map((candle) => candle.vUsd), 1);
    const base = height - padB;
    candles.forEach((candle, index) => {
      const x = xAt(index);
      const bh = (candle.vUsd / maxV) * (volH - 8);
      const bw = Math.max(2, slot * 0.62);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = candle.c >= candle.o ? '#3ee0a2' : '#ff5c7a';
      ctx.fillRect(x - bw / 2, base - bh, bw, bh);
      ctx.globalAlpha = 1;
    });
  }

  ctx.fillStyle = 'rgba(198, 208, 224, 0.7)';
  ctx.textBaseline = 'bottom';
  const marks = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
  marks.forEach((index, nth) => {
    const candle = candles[index];
    if (!candle) return;
    ctx.textAlign = nth === 0 ? 'left' : nth === marks.length - 1 ? 'right' : 'center';
    const x = nth === marks.length - 1 ? xAt(index) : xAt(index);
    ctx.fillText(formatBerlinHour(candle.t), x, height - 1);
  });

  if (hover != null && candles[hover]) {
    const x = xAt(hover);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function ChartPanel() {
  const selected = useMarket((state) => state.selected);
  const candles = useMarket((state) => state.candles[state.selected]);
  const error = useMarket((state) => state.candleError[state.selected]);
  const [volume, setVolume] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setHover(null);
  }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (candles) drawChart(canvas, candles, volume, hover);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };
    schedule();
    void document.fonts.ready.then(schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [candles, volume, hover]);

  const pick = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !candles?.length) return;
    const rect = canvas.getBoundingClientRect();
    const padL = 8;
    const padR = 58;
    const plotW = rect.width - padL - padR;
    const slot = plotW / candles.length;
    const index = Math.floor((clientX - rect.left - padL) / slot);
    setHover(Math.max(0, Math.min(candles.length - 1, index)));
  };

  const active = hover != null ? candles?.[hover] : undefined;

  return (
    <div className="chart-panel">
      <div className="pane-head">
        <p className="pane-kicker">24h · 1h-Kerzen</p>
        <button
          type="button"
          className={`vol-toggle${volume ? ' on' : ''}`}
          aria-pressed={volume}
          onClick={() => setVolume((value) => !value)}
        >
          Volumen
        </button>
      </div>
      <CoinSwitch />
      <div className="chart-frame">
        <canvas
          ref={canvasRef}
          className="chart-canvas"
          onPointerDown={(event) => pick(event.clientX)}
          onPointerMove={(event) => {
            if (event.pointerType === 'touch' || event.buttons) pick(event.clientX);
          }}
          onPointerLeave={() => setHover(null)}
        />
        {!candles && <p className="chart-empty">{error ? 'Keine Kerzen' : 'Kerzen werden geladen…'}</p>}
        {candles && candles.length === 0 ? <p className="chart-empty">Keine Kerzen</p> : null}
      </div>
      {active ? (
        <dl className="ohlc">
          <div>
            <dt>Zeit</dt>
            <dd>{formatBerlinShort(active.t)}</dd>
          </div>
          <div>
            <dt>Eröffnung</dt>
            <dd>{formatPx(active.o)}</dd>
          </div>
          <div>
            <dt>Hoch</dt>
            <dd>{formatPx(active.h)}</dd>
          </div>
          <div>
            <dt>Tief</dt>
            <dd>{formatPx(active.l)}</dd>
          </div>
          <div>
            <dt>Schluss</dt>
            <dd>{formatPx(active.c)}</dd>
          </div>
          <div>
            <dt>Volumen</dt>
            <dd>{formatUsd(active.vUsd)}</dd>
          </div>
        </dl>
      ) : (
        <p className="chart-hint">Tippen zeigt Eröffnung, Hoch, Tief, Schluss.</p>
      )}
    </div>
  );
}
