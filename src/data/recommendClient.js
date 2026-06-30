/**
 * Client for AI recommendation API (local + optional LLM enhancement).
 */

/**
 * @param {import('../types.js').ScanResult[]} scanResults
 * @param {number} [topN]
 * @returns {Promise<{ picks: import('../types.js').ScanResult[], llm: object|null, llmEnabled: boolean, source: string }|null>}
 */
export async function fetchAIRecommendations(scanResults, topN = 10) {
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanResults, topN, useLLM: true }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * @param {import('../types.js').ScanResult} scanResult
 * @param {object|null} [portfolioContext]
 * @returns {Promise<import('../types.js').TickerExplanation|null>}
 */
export async function fetchExplainTicker(scanResult, portfolioContext = null) {
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanResult, portfolioContext, useLLM: true }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
