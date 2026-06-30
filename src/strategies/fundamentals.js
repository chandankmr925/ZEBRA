import { clamp } from '../utils/math.js';

export const fundamentalsStrategy = {
  id: 'fundamentals',
  name: 'Fundamentals',
  execute(history, context = {}) {
    const stock = context.stock ?? {};
    const pe = stock.trailingPE;
    const divYield = stock.dividendYield;
    const peg = stock.pegRatio;

    if (pe == null && divYield == null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Fundamentals: no data' };
    }

    let score = 0;
    const parts = [];

    if (pe != null && pe > 0) {
      parts.push(`P/E: ${pe.toFixed(1)}`);
      if (pe < 15) score += 0.4;
      else if (pe < 25) score += 0.15;
      else if (pe > 40) score -= 0.35;
      else if (pe > 30) score -= 0.15;
    }

    if (peg != null && peg > 0) {
      parts.push(`PEG: ${peg.toFixed(2)}`);
      if (peg < 1) score += 0.3;
      else if (peg > 2) score -= 0.25;
    }

    if (divYield != null && divYield > 0) {
      const pct = divYield * 100;
      parts.push(`Div: ${pct.toFixed(2)}%`);
      if (pct >= 2) score += 0.2;
      else if (pct >= 1) score += 0.1;
    }

    let signal = 'HOLD';
    let weight = 0.4;

    if (score >= 0.35) {
      signal = 'BUY';
      weight = clamp(0.5 + score, 0.5, 0.9);
    } else if (score <= -0.25) {
      signal = 'SELL';
      weight = clamp(0.5 + Math.abs(score), 0.5, 0.85);
    }

    return {
      signal,
      weight,
      metricDisplay: parts.length ? parts.join(' | ') : 'Fundamentals: limited data',
    };
  },
};
