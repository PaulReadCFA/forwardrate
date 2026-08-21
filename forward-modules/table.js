/**
 * Table Rendering Module - Forward Rate Calculator
 *
 * Changes:
 *  #5  striping already in base CSS; tfoot uses contrasting bg
 *  #19 italic r / F in interest rates column
 *  #20 no space between USD and number in no-arbitrage note
 *  #21 no-arbitrage note lives in HTML (always visible) - table just updates it
 */

import { $, formatCurrency, formatPercentage, announceToScreenReader, applyTableRoles } from './utils.js';

/** Numeric amount for table cells; the unit is carried by the column header. */
function fmtMoneyAmount(value) {
  const abs = Math.abs(value);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `\u2212${str}` : str;
}

/** Currency for prose outside the table body. */
function fmtMoney(value) {
  const amount = fmtMoneyAmount(value);
  return amount.startsWith('\u2212') ? `\u2212USD${amount.slice(1)}` : `USD${amount}`;
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
        <th scope="col" class="text-right table-var-2">One-Year Strategy<br>Cash Flows (USD)</th>
        <th scope="col" class="text-right table-var-6">Two-Year Strategy<br>Cash Flows (USD)</th>
        <th scope="col" class="text-right">Interest Rates</th>
      </tr>
    </thead>
    <tbody>`;

  cashFlows.forEach((cf) => {
    const isYear0 = cf.year === 0;
    const isYear1 = cf.year === 1;
    const isYear2 = cf.year === 2;

    // data-label mirrors the column header: it becomes the visible label when the
    // shared base reflows each row into a card below 768px. cell-value keeps
    // multi-line cell content together as one element beside that label.
    html += `
      <tr>
        <th scope="row" class="text-left" data-label="Year">${cf.year}</th>
        <td class="text-right" data-label="One-Year Strategy Cash Flows (USD)"><span class="cell-value table-var-2">${formatStrategy1(cf, isYear0, isYear1, isYear2)}</span></td>
        <td class="text-right" data-label="Two-Year Strategy Cash Flows (USD)"><span class="cell-value table-var-6">${formatStrategy2(cf, isYear0, isYear2)}</span></td>
        <td class="text-right" data-label="Interest Rates"><span class="cell-value">${formatRates(cf)}</span></td>
      </tr>`;
  });

  // #20: no space between USD and number in tfoot
  html += `
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="text-right">
          <strong>No Arbitrage:</strong> Both strategies yield ${fmtMoney(calculations.strategy1Final)}
        </td>
      </tr>
    </tfoot>`;

  table.innerHTML = html;
  applyTableRoles(table);

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
  if (isYear0) return fmtMoneyAmount(cf.strategy1Cash);
  if (isYear1) return `Maturity: ${fmtMoneyAmount(cf.strategy1Maturity)}<br>Reinvest: ${fmtMoneyAmount(cf.strategy1Reinvest)}`;
  if (isYear2) return fmtMoneyAmount(cf.strategy1Cash);
  return '&ndash;';
}

function formatStrategy2(cf, isYear0, isYear2) {
  if (isYear0) return fmtMoneyAmount(cf.strategy2Cash);
  if (isYear2) return fmtMoneyAmount(cf.strategy2Cash);
  return '&ndash;';
}

/** Variables use math-italic glyphs; all table body text remains neutral. */
function formatRates(cf) {
  const rates = [];
  if (cf.spot1Year  !== null) rates.push(`<div class="forward-rate-table-rate table-var-5" style="margin-bottom:0.25rem;">𝑟\u2081 = ${formatPercentage(cf.spot1Year)}</div>`);
  if (cf.spot2Year  !== null) rates.push(`<div class="forward-rate-table-rate table-var-red" style="margin-bottom:0.25rem;">𝑟\u2082 = ${formatPercentage(cf.spot2Year)}</div>`);
  if (cf.forwardRate !== null) rates.push(`<div class="forward-rate-table-rate table-var-3">𝐹\u2081,\u2082 = ${formatPercentage(cf.forwardRate)}</div>`);
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