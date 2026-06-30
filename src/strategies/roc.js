import { clamp } from '../utils/math.js';
import { calculateROC, getCloses } from '../utils/technical.js';

export const rocStrategy = {
  id: 'roc',
  name: 'ROC Momentum',
  execute(history) {
    const roc = calculateROC(getCloses(history), 12);
    if (roc === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'ROC: N/A' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (roc > 5) {
      signal = 'BUY';
      weight = clamp(0.55 + roc / 20, 0.55, 0.95);
    } else if (roc < -5) {
      signal = 'SELL';
      weight = clamp(0.55 + Math.abs(roc) / 20, 0.55, 0.95);
    } else if (roc > 0) {
      signal = 'BUY';
      weight = 0.4;
    } else if (roc < 0) {
      signal = 'SELL';
      weight = 0.4;
    }

    return { signal, weight, metricDisplay: `ROC(12): ${roc.toFixed(2)}%` };
  },
};
