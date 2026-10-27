import { formatPct, formatPx } from '../data/format';
import { useDesk, useMarket } from '../data/store';
import { COINS } from '../data/types';
import type { Look } from './lighting';
import { STATIONS, floorPercent } from './layout';

export function FallbackFloor({ look }: { look: Look }) {
  const assets = useMarket((state) => state.assets);
  const bots = useDesk().bots;
  const byStation = new Map(bots.map((bot) => [bot.station, bot]));

  return (
    <div className="fallback" style={{ background: look.cssBg }}>
      <div className="fb-screen" aria-hidden>
        <header>
          <strong>Trading-Welt</strong>
          <span>Öffentlicher Markt</span>
        </header>
        <div className="fb-quotes">
          {COINS.map((coin) => {
            const asset = assets[coin];
            const up = (asset?.changePct ?? 0) >= 0;
            return (
              <div key={coin}>
                <b>{coin}</b>
                <em>{asset ? formatPx(asset.mid) : '…'}</em>
                <small className={up ? 'up' : 'down'}>
                  {asset?.changePct == null ? '—' : formatPct(asset.changePct)}
                </small>
              </div>
            );
          })}
        </div>
      </div>
      <div className="fb-floor">
        {STATIONS.map((station) => {
          const bot = byStation.get(station.station);
          if (!bot) return null;
          const pos = floorPercent(station.position);
          return (
            <div key={station.station} className="fb-bot" style={{ left: pos.left, top: pos.top }}>
              <span className="fb-figure" style={{ background: station.color }} />
              <span>{bot.name}</span>
            </div>
          );
        })}
      </div>
      <p className="fb-note">3D nicht verfügbar — flache Ansicht</p>
    </div>
  );
}
