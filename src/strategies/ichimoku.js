import { clamp } from '../utils/math.js';
import { calculateIchimoku } from '../utils/technical.js';

export const ichimokuStrategy = {
  id: 'ichimoku',
  name: 'Ichimoku Cloud',
  execute(history) {
    const { tenkan, kijun, senkouA, senkouB, close } = calculateIchimoku(history);
    if (close === null || tenkan === null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Ichimoku: insufficient data' };
    }

    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBottom = Math.min(senkouA, senkouB);
    let signal = 'HOLD';
    let weight = 0.4;

    if (close > cloudTop && tenkan > kijun) {
      signal = 'BUY';
      weight = clamp(0.6 + (close - cloudTop) / close * 5, 0.6, 1.0);
    } else if (close < cloudBottom && tenkan < kijun) {
      signal = 'SELL';
      weight = clamp(0.6 + (cloudBottom - close) / close * 5, 0.6, 1.0);
    } else if (tenkan > kijun) {
      signal = 'BUY';
      weight = 0.45;
    } else if (tenkan < kijun) {
      signal = 'SELL';
      weight = 0.45;
    }

    return {
      signal,
      weight,
      metricDisplay: `Tenkan: ${tenkan.toFixed(2)} | Kijun: ${kijun.toFixed(2)} | Cloud: ${cloudBottom.toFixed(2)}–${cloudTop.toFixed(2)}`,
    };
  },
};
