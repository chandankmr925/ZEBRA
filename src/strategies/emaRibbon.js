import { clamp } from '../utils/math.js';
import { ema, getCloses } from '../utils/technical.js';

export const emaRibbonStrategy = {
  id: 'emaRibbon',
  name: 'EMA Ribbon',
  execute(history) {
    const closes = getCloses(history);
    if (closes.length < 60) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'EMA Ribbon: insufficient data' };
    }

    const e8 = ema(closes, 8);
    const e21 = ema(closes, 21);
    const e55 = ema(closes, 55);
    const close = closes[closes.length - 1];

    let signal = 'HOLD';
    let weight = 0.4;

    if (e8 > e21 && e21 > e55 && close > e8) {
      signal = 'BUY';
      weight = clamp(0.6 + (e8 - e55) / close * 10, 0.6, 1.0);
    } else if (e8 < e21 && e21 < e55 && close < e8) {
      signal = 'SELL';
      weight = clamp(0.6 + (e55 - e8) / close * 10, 0.6, 1.0);
    } else if (e8 > e21) {
      signal = 'BUY';
      weight = 0.45;
    } else if (e8 < e21) {
      signal = 'SELL';
      weight = 0.45;
    }

    return {
      signal,
      weight,
      metricDisplay: `EMA 8/21/55: ${e8.toFixed(2)} / ${e21.toFixed(2)} / ${e55.toFixed(2)}`,
    };
  },
};
