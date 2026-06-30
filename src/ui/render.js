/** DOM rendering helpers */

function badgeClass(signal) {
  if (signal === 'BUY') return 'text-emerald-400 bg-emerald-900/40 border-emerald-700';
  if (signal === 'SELL') return 'text-red-400 bg-red-900/40 border-red-700';
  return 'text-amber-400 bg-amber-900/40 border-amber-700';
}

function actionBadgeClass(action) {
  if (action === 'STRONG HOLD') return 'text-emerald-400';
  if (action === 'TAKE PROFIT') return 'text-amber-400';
  return 'text-red-500';
}

function formatMetrics(strategyResults) {
  return strategyResults
    .map(
      (r) =>
        `<div class="metric-mono text-slate-400 leading-relaxed"><span class="text-slate-500">${r.name}:</span> ${r.metricDisplay}</div>`
    )
    .join('');
}

function renderDeskRow(r, index, scoreClass) {
  const scorePrefix = r.score >= 0 && scoreClass.includes('emerald') ? '+' : '';
  return `
    <tr class="hover:bg-slate-850/50 transition-colors">
      <td class="px-4 py-3 text-slate-500 font-mono text-xs">${index + 1}</td>
      <td class="px-4 py-3 font-semibold text-white">${r.ticker}</td>
      <td class="px-4 py-3 text-slate-400 text-xs">${r.sector}</td>
      <td class="px-4 py-3 font-mono text-sm">$${r.price.toFixed(2)}</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass(r.classification)}">${r.classification}</span></td>
      <td class="px-4 py-3 font-mono ${scoreClass} font-semibold">${scorePrefix}${r.score.toFixed(3)}</td>
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

  setScanning(active) {
    const btn = document.getElementById('btnScan');
    const indicator = document.getElementById('scanIndicator');
    btn.disabled = active;
    btn.classList.toggle('opacity-60', active);
    btn.classList.toggle('cursor-not-allowed', active);
    indicator.classList.toggle('hidden', !active);
  },

  /**
   * @param {import('../types.js').ScanResult[]} buys
   * @param {number} totalBuys
   */
  renderBuyDesk(buys, totalBuys) {
    document.getElementById('buyDeskCount').textContent = `${buys.length} of ${totalBuys} BUY signals`;
    const tbody = document.getElementById('buyDeskBody');

    if (buys.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="px-4 py-12 text-center text-slate-500">No BUY candidates meeting consensus threshold (score ≥ 0.4).</td></tr>';
      return;
    }

    tbody.innerHTML = buys.map((r, i) => renderDeskRow(r, i, 'text-emerald-400')).join('');
  },

  /**
   * @param {import('../types.js').ScanResult[]} holds
   * @param {number} totalHolds
   */
  renderHoldDesk(holds, totalHolds) {
    document.getElementById('holdDeskCount').textContent = `${holds.length} of ${totalHolds} HOLD signals`;
    const tbody = document.getElementById('holdDeskBody');

    if (holds.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="px-4 py-12 text-center text-slate-500">No HOLD candidates in neutral zone (-0.3 to 0.39).</td></tr>';
      return;
    }

    tbody.innerHTML = holds.map((r, i) => renderDeskRow(r, i, 'text-amber-400')).join('');
  },

  /**
   * @param {Array<{position: import('../types.js').Position, audit: import('../types.js').PortfolioAudit}>} audits
   * @param {(ticker: string) => void} onRemove
   */
  renderPortfolio(audits, onRemove) {
    const tbody = document.getElementById('portfolioBody');

    if (audits.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-500 text-sm">No open positions. Add a position above or run a scan first.</td></tr>';
      return;
    }

    tbody.innerHTML = audits
      .map(({ position, audit }) => {
        const pnlClass = audit.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400';
        const pnlSign = audit.returnPct >= 0 ? '+' : '';
        return `
    <tr class="hover:bg-slate-850/50 transition-colors">
      <td class="px-4 py-3 font-semibold text-white">${position.ticker}</td>
      <td class="px-4 py-3 font-mono text-sm">$${position.buyPrice.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono text-sm">$${audit.marketPrice.toFixed(2)}</td>
      <td class="px-4 py-3 font-mono font-semibold ${pnlClass}">${pnlSign}${audit.returnPct.toFixed(2)}%</td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass(audit.classification)}">${audit.classification}</span></td>
      <td class="px-4 py-3 font-mono text-sm">${audit.score.toFixed(3)}</td>
      <td class="px-4 py-3"><span class="font-semibold text-sm ${actionBadgeClass(audit.action)}">${audit.action}</span></td>
      <td class="px-4 py-3"><button data-remove="${position.ticker}" class="btn-remove text-xs text-slate-500 hover:text-red-400 transition-colors">Remove</button></td>
    </tr>`;
      })
      .join('');

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
    document.getElementById('inputTicker').value = '';
    document.getElementById('inputBuyPrice').value = '';
  },

  getScanConfig() {
    return {
      totalStocks: parseInt(document.getElementById('inputTotalStocks').value, 10) || 500,
      topBuys: parseInt(document.getElementById('inputTopBuys').value, 10) || 15,
      topHolds: parseInt(document.getElementById('inputTopHolds').value, 10) || 15,
      strategies: {
        ma: document.getElementById('stratMA').checked,
        rsi: document.getElementById('stratRSI').checked,
        macd: document.getElementById('stratMACD').checked,
        bb: document.getElementById('stratBB').checked,
        stoch: document.getElementById('stratStoch').checked,
      },
    };
  },

  getPositionInput() {
    return {
      ticker: document.getElementById('inputTicker').value.trim().toUpperCase(),
      buyPrice: parseFloat(document.getElementById('inputBuyPrice').value),
    };
  },
};
