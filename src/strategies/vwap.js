import { clamp } from '../utils/math.js';
import { calculateVWAPProxy } from '../utils/technical.js';

export const vwapStrategy = {
  id: 'vwap',
  name: 'VWAP Proxy',
  execute(history) {
    const vwap = calculateVWAPProxy(history, 20);
    const close = history[history.length - 1]?.close;

    if (vwap === null || close == null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'VWAP: insufficient data' };
    }

    const pctFromVwap = ((close - vwap) / vwap) * 100;
    let signal = 'HOLD';
    let weight = 0.4;

    if (pctFromVwap < -1.5) {
      signal = 'BUY';
      weight = clamp(0.55 + Math.abs(pctFromVwap) / 10, 0.55, 0.9);
    } else if (pctFromVwap > 1.5) {
      signal = 'SELL';
      weight = clamp(0.55 + pctFromVwap / 10, 0.55, 0.9);
    } else if (pctFromVwap < -0.3) {
      signal = 'BUY';
      weight = 0.4;
    } else if (pctFromVwap > 0.3) {
      signal = 'SELL';
      weight = 0.4;
    }

    return {
      signal,
      weight,
      metricDisplay: `VWAP(20): ${vwap.toFixed(2)} | Close: ${close.toFixed(2)} | Δ: ${pctFromVwap.toFixed(2)}%`,
    };
  },
};
