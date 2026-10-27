export const COINS = ['BTC', 'ETH', 'SOL', 'HYPE'] as const;
export type Coin = (typeof COINS)[number];

export interface Asset {
  coin: Coin;
  mark: number;
  mid: number;
  prevDay: number;
  changePct: number | null;
  fundingHourly: number;
  fundingAnnPct: number;
  oiBase: number;
  oiUsd: number;
  volumeUsd: number;
}

export interface Level {
  px: number;
  sz: number;
  n: number;
  notional: number;
}

export interface Book {
  coin: Coin;
  bids: Level[];
  asks: Level[];
  time: number;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  vBase: number;
  vUsd: number;
}

export interface BotProfile {
  station: string;
  name: string;
  role: string;
  description: string;
  status: string;
}

export interface SafetyFlags {
  tradingEnabled: boolean;
  riskLimitsSet: boolean;
  apiWalletConnected: boolean;
  openOrders: boolean;
}

export interface DeskStatus {
  mode: string;
  headline: string;
  bots: BotProfile[];
  safety: SafetyFlags;
}

export type LinkStatus = 'loading' | 'live' | 'offline';

export interface MarketState {
  assets: Partial<Record<Coin, Asset>>;
  book: Book | null;
  candles: Partial<Record<Coin, Candle[]>>;
  candleError: Partial<Record<Coin, boolean>>;
  selected: Coin;
  updatedAt: number | null;
  status: LinkStatus;
  wsConnected: boolean;
  notice: string | null;
}
