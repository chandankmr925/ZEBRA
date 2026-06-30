/** DOM rendering helpers */

import { mapPortfolioConsensus } from '../engines/scanEngine.js';

function badgeClass(signal) {
  if (signal === 'BUY') return 'text-emerald-400 bg-emerald-900/40 border-emerald-700';
  if (signal === 'SELL') return 'text-red-400 bg-red-900/40 border-red-700';
  return 'text-amber-400 bg-amber-900/40 border-amber-700';
}

function actionBadgeClass(action) {
  if (action === 'STRONG HOLD') return 'text-emerald-400';
  if (action === 'TAKE PROFIT') return 'text-amber-400';
  if (action === 'ATR STOP LOSS' || action === 'STOP LOSS / CUT') return 'text-red-500';
  return 'text-red-500';
}

function aiBadgeClass(recommendation) {
  if (!recommendation) return 'text-slate-400 bg-slate-800 border-slate-600';
  if (recommendation.includes('STRONG BUY') || recommendation === 'ACCUMULATE') {
    return 'text-emerald-300 bg-emerald-900/50 border-emerald-600';
  }
  if (recommendation === 'BUY' || recommendation === 'WATCH') {
    return 'text-emerald-400 bg-emerald-900/40 border-emerald-700';
  }
  if (recommendation.includes('STRONG SELL') || recommendation === 'EXIT') {
    return 'text-red-300 bg-red-900/50 border-red-600';
  }
  if (recommendation === 'SELL' || recommendation === 'REDUCE' || recommendation === 'TRIM PROFITS') {
    return 'text-red-400 bg-red-900/40 border-red-700';
  }
  if (recommendation === 'TAKE PROFIT') return 'text-amber-400 bg-amber-900/40 border-amber-700';
  return 'text-amber-400 bg-amber-900/40 border-amber-700';
}

function formatAIRec(ai) {
  if (!ai) return '—';
  const conf = Math.round((ai.confidence ?? 0) * 100);
  return `<span class="px-2 py-0.5 rounded text-xs font-semibold border ${aiBadgeClass(ai.recommendation)}">${ai.recommendation}</span>
    <span class="text-slate-500 text-xs ml-1">${conf}%</span>`;
}

function explainBtn(ticker, inline = false) {
  const cls = inline
    ? 'btn-explain text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors'
    : 'btn-explain block mt-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors';
  return `<button type="button" data-explain="${ticker}" class="${cls}">Explain</button>`;
}

function formatMetrics(strategyResults) {
  return strategyResults
    .map(
      (r) =>
        `<div class="metric-mono text-slate-400 leading-relaxed"><span class="text-slate-500">${r.name}:</span> ${r.metricDisplay}</div>`
    )
    .join('');
}

function renderDeskRow(r, index, scoreClass, options = {}) {
  const signal = options.signalOverride ?? r.classification;
  const scorePrefix = r.score >= 0 && scoreClass.includes('emerald') ? '+' : '';
  const aiCell = options.aiOverride
    ? `<span class="px-2 py-0.5 rounded text-xs font-semibold border ${aiBadgeClass(options.aiOverride)}">${options.aiOverride}</span>`
    : r.ai
      ? formatAIRec(r.ai)
      : '—';
  const rowScoreClass =
    signal === 'SELL' ? 'text-red-400' : signal === 'HOLD' ? 'text-amber-400' : scoreClass;

  return `
    <tr class="hover:bg-slate-850/50 transition-colors">
      <td class="px-4 py-3 text-slate-500 font-mono text-xs">${index + 1}</td>
      <td class="px-4 py-3">
        <div class="font-semibold text-white">${r.ticker}</div>
        ${explainBtn(r.ticker)}
      </td>
      <td class="px-4 py-3 text-slate-400 text-xs">${r.sector}</td>
      <td class="px-4 py-3 font-mono text-sm">$${r.price.toFixed(2)}</td>
      ${options.extraColumn ?? ''}
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass(signal)}">${signal}</span></td>
      <td class="px-4 py-3 font-mono ${rowScoreClass} font-semibold">${scorePrefix}${r.score.toFixed(3)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${aiCell}</td>
      <td class="px-4 py-3 max-w-xs">${formatMetrics(r.strategyResults)}</td>
    </tr>`;
}

