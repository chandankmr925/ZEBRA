import { clamp } from '../utils/math.js';
import { calculateOBV, getCloses } from '../utils/technical.js';

export const obvStrategy = {
  id: 'obv',
  name: 'OBV Volume',
  execute(history) {
    const { obv, obvTrend } = calculateOBV(history);
    const closes = getCloses(history);
    if (obv === null || closes.length < 12) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'OBV: insufficient data' };
    }

    const priceTrend = closes[closes.length - 1] - closes[closes.length - 6];
    let signal = 'HOLD';
    let weight = 0.4;

    if (obvTrend > 0 && priceTrend > 0) {
      signal = 'BUY';
      weight = clamp(0.55 + Math.min(obvTrend / 1e7, 0.3), 0.55, 0.9);
    } else if (obvTrend < 0 && priceTrend < 0) {
      signal = 'SELL';
      weight = clamp(0.55 + Math.min(Math.abs(obvTrend) / 1e7, 0.3), 0.55, 0.9);
    } else if (obvTrend > 0 && priceTrend < 0) {
      signal = 'SELL';
      weight = 0.5;
    } else if (obvTrend < 0 && priceTrend > 0) {
      signal = 'BUY';
      weight = 0.45;
    }

    return {
      signal,
      weight,
      metricDisplay: `OBV: ${(obv / 1e6).toFixed(2)}M | Trend: ${obvTrend > 0 ? '+' : ''}${(obvTrend / 1e6).toFixed(2)}M`,
    };
  },
};
