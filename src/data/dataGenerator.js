/** Synthetic universe generator with sector-aware price dynamics */

import { HISTORY_DAYS, MIN_HISTORY_BARS } from '../config/constants.js';
import { getMarketConfig } from '../config/markets.js';
import { getReferencePrice } from '../config/referencePrices.js';
import { SECTORS } from '../config/sectors.js';
import { getSectorForTicker } from '../config/tickerSectors.js';
import { buildUniqueTickerList } from '../config/universeTickers.js';
import { round2 } from '../utils/math.js';
import { createRNG, gaussianRandom, tickerSeed } from '../utils/rng.js';

/**
 * Scale OHLCV history proportionally so the final close lands on targetPrice.
 * @param {import('../types.js').OHLCVBar[]} history
 * @param {number} targetPrice
 */
function scaleHistoryToTarget(history, targetPrice) {
  const lastClose = history[history.length - 1]?.close;
  if (!lastClose || lastClose <= 0) return;

  const scale = targetPrice / lastClose;
  for (const bar of history) {
    bar.open = round2(bar.open * scale);
    bar.close = round2(bar.close * scale);
    bar.high = round2(Math.max(bar.high * scale, bar.open, bar.close));
    bar.low = round2(Math.min(bar.low * scale, bar.open, bar.close));
  }
}

/**
 * @param {number} [count=500]
 * @param {string} [marketId='US']
 * @returns {import('../types.js').Stock[]}
 */
export function generateSyntheticUniverse(count = 500, marketId = 'US') {
  if (HISTORY_DAYS < MIN_HISTORY_BARS) {
    console.warn(
      `HISTORY_DAYS (${HISTORY_DAYS}) is below MIN_HISTORY_BARS (${MIN_HISTORY_BARS}); MA Crossover will fail.`
    );
  }

  const marketConfig = getMarketConfig(marketId);
  const priceScale = marketConfig.syntheticPriceMultiplier ?? 1;

  const stocks = [];
  const tickers = buildUniqueTickerList(count, marketId);

  for (let i = 0; i < count; i++) {
    const ticker = tickers[i];
    const sectorKey = getSectorForTicker(ticker, i, marketId);
    const sector = SECTORS[sectorKey];
    const rng = createRNG(tickerSeed(ticker, i));

    const referencePrice = getReferencePrice(ticker);
    const [pMin, pMax] = sector.basePrice;
    const scaledMin = pMin * priceScale;
    const scaledMax = pMax * priceScale;
    let anchorPrice = referencePrice != null
      ? referencePrice * priceScale
      : scaledMin + rng() * (scaledMax - scaledMin);
    const meanRevStrength = referencePrice != null ? 0.5 : sector.meanRev;
    let currentPrice = anchorPrice;
    let rollingVol = referencePrice != null ? sector.baseVol * 0.25 : sector.baseVol;

    const history = [];

    for (let d = 0; d < HISTORY_DAYS; d++) {
      const deviation = (currentPrice - anchorPrice) / anchorPrice;
      const meanRevForce = -deviation * meanRevStrength;
      const marketShock = gaussianRandom(rng) * rollingVol * sector.beta;

      const dailyReturn = meanRevForce + marketShock;
      const open = currentPrice;
      const close = Math.max(0.5, open * (1 + dailyReturn));

      rollingVol = 0.94 * rollingVol + 0.06 * Math.abs(dailyReturn);

      const intradayRange = rollingVol * open * (0.5 + rng() * 1.5);
      const high = Math.max(open, close) + intradayRange * rng();
      const low = Math.min(open, close) - intradayRange * rng();

      const baseVolume = 1_000_000 + rng() * 9_000_000;
      const volume = Math.round(baseVolume * (1 + Math.abs(dailyReturn) * 15) * (0.7 + rng() * 0.6));

      history.push({
        date: d,
        open: round2(open),
        high: round2(Math.max(high, open, close)),
        low: round2(Math.min(low, open, close)),
        close: round2(close),
        volume,
      });

      currentPrice = close;
      if (referencePrice != null) {
        anchorPrice = referencePrice;
      } else if (d % 40 === 0) {
        anchorPrice = anchorPrice * (1 + (rng() - 0.48) * 0.05);
      }
    }

    // Keep market price near realistic reference (±2%) without tying it to user buy price
    if (referencePrice != null) {
      const wiggle = (rng() - 0.5) * 0.04;
      scaleHistoryToTarget(history, round2(referencePrice * priceScale * (1 + wiggle)));
    }

    stocks.push({
      ticker,
      name: marketId === 'IN' ? `${ticker} Ltd.` : `${ticker} Corp.`,
      sector: sectorKey,
      beta: sector.beta,
      history,
      currentPrice: history[history.length - 1].close,
      market: marketId,
      currency: marketConfig.currency,
    });
  }

  return stocks;
}

/** @deprecated Use generateSyntheticUniverse */
export function generateSP500Universe(count = 500) {
  return generateSyntheticUniverse(count, 'US');
}
