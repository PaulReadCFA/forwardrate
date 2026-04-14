/**
 * Table Rendering Module - Forward Rate Calculator
 *
 * Changes:
 *  #5  striping already in base CSS; tfoot uses contrasting bg
 *  #19 italic r / F in interest rates column
 *  #20 no space between USD and number in no-arbitrage note
 *  #21 no-arbitrage note lives in HTML (always visible) - table just updates it
 */

import { $, formatCurrency, formatPercentage, announceToScreenReader } from './utils.js';

/** No space after USD (#20) */
function fmtMoney(value) {
  const abs = Math.abs(value);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `\u2212USD${str}` : `USD${str}`;
}

export function renderTable(calculations, announce = false) {
  const table = $('#cash-flow-table');
  if (!table) { console.error('Table element not found'); return; }

  const cashFlows = calculations.cashFlows;

  let html = `
    <caption class="sr-only">
      Forward rate analysis showing year, one-year strategy cash flows, two-year strategy cash flows,
      and interest rates including spot rates and implied forward rate.
    </caption>
    <thead>
      <tr>
        <th scope="col" class="text-left">Year</th>
        <th scope="col" class="text-right">One-Year Strategy<br>Cash Flows (USD)</th>
        <th scope="col" class="text-right">Two-Year Strategy<br>Cash Flows (USD)</th>
        <th scope="col" class="text-right">Interest Rates</th>
      </tr>
    </thead>
    <tbody>`;

  cashFlows.forEach((cf) => {
    const isYear0 = cf.year === 0;
    const isYear1 = cf.year === 1;
    const isYear2 = cf.year === 2;

    html += `
      <tr>
        <td class="text-left"><strong>${cf.year}</strong></td>
        <td class="text-right">${formatStrategy1(cf, isYear0, isYear1, isYear2)}</td>
        <td class="text-right">${formatStrategy2(cf, isYear0, isYear2)}</td>
        <td class="text-right">${formatRates(cf)}</td>
      </tr>`;
  });

  // #20: no space between USD and number in tfoot
  html += `
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="text-right" style="padding:0.75rem;">
          <strong>No Arbitrage:</strong> Both strategies yield ${fmtMoney(calculations.strategy1Final)}
        </td>
      </tr>
    </tfoot>`;

  table.innerHTML = html;
  table.setAttribute('aria-label', 'Forward rate analysis showing cash flows and interest rates');

  // #21: also update always-visible note div
  const note = document.getElementById('no-arbitrage-note');
  if (note) {
    note.style.display = 'block';
    note.textContent = `No Arbitrage: Both strategies yield ${fmtMoney(calculations.strategy1Final)}`;
  }

  // Only announce when table is actually visible — avoids misleading SR users in chart view
  if (announce) {
    announceToScreenReader('Table updated with new forward rate analysis.');
  }
  setupTableKeyboardEscape();
}

function formatStrategy1(cf, isYear0, isYear1, isYear2) {
  if (isYear0) return fmtMoney(cf.strategy1Cash);
  if (isYear1) return `Maturity: ${fmtMoney(cf.strategy1Maturity)}<br>Reinvest: ${fmtMoney(cf.strategy1Reinvest)}`;
  if (isYear2) return fmtMoney(cf.strategy1Cash);
  return '&ndash;';
}

function formatStrategy2(cf, isYear0, isYear2) {
  if (isYear0) return fmtMoney(cf.strategy2Cash);
  if (isYear2) return fmtMoney(cf.strategy2Cash);
  return '&ndash;';
}

/** #19: italic r and F in table rates column */
function formatRates(cf) {
  const rates = [];
  if (cf.spot1Year  !== null) rates.push(`<div class="forward-rate-table-rate" style="margin-bottom:0.25rem;"><span style="color:#047857;"><em>r</em></span><span class="forward-rate-table-index">\u2081</span><span style="color:#047857;">: ${formatPercentage(cf.spot1Year)}</span></div>`);
  if (cf.spot2Year  !== null) rates.push(`<div class="forward-rate-table-rate" style="margin-bottom:0.25rem;"><span style="color:#dc2626;"><em>r</em></span><span class="forward-rate-table-index">\u2082</span><span style="color:#dc2626;">: ${formatPercentage(cf.spot2Year)}</span></div>`);
  if (cf.forwardRate !== null) rates.push(`<div class="forward-rate-table-rate"><span style="color:#7a46ff;"><em>F</em></span><span class="forward-rate-table-index">\u2081,\u2082</span><span style="color:#7a46ff;">: ${formatPercentage(cf.forwardRate)}</span></div>`);
  return rates.length > 0 ? rates.join('') : '&ndash;';
}

function setupTableKeyboardEscape() {
  const table = document.getElementById('cash-flow-table');
  if (!table) return;
  if (table._escapeListener) table.removeEventListener('keydown', table._escapeListener);
  const escapeListener = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      const calculator = document.getElementById('calculator');
      if (calculator) {
        calculator.focus();
        announceToScreenReader('Exited table, moved to calculator section');
      }
    }
  };
  table._escapeListener = escapeListener;
  table.addEventListener('keydown', escapeListener);
}