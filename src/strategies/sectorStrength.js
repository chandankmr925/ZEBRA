import { clamp } from '../utils/math.js';
import { calculateROC, getCloses } from '../utils/technical.js';

export const sectorStrengthStrategy = {
  id: 'sectorStrength',
  name: 'Sector Relative Strength',
  execute(history, context = {}) {
    const stockRoc = calculateROC(getCloses(history), 20);
    const sectorMedian = context.sectorRocMedians?.[context.stock?.sector];

    if (stockRoc === null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Sector RS: insufficient data' };
    }

    if (sectorMedian == null) {
      return {
        signal: 'HOLD',
        weight: 0.35,
        metricDisplay: `ROC(20): ${stockRoc.toFixed(2)}% | Sector median: N/A`,
      };
    }

    const relative = stockRoc - sectorMedian;
    let signal = 'HOLD';
    let weight = 0.4;

    if (relative > 3) {
      signal = 'BUY';
      weight = clamp(0.55 + relative / 15, 0.55, 0.95);
    } else if (relative < -3) {
      signal = 'SELL';
      weight = clamp(0.55 + Math.abs(relative) / 15, 0.55, 0.95);
    } else if (relative > 0) {
      signal = 'BUY';
      weight = 0.4;
    } else if (relative < 0) {
      signal = 'SELL';
      weight = 0.4;
    }

    return {
      signal,
      weight,
      metricDisplay: `ROC vs sector: ${relative > 0 ? '+' : ''}${relative.toFixed(2)}% (stock ${stockRoc.toFixed(2)}% / sector ${sectorMedian.toFixed(2)}%)`,
    };
  },
};
