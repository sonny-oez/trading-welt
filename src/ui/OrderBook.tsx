import { formatPx, formatSize, formatUsd } from '../data/format';
import { useMarket } from '../data/store';
import type { Level } from '../data/types';
import { CoinSwitch } from './CoinSwitch';

function Row({ level, max, side }: { level: Level; max: number; side: 'bid' | 'ask' }) {
  const width = Math.max(6, Math.min(100, (level.notional / max) * 100));
  return (
    <div className={`lvl ${side}`}>
      <span className="heat" style={{ width: `${width}%` }} />
      <span>{formatPx(level.px)}</span>
      <span>{formatSize(level.sz)}</span>
      <span>{formatUsd(level.notional)}</span>
    </div>
  );
}

export function OrderBook() {
  const book = useMarket((state) => state.book);
  const selected = useMarket((state) => state.selected);
  const status = useMarket((state) => state.status);
  const ready = book && book.coin === selected ? book : null;
  const max = ready
    ? Math.max(1, ...ready.bids.map((level) => level.notional), ...ready.asks.map((level) => level.notional))
    : 1;
  const bestBid = ready?.bids[0]?.px;
  const bestAsk = ready?.asks[0]?.px;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const bps = spread != null && bestAsk ? (spread / bestAsk) * 10_000 : null;

  return (
    <div className="book-panel">
      <p className="pane-kicker">Orderbuch · Top 12 · Tiefe in USD</p>
      <CoinSwitch />
      {ready ? (
        <>
          <div className="lvl head">
            <span />
            <span>Preis</span>
            <span>Größe</span>
            <span>USD</span>
          </div>
          <div className="book">
            {[...ready.asks].reverse().map((level) => (
              <Row key={`a-${level.px}`} level={level} max={max} side="ask" />
            ))}
            <div className="spread">
              Spread {spread == null ? '—' : formatPx(spread)}
              {bps == null ? '' : ` · ${bps.toLocaleString('de-DE', { maximumFractionDigits: 2 })} bp`}
            </div>
            {ready.bids.map((level) => (
              <Row key={`b-${level.px}`} level={level} max={max} side="bid" />
            ))}
          </div>
        </>
      ) : (
        <p className="empty">{status === 'offline' ? 'Orderbuch nicht verfügbar' : 'Orderbuch wird geladen…'}</p>
      )}
    </div>
  );
}
