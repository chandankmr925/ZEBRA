import { clamp } from '../utils/math.js';
import { calculateWilliamsR } from '../utils/technical.js';

export const williamsRStrategy = {
  id: 'williamsR',
  name: 'Williams %R',
  execute(history) {
    const wr = calculateWilliamsR(history, 14);
    if (wr === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Williams %R: N/A' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (wr < -80) {
      signal = 'BUY';
      weight = clamp(0.55 + (-80 - wr) / 40, 0.55, 1.0);
    } else if (wr > -20) {
      signal = 'SELL';
      weight = clamp(0.55 + (wr + 20) / 40, 0.55, 1.0);
    } else if (wr < -50) {
      signal = 'BUY';
      weight = 0.35;
    } else if (wr > -50) {
      signal = 'SELL';
      weight = 0.35;
    }

    return { signal, weight, metricDisplay: `Williams %R(14): ${wr.toFixed(1)}` };
  },
};
