import { clamp } from '../utils/math.js';
import { calculateRSI, getCloses } from '../utils/technical.js';

/** @type {import('../../types.js').StrategyEngine} */
export const rsiStrategy = {
  id: 'rsi',
  name: 'RSI (Wilder)',
  execute(history) {
    const closes = getCloses(history);
    const rsi = calculateRSI(closes, 14);

    if (rsi === null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'RSI: N/A' };
    }

    let signal = 'HOLD';
    let weight = 0.4;

    if (rsi < 30) {
      signal = 'BUY';
      weight = clamp((30 - rsi) / 30 + 0.5, 0.5, 1.0);
    } else if (rsi > 70) {
      signal = 'SELL';
      weight = clamp((rsi - 70) / 30 + 0.5, 0.5, 1.0);
    } else if (rsi < 45) {
      signal = 'BUY';
      weight = 0.35;
    } else if (rsi > 55) {
      signal = 'SELL';
      weight = 0.35;
    }

    return { signal, weight, metricDisplay: `RSI(14): ${rsi.toFixed(1)}` };
  },
};
