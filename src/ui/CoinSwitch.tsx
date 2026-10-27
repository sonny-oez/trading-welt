import { selectCoin, useMarket } from '../data/store';
import { COINS } from '../data/types';

export function CoinSwitch() {
  const selected = useMarket((state) => state.selected);
  return (
    <div className="chips" role="group" aria-label="Coin wählen">
      {COINS.map((coin) => (
        <button
          key={coin}
          type="button"
          className={selected === coin ? 'on' : ''}
          aria-pressed={selected === coin}
          onClick={() => selectCoin(coin)}
        >
          {coin}
        </button>
      ))}
    </div>
  );
}
