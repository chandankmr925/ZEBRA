/**
 * AI Recommender — synthesizes all strategy outputs into ranked,
 * explainable recommendations with confidence scoring.
 */

import { SIGNAL_MAP } from '../config/constants.js';
import { CATEGORY_WEIGHTS, STRATEGY_CATEGORIES } from '../config/strategyCategories.js';
import { clamp } from '../utils/math.js';

const AI_THRESHOLDS = {
  STRONG_BUY: 0.58,
  BUY: 0.32,
  WATCH: 0.12,
  REDUCE: -0.12,
  SELL: -0.32,
  STRONG_SELL: -0.58,
};

/**
 * @param {Array<import('../types.js').StrategyResult & { id?: string, name: string }>} results
 */
function computeCategoryScores(results) {
  /** @type {Record<string, number[]>} */
  const buckets = {};

  for (const r of results) {
    const cat = STRATEGY_CATEGORIES[r.id ?? ''] || 'momentum';
    if (!buckets[cat]) buckets[cat] = [];
    buckets[cat].push((SIGNAL_MAP[r.signal] ?? 0) * r.weight);
  }

  /** @type {Record<string, number>} */
  const scores = {};
  for (const [cat, vals] of Object.entries(buckets)) {
    scores[cat] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return scores;
}

/**
 * @param {Record<string, number>} categoryScores
 * @returns {string[]}
 */
function detectConflicts(categoryScores) {
  const conflicts = [];
  const trend = categoryScores.trend ?? 0;
  const momentum = categoryScores.momentum ?? 0;
  const meanRev = categoryScores.meanReversion ?? 0;
  const volume = categoryScores.volume ?? 0;
  const fundamental = categoryScores.fundamental ?? 0;

  if (trend > 0.28 && meanRev < -0.28) {
    conflicts.push('Trend is bullish but price appears extended (mean-reversion caution)');
  }
  if (trend < -0.28 && meanRev > 0.28) {
    conflicts.push('Downtrend intact but short-term oversold bounce possible');
  }
  if (momentum > 0.3 && volume < -0.2) {
    conflicts.push('Momentum rising without volume confirmation');
  }
  if (momentum < -0.3 && volume > 0.2) {
    conflicts.push('Selling pressure with elevated volume distribution');
  }
  if (fundamental > 0.25 && trend < -0.2) {
    conflicts.push('Strong fundamentals vs weak technical trend');
  }
  if (fundamental < -0.2 && trend > 0.25) {
    conflicts.push('Technical strength despite weak fundamental profile');
  }

  return conflicts;
}

/**
 * @param {Array<import('../types.js').StrategyResult & { weight: number, signal: string }>} results
 * @param {string[]} conflicts
 */
function computeConfidence(results, conflicts) {
  let buyW = 0;
  let sellW = 0;
  let holdW = 0;

  for (const r of results) {
    if (r.signal === 'BUY') buyW += r.weight;
    else if (r.signal === 'SELL') sellW += r.weight;
    else holdW += r.weight;
  }

  const total = buyW + sellW + holdW;
  const agreement = total > 0 ? Math.max(buyW, sellW, holdW) / total : 0;
  return clamp(agreement * (1 - conflicts.length * 0.07), 0.25, 0.98);
}

/**
 * @param {number} consensusScore
 * @param {Record<string, number>} categoryScores
 * @param {string[]} conflicts
 */
function computeAiScore(consensusScore, categoryScores, conflicts) {
  let weighted = 0;
  let weightSum = 0;

  for (const [cat, score] of Object.entries(categoryScores)) {
    const w = CATEGORY_WEIGHTS[cat] ?? 1;
    weighted += score * w;
    weightSum += w;
  }

  const categoryBlend = weightSum > 0 ? weighted / weightSum : consensusScore;
  const conflictPenalty = conflicts.length * 0.04;
  return clamp(consensusScore * 0.5 + categoryBlend * 0.5 - conflictPenalty, -1, 1);
}

/**
 * @param {number} aiScore
 * @param {number} confidence
 */
function recommendationLabel(aiScore, confidence) {
  if (aiScore >= AI_THRESHOLDS.STRONG_BUY && confidence >= 0.62) return 'STRONG BUY';
  if (aiScore >= AI_THRESHOLDS.BUY) return 'BUY';
  if (aiScore >= AI_THRESHOLDS.WATCH) return 'WATCH';
  if (aiScore <= AI_THRESHOLDS.STRONG_SELL && confidence >= 0.62) return 'STRONG SELL';
  if (aiScore <= AI_THRESHOLDS.SELL) return 'SELL';
  if (aiScore <= AI_THRESHOLDS.REDUCE) return 'REDUCE';
  return 'HOLD';
}

/**
 * @param {Array<import('../types.js').StrategyResult & { name: string, weight: number, signal: string }>} results
 */
function extractFactors(results) {
  const bullFactors = [];
  const bearFactors = [];

  const sorted = [...results].sort((a, b) => b.weight - a.weight);
  for (const r of sorted) {
    if (r.signal === 'BUY' && r.weight >= 0.45) {
      bullFactors.push(`${r.name}: ${r.metricDisplay}`);
    } else if (r.signal === 'SELL' && r.weight >= 0.45) {
      bearFactors.push(`${r.name}: ${r.metricDisplay}`);
    }
  }

  return {
    bullFactors: bullFactors.slice(0, 5),
    bearFactors: bearFactors.slice(0, 5),
  };
}

/**
 * @param {import('../types.js').ScanResult} scanResult
 * @param {string} label
 * @param {number} confidence
 * @param {string[]} bullFactors
 * @param {string[]} bearFactors
 * @param {string[]} conflicts
 * @param {number|null} rsi
 */
function buildSummary(scanResult, label, confidence, bullFactors, bearFactors, conflicts, rsi) {
  const confPct = Math.round(confidence * 100);
  const { ticker, sector, price } = scanResult;

  if (label.includes('BUY')) {
    const driver = bullFactors.length
      ? bullFactors[0].split(':')[0]
      : 'broad indicator alignment';
    const rsiNote = rsi != null && rsi < 35 ? ' RSI supports dip-buy setup.' : '';
    const conflictNote = conflicts.length ? ' Watch for mixed signals.' : '';
    return `${ticker} (${sector}) at $${price.toFixed(2)}: ${label} — ${confPct}% strategy agreement, led by ${driver}.${rsiNote}${conflictNote}`;
  }

  if (label.includes('SELL') || label === 'REDUCE') {
    const driver = bearFactors.length
      ? bearFactors[0].split(':')[0]
      : 'bearish indicator cluster';
    return `${ticker} (${sector}): ${label} — ${confPct}% agreement, ${driver} weighing on outlook.`;
  }

  if (label === 'WATCH') {
    return `${ticker}: WATCH — early bullish lean (${confPct}% confidence); wait for stronger confirmation.`;
  }

  return `${ticker}: HOLD — balanced signals (${confPct}% confidence); no clear edge.${conflicts.length ? ` Note: ${conflicts[0]}` : ''}`;
}

/**
 * @param {import('../types.js').ScanResult} scanResult
 * @returns {import('../types.js').AIRecommendation}
 */
export function generateRecommendation(scanResult) {
  const { score, strategyResults, rsi, ticker } = scanResult;

  if (!strategyResults?.length) {
    return {
      aiScore: 0,
      confidence: 0,
      recommendation: 'HOLD',
      summary: `${ticker}: insufficient strategy data for AI analysis`,
      bullFactors: [],
      bearFactors: [],
      conflicts: [],
      categoryScores: {},
      source: 'local',
    };
  }

  const categoryScores = computeCategoryScores(strategyResults);
  const conflicts = detectConflicts(categoryScores);
  const confidence = computeConfidence(strategyResults, conflicts);
  const aiScore = computeAiScore(score, categoryScores, conflicts);
  const recommendation = recommendationLabel(aiScore, confidence);
  const { bullFactors, bearFactors } = extractFactors(strategyResults);
  const summary = buildSummary(
    scanResult,
    recommendation,
    confidence,
    bullFactors,
    bearFactors,
    conflicts,
    rsi
  );

  return {
    aiScore,
    confidence,
    recommendation,
    summary,
    bullFactors,
    bearFactors,
    conflicts,
    categoryScores,
    source: 'local',
  };
}

/**
 * @param {import('../types.js').ScanResult[]} results
 * @returns {import('../types.js').ScanResult[]}
 */
export function enrichWithAIRecommendations(results) {
  return results.map((r) => ({
    ...r,
    ai: generateRecommendation(r),
  }));
}

/**
 * @param {import('../types.js').ScanResult[]} results
 * @param {number} topN
 * @param {Set<string>} [excludeTickers]
 */
export function getTopAIRecommendations(results, topN = 10, excludeTickers = new Set()) {
  return [...results]
    .filter((r) => r.ai && r.ai.aiScore > 0 && !excludeTickers.has(r.ticker.toUpperCase()))
    .sort((a, b) => {
      const scoreDiff = (b.ai?.aiScore ?? 0) - (a.ai?.aiScore ?? 0);
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      return (b.ai?.confidence ?? 0) - (a.ai?.confidence ?? 0);
    })
    .slice(0, topN);
}

/**
 * @param {import('../types.js').Position} position
 * @param {import('../types.js').ScanResult|null} scanResult
 * @param {import('../types.js').PortfolioAudit} audit
 * @returns {import('../types.js').PortfolioAIAdvice}
 */
export function recommendPortfolioPosition(position, scanResult, audit) {
  if (!scanResult?.ai) {
    return {
      advice: 'SCAN NEEDED',
      summary: `Run a market scan for AI guidance on ${position.ticker}.`,
      ai: null,
    };
  }

  const ai = scanResult.ai;
  let advice = ai.recommendation;
  let summary = ai.summary;

  // Owned positions: surface HOLD or SELL only (not new-buy signals)
  const sellAi = ['STRONG SELL', 'SELL', 'REDUCE'];
  if (sellAi.includes(ai.recommendation)) {
    advice = 'SELL';
  } else if (ai.recommendation.includes('BUY') || ai.recommendation === 'WATCH') {
    advice = 'HOLD';
  }

  if (audit.returnPct <= -7 || audit.action === 'ATR STOP LOSS' || audit.action === 'STOP LOSS / CUT') {
    advice = 'SELL';
    summary = `${position.ticker}: Exit — loss at ${audit.returnPct.toFixed(1)}% with ${audit.action}. AI score ${ai.aiScore.toFixed(2)}.`;
  } else if (audit.returnPct > 15 && ai.aiScore < 0) {
    advice = 'SELL';
    summary = `${position.ticker}: Sell — up ${audit.returnPct.toFixed(1)}% but AI turning bearish (${ai.recommendation}).`;
  } else if (audit.action === 'TAKE PROFIT') {
    advice = 'SELL';
    summary = `${position.ticker}: Take profit — target zone reached; AI agrees signals are fading.`;
  } else if (audit.action === 'STRONG HOLD' && ai.aiScore >= 0.35) {
    advice = 'HOLD';
    summary = `${position.ticker}: Hold — bullish consensus (${Math.round(ai.confidence * 100)}% conf), position performing.`;
  } else if (audit.action === 'ALGORITHMIC EXIT') {
    advice = 'SELL';
    summary = `${position.ticker}: Sell — algorithmic exit triggered; AI ${ai.recommendation}.`;
  } else if (ai.recommendation === 'STRONG SELL' || ai.recommendation === 'SELL') {
    advice = 'SELL';
    summary = `${position.ticker}: Reduce exposure — AI ${ai.recommendation} (${Math.round(ai.confidence * 100)}% conf).`;
  }

  return { advice, summary, ai };
}

const CATEGORY_LABELS = {
  trend: 'Trend',
  momentum: 'Momentum',
  volume: 'Volume',
  volatility: 'Volatility',
  meanReversion: 'Mean Reversion',
  fundamental: 'Fundamentals',
  relative: 'Relative Strength',
};

/**
 * @param {import('../types.js').ScanResult} scanResult
 * @param {object} [portfolioContext]
 * @param {number} [portfolioContext.buyPrice]
 * @param {number} [portfolioContext.returnPct]
 * @param {string} [portfolioContext.action]
 * @param {string} [portfolioContext.portfolioAdvice]
 * @returns {import('../types.js').TickerExplanation}
 */
export function explainTickerDeepDive(scanResult, portfolioContext = null) {
  const ai = scanResult.ai ?? generateRecommendation(scanResult);
  const { strategyResults, classification, score, rsi, ticker, name, sector, price } = scanResult;

  /** @type {{ BUY: object[], SELL: object[], HOLD: object[] }} */
  const strategiesBySignal = { BUY: [], SELL: [], HOLD: [] };
  let buyCount = 0;
  let sellCount = 0;
  let holdCount = 0;

  for (const s of strategyResults ?? []) {
    const entry = {
      name: s.name,
      signal: s.signal,
      weight: s.weight,
      metric: s.metricDisplay,
      category: CATEGORY_LABELS[STRATEGY_CATEGORIES[s.id ?? '']] || 'Other',
    };
    if (s.signal === 'BUY') buyCount++;
    else if (s.signal === 'SELL') sellCount++;
    else holdCount++;
    strategiesBySignal[s.signal].push(entry);
  }

  const total = strategyResults?.length ?? 0;
  const categoryBreakdown = Object.entries(ai.categoryScores ?? {})
    .map(([cat, catScore]) => ({
      category: CATEGORY_LABELS[cat] || cat,
      score: catScore,
      bias: catScore > 0.15 ? 'Bullish' : catScore < -0.15 ? 'Bearish' : 'Neutral',
    }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  const dominant =
    buyCount >= sellCount && buyCount >= holdCount
      ? 'bullish'
      : sellCount >= buyCount && sellCount >= holdCount
        ? 'bearish'
        : 'mixed';

  const verdict = `${ticker} (${name}) — ${sector} @ $${price.toFixed(2)}. ` +
    `${total} strategies: ${buyCount} BUY, ${holdCount} HOLD, ${sellCount} SELL (${dominant} tilt). ` +
    `Consensus ${classification} (${score >= 0 ? '+' : ''}${score.toFixed(3)}); ` +
    `AI ${ai.recommendation} with ${Math.round(ai.confidence * 100)}% confidence (score ${ai.aiScore >= 0 ? '+' : ''}${ai.aiScore.toFixed(3)}).` +
    (rsi != null ? ` RSI(14): ${rsi.toFixed(1)}.` : '');

  /** @type {string[]} */
  const actionPlan = [];

  if (ai.recommendation.includes('BUY')) {
    actionPlan.push('Consider staged entry; confirm with volume and sector trend.');
    if (ai.conflicts.length) actionPlan.push(`Resolve conflict first: ${ai.conflicts[0]}`);
  } else if (ai.recommendation === 'WATCH') {
    actionPlan.push('Add to watchlist — wait for stronger multi-strategy alignment.');
  } else if (ai.recommendation === 'HOLD') {
    actionPlan.push('No clear edge; maintain current stance unless thesis changes.');
  } else {
    actionPlan.push('Avoid new long exposure until signals improve.');
    if (sellCount > buyCount) actionPlan.push('Multiple indicators flag distribution or downtrend risk.');
  }

  if (portfolioContext) {
    const sign = portfolioContext.returnPct >= 0 ? '+' : '';
    const dollarSign = (portfolioContext.pnlDollars ?? 0) >= 0 ? '+' : '';
    const qty = portfolioContext.quantity ?? 1;
    actionPlan.push(
      `Portfolio: ${qty} shares, cost basis $${portfolioContext.costBasis?.toFixed(2) ?? (portfolioContext.buyPrice * qty).toFixed(2)}, ` +
        `market value $${portfolioContext.marketValue?.toFixed(2) ?? '—'}, ` +
        `P&L ${dollarSign}$${Math.abs(portfolioContext.pnlDollars ?? 0).toFixed(2)} (${sign}${portfolioContext.returnPct?.toFixed(1)}%).`
    );
  }

  let portfolioNote = null;
  if (portfolioContext) {
    const sign = portfolioContext.returnPct >= 0 ? '+' : '';
    const dollarSign = (portfolioContext.pnlDollars ?? 0) >= 0 ? '+' : '';
    const qty = portfolioContext.quantity ?? 1;
    portfolioNote =
      `You hold ${qty} shares of ${ticker} at $${portfolioContext.buyPrice?.toFixed(2)}/sh ` +
      `(cost basis $${portfolioContext.costBasis?.toFixed(2) ?? '—'}, market value $${portfolioContext.marketValue?.toFixed(2) ?? '—'}, ` +
      `P&L ${dollarSign}$${Math.abs(portfolioContext.pnlDollars ?? 0).toFixed(2)} / ${sign}${portfolioContext.returnPct?.toFixed(2)}%). ` +
      `Portfolio rule: ${portfolioContext.action}. AI advice: ${portfolioContext.portfolioAdvice ?? 'N/A'}.`;
  }

  return {
    ticker,
    name,
    sector,
    price,
    ai,
    consensus: { classification, score, rsi },
    signalTally: { buy: buyCount, sell: sellCount, hold: holdCount, total },
    categoryBreakdown,
    strategiesBySignal,
    conflicts: ai.conflicts,
    bullFactors: ai.bullFactors,
    bearFactors: ai.bearFactors,
    verdict,
    actionPlan,
    portfolioNote,
    source: 'local',
  };
}
