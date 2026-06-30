/** Synthetic S&P 500 universe generator with sector-aware price dynamics */

import { HISTORY_DAYS, MIN_HISTORY_BARS } from '../config/constants.js';
import { SECTORS, SECTOR_KEYS } from '../config/sectors.js';
import { SP500_TICKERS } from '../config/tickers.js';
import { round2 } from '../utils/math.js';
import { createRNG, gaussianRandom, tickerSeed } from '../utils/rng.js';

/**
 * @param {number} [count=500]
 * @returns {import('../types.js').Stock[]}
 */
export function generateSP500Universe(count = 500) {
  if (HISTORY_DAYS < MIN_HISTORY_BARS) {
    console.warn(
      `HISTORY_DAYS (${HISTORY_DAYS}) is below MIN_HISTORY_BARS (${MIN_HISTORY_BARS}); MA Crossover will fail.`
    );
  }

  const stocks = [];

  for (let i = 0; i < count; i++) {
    const ticker = SP500_TICKERS[i] || `SYM${String(i + 1).padStart(3, '0')}`;
    const sectorKey = SECTOR_KEYS[i % SECTOR_KEYS.length];
    const sector = SECTORS[sectorKey];
    const rng = createRNG(tickerSeed(ticker, i));

    const [pMin, pMax] = sector.basePrice;
    let anchorPrice = pMin + rng() * (pMax - pMin);
    let currentPrice = anchorPrice;
    let rollingVol = sector.baseVol;

    const history = [];

    for (let d = 0; d < HISTORY_DAYS; d++) {
      const deviation = (currentPrice - anchorPrice) / anchorPrice;
      const meanRevForce = -deviation * sector.meanRev;
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
      if (d % 40 === 0) anchorPrice = anchorPrice * (1 + (rng() - 0.48) * 0.05);
    }

    stocks.push({
      ticker,
      name: `${ticker} Corp.`,
      sector: sectorKey,
      beta: sector.beta,
      history,
      currentPrice: history[history.length - 1].close,
    });
  }

  return stocks;
}
