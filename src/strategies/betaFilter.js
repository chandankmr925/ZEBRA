import { clamp } from '../utils/math.js';
import { getCloses } from '../utils/technical.js';

/**
 * Beta vs SPY using 60-day returns correlation.
 * @param {import('../types.js').Bar[]} history
 * @param {import('../types.js').Bar[]} [spyHistory]
 */
function calculateBeta(history, spyHistory) {
  if (!spyHistory || spyHistory.length < 61 || history.length < 61) return null;

  const stockCloses = getCloses(history);
  const spyCloses = getCloses(spyHistory);
  const n = Math.min(60, stockCloses.length - 1, spyCloses.length - 1);
  if (n < 20) return null;

  const stockReturns = [];
  const spyReturns = [];
  for (let i = stockCloses.length - n; i < stockCloses.length; i++) {
    stockReturns.push((stockCloses[i] - stockCloses[i - 1]) / stockCloses[i - 1]);
    const spyIdx = spyCloses.length - (stockCloses.length - i);
    if (spyIdx < 1) continue;
    spyReturns.push((spyCloses[spyIdx] - spyCloses[spyIdx - 1]) / spyCloses[spyIdx - 1]);
  }

  const len = Math.min(stockReturns.length, spyReturns.length);
  if (len < 20) return null;

  const sr = stockReturns.slice(-len);
  const sp = spyReturns.slice(-len);
  const meanS = sr.reduce((a, b) => a + b, 0) / len;
  const meanM = sp.reduce((a, b) => a + b, 0) / len;

  let cov = 0;
  let varM = 0;
  for (let i = 0; i < len; i++) {
    cov += (sr[i] - meanS) * (sp[i] - meanM);
    varM += (sp[i] - meanM) ** 2;
  }
  if (varM === 0) return null;
  return cov / varM;
}

export const betaFilterStrategy = {
  id: 'betaFilter',
  name: 'Beta Filter',
  execute(history, context = {}) {
    const beta = calculateBeta(history, context.spyHistory);
    const closes = getCloses(history);
    const dailyReturn = closes.length >= 2
      ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100
      : 0;

    if (beta === null) {
      return { signal: 'HOLD', weight: 0.3, metricDisplay: 'Beta: insufficient data' };
    }

    let signal = 'HOLD';
    let weight = 0.4;

    if (beta > 1.2 && dailyReturn > 0) {
      signal = 'BUY';
      weight = clamp(0.5 + (beta - 1) / 4, 0.5, 0.85);
    } else if (beta > 1.2 && dailyReturn < 0) {
      signal = 'SELL';
      weight = clamp(0.5 + (beta - 1) / 4, 0.5, 0.85);
    } else if (beta < 0.8) {
      signal = 'HOLD';
      weight = 0.35;
    } else if (dailyReturn > 0.3) {
      signal = 'BUY';
      weight = 0.45;
    } else if (dailyReturn < -0.3) {
      signal = 'SELL';
      weight = 0.45;
    }

    return {
      signal,
      weight,
      metricDisplay: `Beta(60d): ${beta.toFixed(2)} | Daily: ${dailyReturn.toFixed(2)}%`,
    };
  },
};
