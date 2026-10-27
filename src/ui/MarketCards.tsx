import { formatFunding, formatPct, formatPx, formatUsd } from '../data/format';
import { selectCoin, useMarket } from '../data/store';
import { COINS, type Asset } from '../data/types';

function Card({
  coin,
  asset,
  selected,
}: {
  coin: Asset['coin'];
  asset: Asset | undefined;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      className={`mcard${selected ? ' on' : ''}`}
      onClick={() => selectCoin(coin)}
      aria-pressed={selected}
    >
      <div className="mhead">
        <span className="sym">{coin}</span>
        <span className={(asset?.changePct ?? 0) >= 0 ? 'up' : 'down'}>
          {asset?.changePct == null ? '—' : formatPct(asset.changePct)}
        </span>
      </div>
      {asset ? (
        <>
          <div className="mpx">{formatPx(asset.mark)}</div>
          <div className="msub">Mark · 24h</div>
          <dl>
            <div>
              <dt>Funding p.a.</dt>
              <dd>{formatFunding(asset.fundingAnnPct)}</dd>
            </div>
            <div>
              <dt>Open Interest</dt>
              <dd>{formatUsd(asset.oiUsd)}</dd>
            </div>
            <div>
              <dt>Volumen 24h</dt>
              <dd>{formatUsd(asset.volumeUsd)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="empty">Keine Daten</p>
      )}
    </button>
  );
}

export function MarketCards() {
  const assets = useMarket((state) => state.assets);
  const selected = useMarket((state) => state.selected);
  const known = COINS.some((coin) => assets[coin]);
  return (
    <div className="market-wrap">
      <p className="pane-kicker">Markt · Mark-Preis aus öffentlichen Daten</p>
      {known ? (
        <div className="mcards">
          {COINS.map((coin) => (
            <Card key={coin} coin={coin} asset={assets[coin]} selected={selected === coin} />
          ))}
        </div>
      ) : (
        <div className="mcards">
          {COINS.map((coin) => (
            <div key={coin} className="mcard ghost">
              <div className="mhead">
                <span className="sym">{coin}</span>
              </div>
              <div className="skel" />
              <div className="skel short" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
