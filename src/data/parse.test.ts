import assert from 'node:assert/strict';
import { annualizedFundingPct, changePct, parseBook, parseCandles, parseMeta } from './parse.ts';

assert.ok(Math.abs(annualizedFundingPct(0.0000125) - 10.95) < 1e-9);
assert.equal(changePct(110, 100), 10);
assert.equal(changePct(40, 50), -20);
assert.equal(changePct(1, 0), null);

const meta = parseMeta([
  { universe: [{ name: 'BTC' }, { name: 'DOGE' }, { name: 'ETH' }] },
  [
    {
      funding: '0.0000125',
      openInterest: '2',
      prevDayPx: '100',
      dayNtlVlm: '5000',
      markPx: '110',
      midPx: '110.5',
    },
    {
      funding: '0',
      openInterest: '1',
      prevDayPx: '1',
      dayNtlVlm: '1',
      markPx: '1',
      midPx: '1',
    },
    {
      funding: '-0.0001',
      openInterest: '4',
      prevDayPx: '50',
      dayNtlVlm: '20',
      markPx: '40',
      midPx: null,
    },
  ],
]);

assert.equal(meta.BTC?.mark, 110);
assert.equal(meta.BTC?.mid, 110.5);
assert.equal(meta.BTC?.oiUsd, 220);
assert.ok(Math.abs((meta.BTC?.fundingAnnPct ?? 0) - 10.95) < 1e-9);
assert.equal(meta.BTC?.changePct, 10);
assert.ok(Math.abs((meta.ETH?.fundingAnnPct ?? 0) + 87.6) < 1e-9);
assert.equal(meta.ETH?.mid, 40);
assert.equal(meta.DOGE, undefined);

const bids = Array.from({ length: 13 }, (_, i) => ({ px: String(100 - i), sz: '1', n: 1 }));
const asks = [{ px: '101', sz: '2', n: 1 }, { px: '99', sz: '1', n: 1 }];
const book = parseBook({ coin: 'BTC', time: 5, levels: [bids, asks] }, 'BTC');
assert.ok(book);
assert.equal(book.bids.length, 12);
assert.equal(book.bids[0]?.px, 100);
assert.equal(book.asks[0]?.px, 99);
assert.equal(parseBook({ coin: 'ETH', levels: [bids, asks] }, 'BTC'), null);

const candles = parseCandles([
  { t: 2, o: '2', h: '3', l: '1', c: '2.5', v: '4' },
  { t: 1, o: '1', h: '2', l: '1', c: '1.5', v: '2' },
]);
assert.equal(candles[0]?.t, 1);
assert.equal(candles[1]?.vUsd, 10);

console.log('parse ok');
