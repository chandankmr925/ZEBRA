/**
 * On-demand ticker explanation API (local deep-dive + optional LLM narrative).
 */

import { explainTickerDeepDive, generateRecommendation } from '../src/engines/aiRecommender.js';

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
 * @param {import('../src/types.js').ScanResult} scanResult
 * @param {import('../src/types.js').TickerExplanation} local
 */
async function explainWithLLM(scanResult, local) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const payload = {
    ticker: scanResult.ticker,
    sector: scanResult.sector,
    price: scanResult.price,
    consensus: scanResult.classification,
    score: scanResult.score,
    rsi: scanResult.rsi,
    ai: local.ai,
    signalTally: local.signalTally,
    categoryBreakdown: local.categoryBreakdown,
    conflicts: local.conflicts,
    strategies: scanResult.strategyResults,
    portfolioNote: local.portfolioNote,
  };

  const systemPrompt =
    'You are a senior equity research analyst. Write a detailed but concise single-stock briefing from quantitative scan data. Cover technical setup, indicator agreement, risks, and a clear stance. Not financial advice.';

  const userPrompt = `Write a deep-dive briefing for this stock. Return JSON only:
{
  "headline": "one compelling line",
  "narrative": "3-5 paragraphs institutional tone",
  "catalysts": ["bullet 1", "bullet 2"],
  "risks": ["bullet 1", "bullet 2"],
  "stance": "STRONG BUY|BUY|HOLD|REDUCE|SELL"
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
      temperature: 0.45,
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
export async function handleExplainApi(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}');
    const scanResult = body.scanResult;

    if (!scanResult?.ticker) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'scanResult with ticker is required' }));
      return;
    }

    const enriched = {
      ...scanResult,
      ai: scanResult.ai ?? generateRecommendation(scanResult),
    };

    const local = explainTickerDeepDive(enriched, body.portfolioContext ?? null);

    let llm = null;
    let llmEnabled = Boolean(process.env.OPENAI_API_KEY);

    if (llmEnabled && body.useLLM !== false) {
      try {
        llm = await explainWithLLM(enriched, local);
      } catch (err) {
        console.warn('LLM explain failed:', err.message);
        llmEnabled = false;
      }
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ...local,
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
