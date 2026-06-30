import { clamp } from '../utils/math.js';
import { getCloses, sma, stdDev } from '../utils/technical.js';

/** @type {import('../../types.js').StrategyEngine} */
export const bollingerBandsStrategy = {
  id: 'bb',
  name: 'Bollinger Bands',
  execute(history) {
    const closes = getCloses(history);
    const period = 20;

    if (closes.length < period) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'BB: insufficient data' };
    }

    const middle = sma(closes, period);
    const sd = stdDev(closes, period);
    const upper = middle + 2 * sd;
    const lower = middle - 2 * sd;
    const close = closes[closes.length - 1];
    const pctB = sd === 0 ? 0.5 : (close - lower) / (upper - lower);

    let signal = 'HOLD';
    let weight = 0.4;

    if (close < lower) {
      signal = 'BUY';
      weight = clamp(0.6 + ((lower - close) / lower) * 5, 0.6, 1.0);
    } else if (close > upper) {
      signal = 'SELL';
      weight = clamp(0.6 + ((close - upper) / upper) * 5, 0.6, 1.0);
    }

    return {
      signal,
      weight,
      metricDisplay: `BB Upper: ${upper.toFixed(2)} | Mid: ${middle.toFixed(2)} | Lower: ${lower.toFixed(2)} | %B: ${pctB.toFixed(2)}`,
    };
  },
};
