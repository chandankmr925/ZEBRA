import { clamp } from '../utils/math.js';
import { calculatePivotPoints } from '../utils/technical.js';

export const pivotStrategy = {
  id: 'pivot',
  name: 'Pivot Points',
  execute(history) {
    const { pivot, r1, s1, r2, s2, close } = calculatePivotPoints(history);
    if (close === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Pivot: insufficient data' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (close <= s1) {
      signal = 'BUY';
      weight = clamp(0.6 + (s1 - close) / close * 8, 0.6, 0.9);
    } else if (close >= r1) {
      signal = 'SELL';
      weight = clamp(0.6 + (close - r1) / close * 8, 0.6, 0.9);
    } else if (close < pivot) {
      signal = 'BUY';
      weight = 0.4;
    } else if (close > pivot) {
      signal = 'SELL';
      weight = 0.4;
    }

    return {
      signal,
      weight,
      metricDisplay: `Pivot: ${pivot.toFixed(2)} | S1: ${s1.toFixed(2)} | R1: ${r1.toFixed(2)}`,
    };
  },
};
