/**
 * Optional LLM enhancement for AI recommendations.
 * Set OPENAI_API_KEY in the environment to enable richer narratives.
 */

import { generateRecommendation } from '../src/engines/aiRecommender.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * @param {import('../src/types.js').ScanResult[]} picks
 */
async function enhanceWithLLM(picks) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || picks.length === 0) return null;

  const payload = picks.slice(0, 8).map((p) => ({
    ticker: p.ticker,
    sector: p.sector,
    price: p.price,
    consensus: p.classification,
    score: p.score,
    rsi: p.rsi,
    ai: p.ai,
    strategies: p.strategyResults?.map((s) => ({
      name: s.name,
      signal: s.signal,
      weight: s.weight,
      metric: s.metricDisplay,
    })),
  }));

  const systemPrompt = `You are a quantitative equity analyst. Given multi-strategy technical scan outputs for S&P 500 stocks, write concise institutional-style commentary. Be specific, cite indicator names, note conflicts, and state conviction. Not financial advice.`;

  const userPrompt = `Analyze these scan results and return JSON only:
{
  "marketOverview": "2-3 sentence sector/market read",
  "picks": [{ "ticker": "...", "headline": "...", "rationale": "2-3 sentences", "risk": "one sentence" }]
}
Data: ${JSON.stringify(payload)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleRecommendApi(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}');
    const scanResults = body.scanResults ?? [];

    const withAi = scanResults.map((r) => ({
      ...r,
      ai: r.ai ?? generateRecommendation(r),
    }));

    const topPicks = [...withAi]
      .sort((a, b) => (b.ai?.aiScore ?? 0) - (a.ai?.aiScore ?? 0))
      .slice(0, body.topN ?? 10);

    let llm = null;
    let llmEnabled = Boolean(process.env.OPENAI_API_KEY);

    if (llmEnabled && body.useLLM !== false) {
      try {
        llm = await enhanceWithLLM(topPicks);
      } catch (err) {
        console.warn('LLM enhancement failed:', err.message);
        llmEnabled = false;
      }
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        picks: topPicks,
        llm,
        llmEnabled,
        source: llm ? 'hybrid' : 'local',
        generatedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
}
