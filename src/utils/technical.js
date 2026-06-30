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

export function ema(values, period) {
  const series = emaSeriesFull(values, period);
  const last = series.filter((v) => v !== null).pop();
  return last ?? null;
}

export function stdDev(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

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
  return 100 - 100 / (1 + avgGain / avgLoss);
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

/** Average True Range (Wilder) */
export function calculateATR(history, period = 14) {
  if (history.length < period + 1) return null;

  const trs = [];
  for (let i = 1; i < history.length; i++) {
    const high = history[i].high;
    const low = history[i].low;
    const prevClose = history[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

/** ADX with +DI / -DI */
export function calculateADX(history, period = 14) {
  if (history.length < period * 2 + 1) {
    return { adx: null, plusDI: null, minusDI: null, prevPlusDI: null, prevMinusDI: null };
  }

  const plusDM = [];
  const minusDM = [];
  const tr = [];

  for (let i = 1; i < history.length; i++) {
    const upMove = history[i].high - history[i - 1].high;
    const downMove = history[i - 1].low - history[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const high = history[i].high;
    const low = history[i].low;
    const prevClose = history[i - 1].close;
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  const wilder = (arr) => {
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const out = [sum];
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      out.push(sum);
    }
    return out;
  };

  const smoothTR = wilder(tr);
  const smoothPlus = wilder(plusDM);
  const smoothMinus = wilder(minusDM);

  const diPlus = [];
  const diMinus = [];
  const dx = [];

  for (let i = 0; i < smoothTR.length; i++) {
    const p = smoothTR[i] === 0 ? 0 : (100 * smoothPlus[i]) / smoothTR[i];
    const m = smoothTR[i] === 0 ? 0 : (100 * smoothMinus[i]) / smoothTR[i];
    diPlus.push(p);
    diMinus.push(m);
    const denom = p + m;
    dx.push(denom === 0 ? 0 : (100 * Math.abs(p - m)) / denom);
  }

  let adx = dx.slice(period, period * 2).reduce((a, b) => a + b, 0) / period;
  for (let i = period * 2; i < dx.length; i++) {
    adx = (adx * (period - 1) + dx[i]) / period;
  }

  const len = diPlus.length;
  return {
    adx,
    plusDI: diPlus[len - 1],
    minusDI: diMinus[len - 1],
    prevPlusDI: diPlus[len - 2],
    prevMinusDI: diMinus[len - 2],
  };
}

/** On-Balance Volume series */
export function calculateOBV(history) {
  if (history.length < 2) return { obv: null, prevObv: null, obvTrend: null };

  let obv = 0;
  const series = [0];
  for (let i = 1; i < history.length; i++) {
    if (history[i].close > history[i - 1].close) obv += history[i].volume;
    else if (history[i].close < history[i - 1].close) obv -= history[i].volume;
    series.push(obv);
  }

  const lookback = 10;
  const recent = series.slice(-lookback);
  const slope = recent.length >= 2 ? recent[recent.length - 1] - recent[0] : 0;

  return {
    obv: series[series.length - 1],
    prevObv: series[series.length - 2],
    obvTrend: slope,
  };
}

/** Williams %R */
export function calculateWilliamsR(history, period = 14) {
  if (history.length < period) return null;
  const window = history.slice(-period);
  const highest = Math.max(...window.map((b) => b.high));
  const lowest = Math.min(...window.map((b) => b.low));
  const close = history[history.length - 1].close;
  if (highest === lowest) return -50;
  return ((highest - close) / (highest - lowest)) * -100;
}

/** Commodity Channel Index */
export function calculateCCI(history, period = 20) {
  if (history.length < period) return null;
  const tps = history.slice(-period).map((b) => (b.high + b.low + b.close) / 3);
  const tp = (history[history.length - 1].high + history[history.length - 1].low + history[history.length - 1].close) / 3;
  const mean = tps.reduce((a, b) => a + b, 0) / period;
  const meanDev = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
  if (meanDev === 0) return 0;
  return (tp - mean) / (0.015 * meanDev);
}

/** Parabolic SAR */
export function calculateParabolicSAR(history, afStep = 0.02, afMax = 0.2) {
  if (history.length < 5) return { sar: null, isLong: null, prevIsLong: null };

  let isLong = history[1].close > history[0].close;
  let af = afStep;
  let ep = isLong ? history[0].high : history[0].low;
  let sar = isLong ? history[0].low : history[0].high;
  let prevIsLong = isLong;

  for (let i = 1; i < history.length; i++) {
    prevIsLong = isLong;
    sar = sar + af * (ep - sar);

    if (isLong) {
      sar = Math.min(sar, history[i - 1].low, i >= 2 ? history[i - 2].low : history[i - 1].low);
      if (history[i].low < sar) {
        isLong = false;
        sar = ep;
        ep = history[i].low;
        af = afStep;
      } else {
        if (history[i].high > ep) {
          ep = history[i].high;
          af = Math.min(af + afStep, afMax);
        }
      }
    } else {
      sar = Math.max(sar, history[i - 1].high, i >= 2 ? history[i - 2].high : history[i - 1].high);
      if (history[i].high > sar) {
        isLong = true;
        sar = ep;
        ep = history[i].high;
        af = afStep;
      } else {
        if (history[i].low < ep) {
          ep = history[i].low;
          af = Math.min(af + afStep, afMax);
        }
      }
    }
  }

  return { sar, isLong, prevIsLong };
}

/** Money Flow Index */
export function calculateMFI(history, period = 14) {
  if (history.length < period + 1) return null;

  let posFlow = 0;
  let negFlow = 0;

  for (let i = history.length - period; i < history.length; i++) {
    const tp = (history[i].high + history[i].low + history[i].close) / 3;
    const prevTp = (history[i - 1].high + history[i - 1].low + history[i - 1].close) / 3;
    const rawMF = tp * history[i].volume;
    if (tp > prevTp) posFlow += rawMF;
    else if (tp < prevTp) negFlow += rawMF;
  }

  if (negFlow === 0) return 100;
  const ratio = posFlow / negFlow;
  return 100 - 100 / (1 + ratio);
}

/** Rate of Change % */
export function calculateROC(closes, period = 12) {
  if (closes.length < period + 1) return null;
  const now = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - period];
  if (prev === 0) return null;
  return ((now - prev) / prev) * 100;
}

/** Daily VWAP proxy (rolling cumulative TP*V / V) */
export function calculateVWAPProxy(history, period = 20) {
  if (history.length < period) return null;
  const window = history.slice(-period);
  let cumTPV = 0;
  let cumV = 0;
  for (const bar of window) {
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumTPV += tp * bar.volume;
    cumV += bar.volume;
  }
  if (cumV === 0) return null;
  return cumTPV / cumV;
}

/** Ichimoku components (simplified cloud on current bar) */
export function calculateIchimoku(history) {
  const closes = getCloses(history);
  if (history.length < 52) {
    return { tenkan: null, kijun: null, senkouA: null, senkouB: null, close: null };
  }

  const mid = (slice, period) => {
    const w = slice.slice(-period);
    return (Math.max(...w.map((b) => b.high)) + Math.min(...w.map((b) => b.low))) / 2;
  };

  const tenkan = mid(history, 9);
  const kijun = mid(history, 26);
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = mid(history, 52);
  const close = closes[closes.length - 1];

  return { tenkan, kijun, senkouA, senkouB, close };
}

/** PPO (Percentage Price Oscillator) */
export function calculatePPO(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return { ppo: null, signal: null, prevPpo: null, prevSignal: null };

  const ema12 = emaSeriesFull(closes, fast);
  const ema26 = emaSeriesFull(closes, slow);
  const ppoLine = [];

  for (let i = slow - 1; i < closes.length; i++) {
    if (ema26[i] === 0 || ema26[i] === null) continue;
    ppoLine.push(((ema12[i] - ema26[i]) / ema26[i]) * 100);
  }

  if (ppoLine.length < signal) return { ppo: null, signal: null, prevPpo: null, prevSignal: null };

  const signalSeries = emaSeries(ppoLine, signal);
  return {
    ppo: ppoLine[ppoLine.length - 1],
    signal: signalSeries[signalSeries.length - 1],
    prevPpo: ppoLine[ppoLine.length - 2],
    prevSignal: signalSeries[signalSeries.length - 2],
  };
}

/** Keltner Channels */
export function calculateKeltner(history, emaPeriod = 20, atrPeriod = 10, mult = 2) {
  const closes = getCloses(history);
  if (closes.length < emaPeriod + atrPeriod) return { middle: null, upper: null, lower: null, close: null };

  const middle = ema(closes, emaPeriod);
  const atr = calculateATR(history, atrPeriod);
  if (middle === null || atr === null) return { middle: null, upper: null, lower: null, close: null };

  return {
    middle,
    upper: middle + mult * atr,
    lower: middle - mult * atr,
    close: closes[closes.length - 1],
  };
}

/** Classic pivot points from prior session */
export function calculatePivotPoints(history) {
  if (history.length < 2) return { pivot: null, r1: null, s1: null, close: null };

  const prev = history[history.length - 2];
  const pivot = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * pivot - prev.low;
  const s1 = 2 * pivot - prev.high;

  return { pivot, r1, s1, close: history[history.length - 1].close };
}

export { getCloses };
