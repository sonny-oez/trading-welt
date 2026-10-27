import { useSyncExternalStore } from 'react';
import { DEFAULT_DESK } from './desk';
import type { Coin, DeskStatus, MarketState } from './types';

const initialMarket: MarketState = {
  assets: {},
  book: null,
  candles: {},
  candleError: {},
  selected: 'BTC',
  updatedAt: null,
  status: 'loading',
  wsConnected: false,
  notice: null,
};

let market = initialMarket;
const marketListeners = new Set<() => void>();

export function getMarket(): MarketState {
  return market;
}

export function setMarket(patch: Partial<MarketState> | ((state: MarketState) => MarketState)): void {
  const next = typeof patch === 'function' ? patch(market) : { ...market, ...patch };
  if (next === market) return;
  market = next;
  marketListeners.forEach((listener) => listener());
}

export function subscribeMarket(listener: () => void): () => void {
  marketListeners.add(listener);
  return () => marketListeners.delete(listener);
}

export function useMarket<T>(select: (state: MarketState) => T): T {
  return useSyncExternalStore(
    subscribeMarket,
    () => select(market),
    () => select(market),
  );
}

export function selectCoin(coin: Coin): void {
  if (market.selected === coin) return;
  setMarket({
    selected: coin,
    book: market.book?.coin === coin ? market.book : null,
  });
}

let desk = DEFAULT_DESK;
const deskListeners = new Set<() => void>();

export function setDesk(next: DeskStatus): void {
  desk = next;
  deskListeners.forEach((listener) => listener());
}

export function subscribeDesk(listener: () => void): () => void {
  deskListeners.add(listener);
  return () => deskListeners.delete(listener);
}

export function useDesk(): DeskStatus {
  return useSyncExternalStore(subscribeDesk, () => desk, () => desk);
}
