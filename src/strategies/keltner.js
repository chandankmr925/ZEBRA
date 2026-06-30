import { clamp } from '../utils/math.js';
import { calculateKeltner } from '../utils/technical.js';

export const keltnerStrategy = {
  id: 'keltner',
  name: 'Keltner Channels',
  execute(history) {
    const { upper, middle, lower, close } = calculateKeltner(history, 20, 2);
    if (close === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Keltner: insufficient data' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (close <= lower) {
      signal = 'BUY';
      weight = clamp(0.6 + (lower - close) / close * 10, 0.6, 0.95);
    } else if (close >= upper) {
      signal = 'SELL';
      weight = clamp(0.6 + (close - upper) / close * 10, 0.6, 0.95);
    } else if (close < middle) {
      signal = 'BUY';
      weight = 0.35;
    } else if (close > middle) {
      signal = 'SELL';
      weight = 0.35;
    }

    return {
      signal,
      weight,
      metricDisplay: `Keltner: L ${lower.toFixed(2)} | M ${middle.toFixed(2)} | U ${upper.toFixed(2)}`,
    };
  },
};
