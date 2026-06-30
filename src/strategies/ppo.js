import { clamp } from '../utils/math.js';
import { calculatePPO, getCloses } from '../utils/technical.js';

export const ppoStrategy = {
  id: 'ppo',
  name: 'PPO',
  execute(history) {
    const { ppo, signal, prevPpo, prevSignal } = calculatePPO(getCloses(history), 12, 26, 9);
    if (ppo === null || signal === null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'PPO: insufficient data' };
    }
    const histogram = ppo - signal;
    const prevHistogram =
      prevPpo !== null && prevSignal !== null ? prevPpo - prevSignal : null;

    let sig = 'HOLD';
    let weight = 0.4;

    if (prevHistogram !== null && prevHistogram <= 0 && histogram > 0 && ppo > signal) {
      sig = 'BUY';
      weight = 0.7;
    } else if (prevHistogram !== null && prevHistogram >= 0 && histogram < 0 && ppo < signal) {
      sig = 'SELL';
      weight = 0.7;
    } else if (histogram > 0 && ppo > 0) {
      sig = 'BUY';
      weight = clamp(0.5 + Math.abs(histogram) / 2, 0.5, 0.85);
    } else if (histogram < 0 && ppo < 0) {
      sig = 'SELL';
      weight = clamp(0.5 + Math.abs(histogram) / 2, 0.5, 0.85);
    }

    return {
      signal: sig,
      weight,
      metricDisplay: `PPO: ${ppo.toFixed(3)} | Signal: ${signal.toFixed(3)} | Hist: ${histogram.toFixed(3)}`,
    };
  },
};
