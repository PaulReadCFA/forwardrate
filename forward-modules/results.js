/**
 * Results Display Module - Forward Rate Calculator
 *
 * Changes:
 *  #14 no space between USD and number
 *  #15 @ -> "at"
 *  #25 description: "The one-year rate starting in Year 1"
 *  #26 purple box title: F coloured, subscript 1,2 body text (CSS .forward-rate-result-sub)
 */

import { formatCurrency, formatPercentage, createElement } from './utils.js';

/** #14/#17: format with no space after USD */
function fmtMoney(value) {
  const abs = Math.abs(value);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `\u2212USD${str}` : `USD${str}`;
}

export function renderResults(calculations, params) {
  const container = document.getElementById('results-content');
  if (!container) { console.error('Results container not found'); return; }
  container.innerHTML = '';

  container.appendChild(createForwardRateBox(calculations));
  container.appendChild(createStrategy1Box(calculations, params));
  container.appendChild(createStrategy2Box(calculations, params));

  // #21: update always-visible no-arbitrage note
  const note = document.getElementById('no-arbitrage-note');
  if (note) {
    note.style.display = 'block';
    // #20: no space between USD and number
    note.textContent = `No Arbitrage: Both strategies yield ${fmtMoney(calculations.strategy1Final)}`;
  }
}

function createForwardRateBox(calculations) {
  const box = createElement('div', { className: 'result-box forward-rate' });

  // #26: use innerHTML so we can force uniform bold on the subscript characters
  const title = document.createElement('h5');
  title.style.cssText = 'font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;';
  // Wrap everything in a span with consistent weight
  title.innerHTML = '<span style="font-weight:700;"><span style="color:#5b21b6;">Implied Forward Rate <em>F</em></span><sub class="forward-rate-result-sub">1,2</sub></span>';
  box.appendChild(title);

  const value = createElement('div', { className: 'result-value' }, formatPercentage(calculations.forwardRate));
  box.appendChild(value);

  // #25: "The one-year rate starting in Year 1"
  const description = document.createElement('div');
  description.className = 'result-description';
  description.style.cssText = 'font-size: 0.875rem; margin-top: 0.5rem; color: #374151;';
  description.textContent = 'The one-year rate starting in Year 1';
  box.appendChild(description);

  return box;
}

function createStrategy1Box(calculations, params) {
  const box = createElement('div', { className: 'result-box strategy' });

  const title = createElement('h5', {
    style: 'color: #1e40af; font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'One-Year Strategy');
  box.appendChild(title);

  const details = createElement('div', { className: 'strategy-details' });

  // #14: no space; #15: "at" instead of @
  const step1 = document.createElement('div');
  step1.style.marginBottom = '0.5rem';
  step1.innerHTML = `<strong>Year 0 → 1:</strong> ${fmtMoney(100)} at ${formatPercentage(params.spot1Year)} = ${fmtMoney(calculations.strategy1Year1Value)}`;
  details.appendChild(step1);

  const step2 = document.createElement('div');
  step2.style.marginBottom = '0.5rem';
  step2.innerHTML = `<strong>Year 1 → 2:</strong> ${fmtMoney(calculations.strategy1Year1Value)} at ${formatPercentage(calculations.forwardRate)} = ${fmtMoney(calculations.strategy1Final)}`;
  details.appendChild(step2);

  const final = document.createElement('div');
  final.className = 'forward-rate-strategy-final forward-rate-strategy-final--one-year';
  final.innerHTML = `<strong>Final Value:</strong> ${fmtMoney(calculations.strategy1Final)}`;
  details.appendChild(final);

  box.appendChild(details);
  return box;
}

function createStrategy2Box(calculations, params) {
  const box = createElement('div', { className: 'result-box strategy-twoyear' });

  const title = createElement('h5', {
    style: 'color: #c2410c; font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'Two-Year Strategy');
  box.appendChild(title);

  const details = createElement('div', { className: 'strategy-details' });

  // #14/#15
  const desc = document.createElement('div');
  desc.style.marginBottom = '0.5rem';
  desc.innerHTML = `<strong>Year 0 → 2:</strong> ${fmtMoney(100)} at ${formatPercentage(params.spot2Year)} annually`;
  details.appendChild(desc);

  const final = document.createElement('div');
  final.className = 'forward-rate-strategy-final forward-rate-strategy-final--two-year';
  final.innerHTML = `<strong>Final Value:</strong> ${fmtMoney(calculations.strategy2Final)}`;
  details.appendChild(final);

  box.appendChild(details);
  return box;
}