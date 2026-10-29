import { formatBerlin, formatPct, formatPx } from '../data/format';
import { refreshNow } from '../data/engine';
import { useMarket } from '../data/store';
import { COINS } from '../data/types';
import { useBerlinAtmosphere } from '../hooks';
import { LiveMark } from './LiveStatus';

function QuoteRun({ copy }: { copy: string }) {
  const assets = useMarket((state) => state.assets);
  const items = COINS.map((coin) => {
    const asset = assets[coin];
    if (!asset) return { coin, price: '…', change: '—', up: true };
    return {
      coin,
      price: formatPx(asset.mark),
      change: asset.changePct == null ? '—' : formatPct(asset.changePct),
      up: (asset.changePct ?? 0) >= 0,
    };
  });
  return (
    <div className="ticker-run" aria-hidden={copy === 'b'}>
      <span className="research-pill">Öffentliche Kurse</span>
      {items.map((item) => (
        <span key={`${copy}-${item.coin}`} className="tick">
          <b>{item.coin}</b>
          <span>{item.price}</span>
          <em className={item.up ? 'up' : 'down'}>{item.change}</em>
        </span>
      ))}
    </div>
  );
}

export function TopBar() {
  const status = useMarket((state) => state.status);
  const updatedAt = useMarket((state) => state.updatedAt);
  const notice = useMarket((state) => state.notice);
  const atmo = useBerlinAtmosphere();
  const live = status === 'live';
  const label = status === 'loading' ? 'Verbinde…' : live ? 'Kurse' : 'Offline';

  return (
    <header className="topbar">
      <div className="top-row">
        <div className="brand">
          <h1>Trading-Welt</h1>
          <span className="phase">{atmo.label}</span>
        </div>
        <div className="livebox">
          {status !== 'live' ? (
            <button type="button" className="retry" onClick={() => refreshNow()}>
              Erneut
            </button>
          ) : null}
          <span className={`badge ${live ? 'live' : status}`}>
            <i className="dot" />
            {label}
          </span>
        </div>
      </div>
      <div className="ticker" aria-label="Marktkurse">
        <div className="ticker-track">
          <QuoteRun copy="a" />
          <QuoteRun copy="b" />
        </div>
      </div>
      <p className="stand">
        <LiveMark />
        <span className="stand-meta">
          <span>Stand {updatedAt ? formatBerlin(updatedAt) : '—'}</span>
          <span className="stand-note">{notice ?? 'Nur Lesen'}</span>
        </span>
      </p>
    </header>
  );
}
