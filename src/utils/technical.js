/** Technical analysis indicator library */

import { getCloses } from './math.js';

export function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function emaSeriesFull(values, period) {
  const k = 2 / (period + 1);
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = prev;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result[i] = prev;
  }
  return result;
}

export function emaSeries(values, period) {
  return emaSeriesFull(values, period).filter((v) => v !== null);
}

export function stdDev(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

/** 14-period RSI using Wilder's smoothing */
export function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateStochastic(history, kPeriod = 14, dPeriod = 3) {
  if (history.length < kPeriod + dPeriod) {
    return { k: null, d: null, prevK: null, prevD: null };
  }

  const kValues = [];
  for (let i = kPeriod - 1; i < history.length; i++) {
    const window = history.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...window.map((b) => b.high));
    const lowest = Math.min(...window.map((b) => b.low));
    const close = history[i].close;
    const k = highest === lowest ? 50 : ((close - lowest) / (highest - lowest)) * 100;
    kValues.push(k);
  }

  const dValues = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const slice = kValues.slice(i - dPeriod + 1, i + 1);
    dValues.push(slice.reduce((a, b) => a + b, 0) / dPeriod);
  }

  return {
    k: kValues[kValues.length - 1],
    d: dValues[dValues.length - 1],
    prevK: kValues.length >= 2 ? kValues[kValues.length - 2] : null,
    prevD: dValues.length >= 2 ? dValues[dValues.length - 2] : null,
  };
}

export { getCloses };
