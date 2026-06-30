import { clamp } from '../utils/math.js';
import { calculateStochastic } from '../utils/technical.js';

/** @type {import('../../types.js').StrategyEngine} */
export const stochasticStrategy = {
  id: 'stoch',
  name: 'Stochastic',
  execute(history) {
    const { k, d, prevK, prevD } = calculateStochastic(history, 14, 3);

    if (k === null || d === null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Stoch: insufficient data' };
    }

    let signal = 'HOLD';
    let weight = 0.4;

    if (k < 20 && d < 20 && prevK !== null && prevD !== null && prevK <= prevD && k > d) {
      signal = 'BUY';
      weight = clamp(0.7 + (20 - k) / 40, 0.7, 1.0);
    } else if (k > 80 && d > 80 && prevK !== null && prevD !== null && prevK >= prevD && k < d) {
      signal = 'SELL';
      weight = clamp(0.7 + (k - 80) / 40, 0.7, 1.0);
    } else if (k < 30 && k > d) {
      signal = 'BUY';
      weight = 0.45;
    } else if (k > 70 && k < d) {
      signal = 'SELL';
      weight = 0.45;
    }

    return {
      signal,
      weight,
      metricDisplay: `Stoch %K: ${k.toFixed(1)} | %D: ${d.toFixed(1)}`,
    };
  },
};