export const renderer = {
  setUniverseCount(count) {
    document.getElementById('universeCount').textContent = String(count);
  },

  setLastScanTime(time) {
    document.getElementById('lastScanTime').textContent = time;
  },

  setDataSource(source, quoteTime) {
    const el = document.getElementById('dataSource');
    const labels = {
      live: 'Live (Yahoo)',
      mixed: 'Live + Synthetic',
      synthetic: 'Synthetic',
    };
    el.textContent = labels[source] || source;
    el.className =
      source === 'live'
        ? 'text-emerald-400 font-semibold'
        : source === 'mixed'
          ? 'text-amber-400 font-semibold'
          : 'text-slate-400 font-semibold';

    const qt = document.getElementById('quoteTime');
    if (quoteTime) {
      qt.textContent = new Date(quoteTime).toLocaleTimeString();
    }
  },

  setScanning(active, message = 'Working…') {
    const btn = document.getElementById('btnScan');
    const indicator = document.getElementById('scanIndicator');
    btn.disabled = active;
    btn.classList.toggle('opacity-60', active);
    btn.classList.toggle('cursor-not-allowed', active);
    indicator.classList.toggle('hidden', !active);
    if (active) indicator.textContent = message;
  },

  /**
   * @param {import('../types.js').ScanResult[]} buys
   * @param {number} totalBuys
   */
  renderBuyDesk(buys, totalBuys) {
    document.getElementById('buyDeskCount').textContent =
      `${buys.length} of ${totalBuys} BUY signals`;
    const tbody = document.getElementById('buyDeskBody');

    if (buys.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="px-4 py-12 text-center text-slate-500">No BUY candidates meeting consensus threshold (score ≥ 0.4).</td></tr>';
      return;
    }

    tbody.innerHTML = buys.map((r, i) => renderDeskRow(r, i, 'text-emerald-400')).join('');
  },

  /**
   * @param {ReturnType<import('../engines/scanEngine.js').buildPortfolioSignalDesk>} rows
   */
  renderPortfolioSignalDesk(rows) {
    const countEl = document.getElementById('portfolioSignalDeskCount');
    const tbody = document.getElementById('portfolioSignalDeskBody');
    if (!tbody) return;

    const sellCount = rows.filter((r) => r.displayClassification === 'SELL').length;
    const holdCount = rows.filter((r) => r.displayClassification === 'HOLD').length;

    if (countEl) {
      countEl.textContent =
        rows.length > 0
          ? `${rows.length} positions · ${holdCount} HOLD · ${sellCount} SELL`
          : 'No portfolio positions';
    }

    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="10" class="px-4 py-12 text-center text-slate-500">Add positions to your portfolio to see hold/sell signals after a scan.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((r, i) => {
        const pnlClass = r.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400';
        const pnlSign = r.returnPct >= 0 ? '+' : '';
        const pnlDollars = r.audit?.pnlDollars ?? 0;
        const aiAdvice = r.portfolioAi?.advice ?? r.displayClassification;
        const qty = r.audit?.quantity ?? r.position?.quantity ?? 1;
        return renderDeskRow(r, i, 'text-amber-400', {
          signalOverride: r.displayClassification,
          aiOverride: aiAdvice,
          extraColumn: `<td class="px-4 py-3 font-mono text-sm">${qty}</td><td class="px-4 py-3 font-mono font-semibold text-sm ${pnlClass}">${dollarSign}$${Math.abs(pnlDollars).toFixed(2)}</td><td class="px-4 py-3 font-mono font-semibold text-sm ${pnlClass}">${pnlSign}${r.returnPct.toFixed(2)}%</td>`,
        });
      })
      .join('');
  },

  /**
   * @param {import('../types.js').ScanResult[]} aiPicks
   * @param {{ llm?: { marketOverview?: string, picks?: Array<{ ticker: string, headline?: string, rationale?: string, risk?: string }> }, llmEnabled?: boolean, source?: string }|null} [aiResponse]
   */
  renderAIDesk(aiPicks, aiResponse = null) {
    const container = document.getElementById('aiDeskBody');
    const badge = document.getElementById('aiSourceBadge');
    const overview = document.getElementById('aiMarketOverview');

    if (!container) return;

    const llmMap = new Map(
      (aiResponse?.llm?.picks ?? []).map((p) => [p.ticker?.toUpperCase(), p])
    );

    if (badge) {
      const src = aiResponse?.llmEnabled ? 'Hybrid (Local + LLM)' : 'Local Meta-AI';
      badge.textContent = src;
      badge.className = aiResponse?.llmEnabled
        ? 'text-xs px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 border border-violet-700'
        : 'text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
    }

    if (overview) {
      overview.textContent = aiResponse?.llm?.marketOverview
        || 'AI synthesizes all strategy signals by category (trend, momentum, volume, fundamentals), detects conflicts, and ranks conviction.';
      overview.className = 'text-sm text-slate-400 leading-relaxed';
    }

    document.getElementById('aiDeskCount').textContent =
      aiPicks.length > 0 ? `${aiPicks.length} top conviction picks` : 'No bullish AI picks';

    if (aiPicks.length === 0) {
      container.innerHTML =
        '<p class="text-slate-500 text-sm text-center py-8">No stocks met AI bullish thresholds. Try widening the scan universe or adjusting active strategies.</p>';
      return;
    }

    container.innerHTML = aiPicks
      .map((r) => {
        const ai = r.ai;
        if (!ai) return '';

        const llm = llmMap.get(r.ticker.toUpperCase());
        const headline = llm?.headline || ai.summary;
        const rationale = llm?.rationale || '';
        const risk = llm?.risk || (ai.conflicts[0] ? `Risk: ${ai.conflicts[0]}` : '');

        const bulls = ai.bullFactors
          .map((f) => `<li class="text-emerald-400/90">${f}</li>`)
          .join('');
        const bears = ai.bearFactors
          .map((f) => `<li class="text-red-400/90">${f}</li>`)
          .join('');

        return `
      <article class="p-4 rounded-lg border border-slate-800 bg-slate-850/60 hover:border-violet-500/30 transition-colors">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-white">${r.ticker}</span>
              <span class="text-xs text-slate-500">${r.sector}</span>
              <span class="font-mono text-sm text-slate-300">$${r.price.toFixed(2)}</span>
              ${explainBtn(r.ticker, true)}
            </div>
            <div class="mt-1">${formatAIRec(ai)} <span class="text-xs text-slate-500 ml-2">AI score ${ai.aiScore >= 0 ? '+' : ''}${ai.aiScore.toFixed(3)}</span></div>
          </div>
          <div class="text-right text-xs text-slate-500">Consensus ${r.classification} (${r.score >= 0 ? '+' : ''}${r.score.toFixed(3)})</div>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed">${headline}</p>
        ${rationale ? `<p class="text-sm text-slate-400 mt-2 leading-relaxed">${rationale}</p>` : ''}
        ${risk ? `<p class="text-xs text-amber-400/90 mt-2">${risk}</p>` : ''}
        <details class="mt-3 text-xs">
          <summary class="cursor-pointer text-violet-400 hover:text-violet-300">Strategy breakdown</summary>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <ul class="space-y-1 list-disc list-inside">${bulls || '<li class="text-slate-500">No strong bull factors</li>'}</ul>
            <ul class="space-y-1 list-disc list-inside">${bears || '<li class="text-slate-500">No strong bear factors</li>'}</ul>
          </div>
        </details>
      </article>`;
      })
      .join('');
  },

  /**
   * @param {Array<{position: import('../types.js').Position, audit: import('../types.js').PortfolioAudit, portfolioAi?: import('../types.js').PortfolioAIAdvice}>} audits
   * @param {(ticker: string) => void} onRemove
   */
  renderPortfolio(audits, onRemove) {
    const tbody = document.getElementById('portfolioBody');

    if (audits.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="13" class="px-4 py-8 text-center text-slate-500 text-sm">No open positions. Add a position above or run a scan first.</td></tr>';
      return;
    }

    let totalCost = 0;
    let totalValue = 0;
    let totalPnl = 0;

    const rows = audits
      .map(({ position, audit, portfolioAi }) => {
        totalCost += audit.costBasis;
        totalValue += audit.marketValue;
        totalPnl += audit.pnlDollars;

        const pnlClass = audit.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400';
        const pnlSign = audit.returnPct >= 0 ? '+' : '';
        const dollarSign = audit.pnlDollars >= 0 ? '+' : '';
        const rrDisplay = audit.riskReward != null ? audit.riskReward.toFixed(2) : '—';
        const aiAdvice = portfolioAi?.advice ?? '—';
        const aiTitle = portfolioAi?.summary ?? '';
        const displayConsensus = mapPortfolioConsensus(audit.classification);
        const qty = audit.quantity;

        return `
    <tr class="hover:bg-slate-850/50 transition-colors">
      <td class="px-4 py-3">
        <div class="font-semibold text-white">${position.ticker}</div>
        ${explainBtn(position.ticker)}
      </td>
      <td class="px-4 py-3 font-mono text-sm">${qty}</td>
      <td class="px-4 py-3 font-mono text-sm">$${position.buyPrice.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono text-sm text-slate-300">$${audit.costBasis.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono text-sm">$${audit.marketPrice.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono text-sm text-slate-300">$${audit.marketValue.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono font-semibold ${pnlClass}">${dollarSign}$${Math.abs(audit.pnlDollars).toFixed(2)}</td>
      <td class="px-4 py-3 font-mono font-semibold ${pnlClass}">${pnlSign}${audit.returnPct.toFixed(2)}%</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass(displayConsensus)}">${displayConsensus}</span></td>
      <td class="px-4 py-3 font-mono text-sm">${audit.score.toFixed(3)}</td>
      <td class="px-4 py-3 font-mono text-sm text-slate-400">${rrDisplay}</td>
      <td class="px-4 py-3" title="${aiTitle.replace(/"/g, '&quot;')}"><span class="px-2 py-0.5 rounded text-xs font-semibold border ${aiBadgeClass(aiAdvice)}">${aiAdvice}</span></td>
      <td class="px-4 py-3"><span class="font-semibold text-sm ${actionBadgeClass(audit.action)}">${audit.action}</span></td>
      <td class="px-4 py-3 whitespace-nowrap">
        <button type="button" data-edit="${position.ticker}" class="btn-edit text-xs text-blue-400 hover:text-blue-300 transition-colors mr-3">Edit</button>
        <button type="button" data-remove="${position.ticker}" class="btn-remove text-xs text-slate-500 hover:text-red-400 transition-colors">Remove</button>
      </td>
    </tr>`;
      })
      .join('');

    const totalPnlClass = totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400';
    const totalPnlSign = totalPnl >= 0 ? '+' : '';
    const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    tbody.innerHTML =
      rows +
      `
    <tr class="bg-slate-850/80 border-t border-slate-700 font-semibold">
      <td class="px-4 py-3 text-slate-300" colspan="3">Portfolio total</td>
      <td class="px-4 py-3 font-mono text-sm">$${totalCost.toFixed(2)}</td>
      <td class="px-4 py-3"></td>
      <td class="px-4 py-3 font-mono text-sm">$${totalValue.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono ${totalPnlClass}">${totalPnlSign}$${Math.abs(totalPnl).toFixed(2)}</td>
      <td class="px-4 py-3 font-mono ${totalPnlClass}">${totalPnlSign}${totalPct.toFixed(2)}%</td>
      <td class="px-4 py-3" colspan="6"></td>
    </tr>`;

    tbody.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', () => onRemove(btn.dataset.remove));
    });
  },

  setPortfolioMessage(text, type = 'neutral') {
    const msg = document.getElementById('portfolioMsg');
    msg.textContent = text;
    const classes = {
      error: 'text-xs text-red-400 self-center',
      success: 'text-xs text-emerald-400 self-center',
      neutral: 'text-xs text-slate-500 self-center',
    };
    msg.className = classes[type] || classes.neutral;
  },

  clearPositionInputs() {
    this.resetPositionFormMode();
    document.getElementById('inputTicker').value = '';
    document.getElementById('inputBuyPrice').value = '';
    document.getElementById('inputQuantity').value = '1';
  },

  /**
   * @param {import('../types.js').Position} position
   */
  loadPositionForEdit(position) {
    const tickerEl = document.getElementById('inputTicker');
    tickerEl.value = position.ticker;
    tickerEl.readOnly = true;
    tickerEl.classList.add('opacity-80', 'cursor-not-allowed');

    document.getElementById('inputBuyPrice').value = String(position.buyPrice);
    document.getElementById('inputQuantity').value = String(position.quantity ?? 1);

    const btn = document.getElementById('btnAddPosition');
    if (btn) btn.textContent = 'Update Position';

    document.getElementById('btnCancelEdit')?.classList.remove('hidden');
    document.getElementById('portfolioForm')?.classList.add('ring-2', 'ring-amber-500/40', 'border-amber-700/50');

    document.getElementById('portfolioForm')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('inputBuyPrice')?.focus();
  },

  resetPositionFormMode() {
    const tickerEl = document.getElementById('inputTicker');
    if (tickerEl) {
      tickerEl.readOnly = false;
      tickerEl.classList.remove('opacity-80', 'cursor-not-allowed');
    }

    const btn = document.getElementById('btnAddPosition');
    if (btn) btn.textContent = 'Add Position';

    document.getElementById('btnCancelEdit')?.classList.add('hidden');
    document.getElementById('portfolioForm')?.classList.remove('ring-2', 'ring-amber-500/40', 'border-amber-700/50');
  },

  /** @returns {string|null} */
  getEditingTicker() {
    const tickerEl = document.getElementById('inputTicker');
    const btn = document.getElementById('btnAddPosition');
    if (tickerEl?.readOnly && btn?.textContent === 'Update Position') {
      return tickerEl.value.trim().toUpperCase() || null;
    }
    return null;
  },

  /**
   * @param {import('../types.js').StrategyEngine[]} registry
   */
  populateStrategyCheckboxes(registry) {
    const container = document.getElementById('strategyCheckboxes');
    if (!container) return;

    container.innerHTML = registry
      .map(
        (s) => `
      <label class="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
        <input type="checkbox" data-strategy-id="${s.id}" checked class="rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-700" />
        <span class="text-xs font-medium whitespace-nowrap">${s.name}</span>
      </label>`
      )
      .join('');
  },

  getScanConfig() {
    /** @type {Record<string, boolean>} */
    const strategies = {};
    document.querySelectorAll('[data-strategy-id]').forEach((el) => {
      if (el instanceof HTMLInputElement) {
        strategies[el.dataset.strategyId] = el.checked;
      }
    });

    return {
      totalStocks: parseInt(document.getElementById('inputTotalStocks').value, 10) || 500,
      topBuys: parseInt(document.getElementById('inputTopBuys').value, 10) || 15,
      strategies,
    };
  },

  getPositionInput() {
    return {
      ticker: document.getElementById('inputTicker').value.trim().toUpperCase(),
      buyPrice: parseFloat(document.getElementById('inputBuyPrice').value),
      quantity: parseInt(document.getElementById('inputQuantity').value, 10),
    };
  },

  getExplainTickerInput() {
    const el = document.getElementById('inputExplainTicker');
    return el ? el.value.trim().toUpperCase() : '';
  },

  openExplainModal(ticker, loading = false) {
    const modal = document.getElementById('explainModal');
    const title = document.getElementById('explainModalTitle');
    const subtitle = document.getElementById('explainModalSubtitle');
    const body = document.getElementById('explainModalBody');

    if (!modal || !body) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (title) title.textContent = loading ? `Analyzing ${ticker}…` : `${ticker} — Deep Dive`;
    if (subtitle) subtitle.textContent = loading ? 'Running all strategy engines' : '';

    body.innerHTML = loading
      ? `<div class="flex flex-col items-center justify-center py-16 gap-3">
          <div class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-slate-400">Synthesizing ${ticker} across all strategies…</p>
        </div>`
      : '';
  },

  closeExplainModal() {
    const modal = document.getElementById('explainModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  /**
   * @param {import('../types.js').TickerExplanation} explanation
   */
  renderExplainContent(explanation) {
    const title = document.getElementById('explainModalTitle');
    const subtitle = document.getElementById('explainModalSubtitle');
    const body = document.getElementById('explainModalBody');
    if (!body) return;

    const ai = explanation.ai;
    const src = explanation.llmEnabled ? 'Hybrid (Local + LLM)' : 'Local Meta-AI';

    if (title) title.textContent = `${explanation.ticker} — ${explanation.name}`;
    if (subtitle) {
      subtitle.textContent = `${explanation.sector} · $${explanation.price.toFixed(2)} · ${src}`;
    }

    const categoryRows = (explanation.categoryBreakdown ?? [])
      .map(
        (c) => `
      <tr class="border-b border-slate-800/80">
        <td class="py-2 pr-4 text-slate-300">${c.category}</td>
        <td class="py-2 pr-4 font-mono ${c.score >= 0 ? 'text-emerald-400' : 'text-red-400'}">${c.score >= 0 ? '+' : ''}${c.score.toFixed(3)}</td>
        <td class="py-2 text-slate-400">${c.bias}</td>
      </tr>`
      )
      .join('');

    const renderStrategyList = (items, colorClass) =>
      (items ?? [])
        .map(
          (s) =>
            `<li class="${colorClass}"><span class="text-slate-300 font-medium">${s.name}</span> <span class="text-slate-500">(${s.category})</span> — ${s.metric}</li>`
        )
        .join('') || '<li class="text-slate-500">None</li>';

    const llm = explanation.llm;
    const llmBlock = llm
      ? `
      <section class="mb-6 p-4 rounded-lg bg-violet-950/30 border border-violet-800/40">
        <h4 class="text-violet-300 font-semibold mb-2">${llm.headline || 'AI Narrative'}</h4>
        <p class="text-slate-300 leading-relaxed whitespace-pre-line">${llm.narrative || ''}</p>
        ${llm.catalysts?.length ? `<div class="mt-3"><span class="text-xs text-slate-500 uppercase">Catalysts</span><ul class="mt-1 list-disc list-inside text-emerald-400/90">${llm.catalysts.map((c) => `<li>${c}</li>`).join('')}</ul></div>` : ''}
        ${llm.risks?.length ? `<div class="mt-3"><span class="text-xs text-slate-500 uppercase">Risks</span><ul class="mt-1 list-disc list-inside text-amber-400/90">${llm.risks.map((r) => `<li>${r}</li>`).join('')}</ul></div>` : ''}
        ${llm.stance ? `<p class="mt-3 text-sm"><span class="text-slate-500">LLM stance:</span> <span class="font-semibold text-violet-300">${llm.stance}</span></p>` : ''}
      </section>`
      : '';

    body.innerHTML = `
      <div class="mb-4 flex flex-wrap items-center gap-3">
        ${formatAIRec(ai)}
        <span class="text-xs text-slate-500">Consensus: ${explanation.consensus.classification} (${explanation.consensus.score >= 0 ? '+' : ''}${explanation.consensus.score.toFixed(3)})</span>
        ${explanation.consensus.rsi != null ? `<span class="text-xs text-slate-500">RSI ${explanation.consensus.rsi.toFixed(1)}</span>` : ''}
      </div>

      <p class="text-slate-300 leading-relaxed mb-6">${explanation.verdict}</p>

      ${llmBlock}

      ${explanation.portfolioNote ? `<section class="mb-6 p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30"><h4 class="text-emerald-400 text-xs font-semibold uppercase mb-1">Your Position</h4><p class="text-slate-300">${explanation.portfolioNote}</p></section>` : ''}

      <section class="mb-6">
        <h4 class="text-slate-400 text-xs font-semibold uppercase mb-2">Signal tally (${explanation.signalTally.total} strategies)</h4>
        <div class="flex gap-4 text-sm">
          <span class="text-emerald-400">${explanation.signalTally.buy} BUY</span>
          <span class="text-amber-400">${explanation.signalTally.hold} HOLD</span>
          <span class="text-red-400">${explanation.signalTally.sell} SELL</span>
        </div>
      </section>

      <section class="mb-6">
        <h4 class="text-slate-400 text-xs font-semibold uppercase mb-2">Category scores</h4>
        <table class="w-full text-xs"><tbody>${categoryRows}</tbody></table>
      </section>

      ${explanation.conflicts?.length ? `<section class="mb-6"><h4 class="text-amber-400 text-xs font-semibold uppercase mb-2">Conflicts detected</h4><ul class="list-disc list-inside text-amber-400/90 space-y-1">${explanation.conflicts.map((c) => `<li>${c}</li>`).join('')}</ul></section>` : ''}

      <section class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="text-emerald-400 text-xs font-semibold uppercase mb-2">Bull case</h4>
          <ul class="space-y-2 text-xs list-none">${renderStrategyList(explanation.strategiesBySignal.BUY, 'text-emerald-400/90')}</ul>
        </div>
        <div>
          <h4 class="text-red-400 text-xs font-semibold uppercase mb-2">Bear case</h4>
          <ul class="space-y-2 text-xs list-none">${renderStrategyList(explanation.strategiesBySignal.SELL, 'text-red-400/90')}</ul>
        </div>
      </section>

      <section class="p-4 rounded-lg bg-slate-850 border border-slate-800">
        <h4 class="text-violet-300 text-xs font-semibold uppercase mb-2">Action plan</h4>
        <ul class="list-disc list-inside text-slate-300 space-y-1">${explanation.actionPlan.map((a) => `<li>${a}</li>`).join('')}</ul>
      </section>

      <p class="mt-6 text-xs text-slate-600 text-center">For research and education only — not financial advice.</p>
    `;
  },
};
