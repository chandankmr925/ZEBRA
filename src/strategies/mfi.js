import { clamp } from '../utils/math.js';
import { calculateMFI } from '../utils/technical.js';

export const mfiStrategy = {
  id: 'mfi',
  name: 'MFI',
  execute(history) {
    const mfi = calculateMFI(history, 14);
    if (mfi === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'MFI: N/A' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (mfi < 20) {
      signal = 'BUY';
      weight = clamp(0.55 + (20 - mfi) / 30, 0.55, 1.0);
    } else if (mfi > 80) {
      signal = 'SELL';
      weight = clamp(0.55 + (mfi - 80) / 30, 0.55, 1.0);
    } else if (mfi < 40) {
      signal = 'BUY';
      weight = 0.35;
    } else if (mfi > 60) {
      signal = 'SELL';
      weight = 0.35;
    }

    return { signal, weight, metricDisplay: `MFI(14): ${mfi.toFixed(1)}` };
  },
};
