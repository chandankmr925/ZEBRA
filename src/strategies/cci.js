import { clamp } from '../utils/math.js';
import { calculateCCI } from '../utils/technical.js';

export const cciStrategy = {
  id: 'cci',
  name: 'CCI',
  execute(history) {
    const cci = calculateCCI(history, 20);
    if (cci === null) return { signal: 'HOLD', weight: 0.3, metricDisplay: 'CCI: N/A' };

    let signal = 'HOLD';
    let weight = 0.4;

    if (cci < -100) {
      signal = 'BUY';
      weight = clamp(0.55 + Math.min(Math.abs(cci + 100) / 100, 0.4), 0.55, 0.95);
    } else if (cci > 100) {
      signal = 'SELL';
      weight = clamp(0.55 + Math.min((cci - 100) / 100, 0.4), 0.55, 0.95);
    } else if (cci < -50) {
      signal = 'BUY';
      weight = 0.4;
    } else if (cci > 50) {
      signal = 'SELL';
      weight = 0.4;
    }

    return { signal, weight, metricDisplay: `CCI(20): ${cci.toFixed(1)}` };
  },
};
