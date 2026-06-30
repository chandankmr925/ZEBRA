import { clamp } from '../utils/math.js';
import { calculateATR, getCloses } from '../utils/technical.js';

export const atrStrategy = {
  id: 'atr',
  name: 'ATR Volatility',
  execute(history) {
    const atr = calculateATR(history, 14);
    const closes = getCloses(history);
    const close = closes[closes.length - 1];
    const atrSma = [];

    if (atr === null || closes.length < 30) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'ATR: insufficient data' };
    }

    for (let i = 15; i < history.length; i++) {
      const slice = history.slice(0, i + 1);
      const a = calculateATR(slice, 14);
      if (a) atrSma.push(a);
    }
    const avgAtr = atrSma.length ? atrSma.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, atrSma.length) : atr;
    const atrPct = (atr / close) * 100;
    const expanding = atr > avgAtr * 1.1;
    const dailyReturn = ((close - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;

    let signal = 'HOLD';
    let weight = 0.4;

    if (expanding && dailyReturn > 0.5) {
      signal = 'BUY';
      weight = clamp(0.55 + atrPct / 20, 0.55, 0.85);
    } else if (expanding && dailyReturn < -0.5) {
      signal = 'SELL';
      weight = clamp(0.55 + atrPct / 20, 0.55, 0.85);
    } else if (atrPct < 1.5) {
      signal = 'HOLD';
      weight = 0.35;
    }

    return {
      signal,
      weight,
      metricDisplay: `ATR: ${atr.toFixed(2)} (${atrPct.toFixed(2)}%) | ${expanding ? 'Expanding' : 'Contracting'}`,
    };
  },
};
