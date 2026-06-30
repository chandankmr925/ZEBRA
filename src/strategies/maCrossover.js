import { clamp } from '../utils/math.js';
import { MIN_HISTORY_BARS } from '../config/constants.js';
import { getCloses, sma } from '../utils/technical.js';

/** @type {import('../types.js').StrategyEngine} */
export const maCrossoverStrategy = {
  id: 'ma',
  name: 'MA Crossover',
  execute(history) {
    const closes = getCloses(history);
    if (closes.length < MIN_HISTORY_BARS) {
      return {
        signal: 'HOLD',
        weight: 0.3,
        metricDisplay: `SMA50/200: insufficient data (${closes.length}/${MIN_HISTORY_BARS} bars)`,
      };
    }

    const sma50Now = sma(closes, 50);
    const sma200Now = sma(closes, 200);
    const sma50Prev = sma(closes.slice(0, -1), 50);
    const sma200Prev = sma(closes.slice(0, -1), 200);

    const spread = ((sma50Now - sma200Now) / sma200Now) * 100;
    let signal = 'HOLD';
    let weight = 0.4;

    if (sma50Prev <= sma200Prev && sma50Now > sma200Now) {
      signal = 'BUY';
      weight = clamp(0.6 + Math.abs(spread) * 0.05, 0.6, 1.0);
    } else if (sma50Prev >= sma200Prev && sma50Now < sma200Now) {
      signal = 'SELL';
      weight = clamp(0.6 + Math.abs(spread) * 0.05, 0.6, 1.0);
    } else if (sma50Now > sma200Now) {
      signal = 'BUY';
      weight = clamp(0.4 + spread * 0.02, 0.3, 0.7);
    } else if (sma50Now < sma200Now) {
      signal = 'SELL';
      weight = clamp(0.4 + Math.abs(spread) * 0.02, 0.3, 0.7);
    }

    return {
      signal,
      weight,
      metricDisplay: `SMA50: ${sma50Now.toFixed(2)} | SMA200: ${sma200Now.toFixed(2)} | Spread: ${spread.toFixed(2)}%`,
    };
  },
};
