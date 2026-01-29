/**
 * Table Rendering Module - Forward Rate Calculator
 * Renders accessible data table for forward rate analysis
 */

import { $, formatCurrency, formatPercentage, announceToScreenReader } from './utils.js';

/**
 * Render forward rate analysis table
 */
export function renderTable(calculations) {
  const table = $('#cash-flow-table');

  if (!table) {
    console.error('Table element not found');
    return;
  }

  const cashFlows = calculations.cashFlows;

  let html = `
    <caption class="sr-only">
      Forward rate analysis showing year, one-year strategy cash flows, two-year strategy cash flows, 
      and interest rates including spot rates and forward rate.
    </caption>

    <thead>
      <tr>
        <th scope="col" class="text-left">Year</th>
        <th scope="col" class="text-right">One-Year Strategy</th>
        <th scope="col" class="text-right">Two-Year Strategy</th>
        <th scope="col" class="text-right">Interest Rates</th>
      </tr>
    </thead>

    <tbody>`;

  cashFlows.forEach((cf, index) => {
    const isYear0 = cf.year === 0;
    const isYear1 = cf.year === 1;
    const isYear2 = cf.year === 2;

    html += `
      <tr>
        <td class="text-left"><strong>${cf.year}</strong></td>
        <td class="text-right">
          ${formatStrategy1(cf, isYear0, isYear1, isYear2)}
        </td>
        <td class="text-right">
          ${formatStrategy2(cf, isYear0, isYear2)}
        </td>
        <td class="text-right">
          ${formatRates(cf)}
        </td>
      </tr>`;
  });

  html += `
    </tbody>
    
    <tfoot>
      <tr>
        <td colspan="4" class="text-right">
          <strong>No Arbitrage:</strong> Both strategies yield ${formatCurrency(calculations.strategy1Final)}
        </td>
      </tr>
    </tfoot>
  `;

  table.innerHTML = html;
  table.setAttribute('aria-label', 'Forward rate analysis table. Press Escape to exit table.');
  
  announceToScreenReader('Table view loaded with forward rate analysis.');
  setupTableKeyboardEscape();
}

function formatStrategy1(cf, isYear0, isYear1, isYear2) {
  let result = '';
  
  if (isYear0) {
    result = formatCurrency(cf.strategy1Cash);
  } else if (isYear1) {
    result = `Maturity: ${formatCurrency(cf.strategy1Maturity)}<br>`;
    result += `Reinvest: ${formatCurrency(cf.strategy1Reinvest)}`;
  } else if (isYear2) {
    result = formatCurrency(cf.strategy1Cash);
  }
  
  return result || '-';
}

function formatStrategy2(cf, isYear0, isYear2) {
  if (isYear0) {
    return formatCurrency(cf.strategy2Cash);
  } else if (isYear2) {
    return formatCurrency(cf.strategy2Cash);
  }
  return '-';
}

function formatRates(cf) {
  const rates = [];
  
  if (cf.spot1Year !== null) {
    rates.push(`<div style="color: #047857; margin-bottom: 0.25rem;">r₁: ${formatPercentage(cf.spot1Year)}</div>`);
  }
  if (cf.spot2Year !== null) {
    rates.push(`<div style="color: #dc2626; margin-bottom: 0.25rem;">r₂: ${formatPercentage(cf.spot2Year)}</div>`);
  }
  if (cf.forwardRate !== null) {
    rates.push(`<div style="color: #7a46ff;">f(1,1): ${formatPercentage(cf.forwardRate)}</div>`);
  }
  
  return rates.length > 0 ? rates.join('') : '-';
}

function getStrategy1Tooltip(cf, isYear0, isYear1, isYear2) {
  if (isYear0) {
    return 'Initial investment of USD 100';
  } else if (isYear1) {
    return `USD 100 invested at 1-year spot rate matures to ${formatCurrency(cf.strategy1Maturity)}, then reinvested at forward rate`;
  } else if (isYear2) {
    return `Final value after reinvesting at forward rate f(1,1) = ${formatCurrency(cf.strategy1Cash)}`;
  }
  return '';
}

function getStrategy2Tooltip(cf, isYear0, isYear2) {
  if (isYear0) {
    return 'Initial investment of USD 100';
  } else if (isYear2) {
    return `Final value after 2 years at 2-year spot rate = ${formatCurrency(cf.strategy2Cash)}`;
  }
  return 'No cash flow in year 1';
}

function getRatesTooltip(cf) {
  const tooltips = [];
  
  if (cf.spot1Year !== null) {
    tooltips.push(`1-year spot rate: ${formatPercentage(cf.spot1Year)}`);
  }
  if (cf.spot2Year !== null) {
    tooltips.push(`2-year spot rate: ${formatPercentage(cf.spot2Year)}`);
  }
  if (cf.forwardRate !== null) {
    tooltips.push(`Forward rate f(1,1): ${formatPercentage(cf.forwardRate)} - the implied 1-year rate starting in year 1`);
  }
  
  return tooltips.join('. ');
}

function setupTableKeyboardEscape() {
  const table = document.getElementById('cash-flow-table');
  
  if (!table) return;
  
  if (table._escapeListener) {
    table.removeEventListener('keydown', table._escapeListener);
  }
  
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