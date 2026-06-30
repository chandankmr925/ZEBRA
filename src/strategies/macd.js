import { clamp } from '../utils/math.js';
import { emaSeries, emaSeriesFull, getCloses } from '../utils/technical.js';

/** @type {import('../../types.js').StrategyEngine} */
export const macdStrategy = {
  id: 'macd',
  name: 'MACD',
  execute(history) {
    const closes = getCloses(history);
    if (closes.length < 35) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'MACD: insufficient data' };
    }

    const ema12 = emaSeriesFull(closes, 12);
    const ema26 = emaSeriesFull(closes, 26);

    const macdLine = [];
    for (let i = 25; i < closes.length; i++) {
      if (ema12[i] !== null && ema26[i] !== null) {
        macdLine.push(ema12[i] - ema26[i]);
      }
    }

    if (macdLine.length < 10) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'MACD: insufficient data' };
    }

    const signalSeries = emaSeries(macdLine, 9);
    const macdNow = macdLine[macdLine.length - 1];
    const macdPrev = macdLine[macdLine.length - 2];
    const signalNow = signalSeries[signalSeries.length - 1];
    const signalPrev = signalSeries[signalSeries.length - 2];
    const histogram = macdNow - signalNow;

    let sig = 'HOLD';
    let weight = 0.4;

    if (macdPrev <= signalPrev && macdNow > signalNow) {
      sig = 'BUY';
      weight = clamp(0.65 + Math.abs(histogram) * 0.1, 0.65, 1.0);
    } else if (macdPrev >= signalPrev && macdNow < signalNow) {
      sig = 'SELL';
      weight = clamp(0.65 + Math.abs(histogram) * 0.1, 0.65, 1.0);
    } else if (histogram > 0) {
      sig = 'BUY';
      weight = 0.4;
    } else if (histogram < 0) {
      sig = 'SELL';
      weight = 0.4;
    }

    return {
      signal: sig,
      weight,
      metricDisplay: `MACD: ${macdNow.toFixed(3)} | Signal: ${signalNow.toFixed(3)} | Hist: ${histogram.toFixed(3)}`,
    };
  },
};
