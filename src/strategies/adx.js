import { clamp } from '../utils/math.js';
import { calculateADX } from '../utils/technical.js';

export const adxStrategy = {
  id: 'adx',
  name: 'ADX + DMI',
  execute(history) {
    const { adx, plusDI, minusDI, prevPlusDI, prevMinusDI } = calculateADX(history, 14);
    if (adx === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'ADX: insufficient data' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (adx > 25 && plusDI > minusDI) {
      signal = 'BUY';
      weight = clamp(0.5 + (adx - 25) / 50, 0.5, 1.0);
    } else if (adx > 25 && minusDI > plusDI) {
      signal = 'SELL';
      weight = clamp(0.5 + (adx - 25) / 50, 0.5, 1.0);
    } else if (adx < 20) {
      signal = 'HOLD';
      weight = 0.35;
    } else if (prevPlusDI !== null && prevPlusDI <= prevMinusDI && plusDI > minusDI) {
      signal = 'BUY';
      weight = 0.55;
    } else if (prevPlusDI !== null && prevPlusDI >= prevMinusDI && plusDI < minusDI) {
      signal = 'SELL';
      weight = 0.55;
    }

    return {
      signal,
      weight,
      metricDisplay: `ADX: ${adx.toFixed(1)} | +DI: ${plusDI.toFixed(1)} | -DI: ${minusDI.toFixed(1)}`,
    };
  },
};
