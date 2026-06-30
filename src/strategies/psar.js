import { clamp } from '../utils/math.js';
import { calculateParabolicSAR } from '../utils/technical.js';

export const psarStrategy = {
  id: 'psar',
  name: 'Parabolic SAR',
  execute(history) {
    const { sar, isLong, prevIsLong } = calculateParabolicSAR(history);
    const close = history[history.length - 1]?.close;

    if (sar === null || close == null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'SAR: insufficient data' };
    }

    let signal = 'HOLD';
    let weight = 0.4;

    if (prevIsLong !== null && !prevIsLong && isLong) {
      signal = 'BUY';
      weight = 0.7;
    } else if (prevIsLong !== null && prevIsLong && !isLong) {
      signal = 'SELL';
      weight = 0.7;
    } else if (isLong && close > sar) {
      signal = 'BUY';
      weight = 0.5;
    } else if (!isLong && close < sar) {
      signal = 'SELL';
      weight = 0.5;
    }

    return {
      signal,
      weight,
      metricDisplay: `SAR: ${sar.toFixed(2)} | Close: ${close.toFixed(2)} | ${isLong ? 'Long' : 'Short'}`,
    };
  },
};
