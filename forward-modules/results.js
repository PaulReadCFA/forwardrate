/**
 * Results Display Module - Forward Rate Calculator
 * Renders forward rate and strategy comparison results
 */

import { formatCurrency, formatPercentage, createElement } from './utils.js';

/**
 * Render results and analysis section
 */
export function renderResults(calculations, params) {
  const container = document.getElementById('results-content');
  
  if (!container) {
    console.error('Results container not found');
    return;
  }
  
  container.innerHTML = '';
  
  // Forward rate result box
  const forwardBox = createForwardRateBox(calculations);
  container.appendChild(forwardBox);
  
  // Strategy 1 box
  const strategy1Box = createStrategy1Box(calculations, params);
  container.appendChild(strategy1Box);
  
  // Strategy 2 box
  const strategy2Box = createStrategy2Box(calculations, params);
  container.appendChild(strategy2Box);
}

/**
 * Create forward rate result box
 */
function createForwardRateBox(calculations) {
  const box = createElement('div', { className: 'result-box forward-rate' });
  
  const title = createElement('h5', { 
    className: 'result-title',
    style: 'color: #5b21b6; font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'Implied Forward Rate F₁,₂');
  box.appendChild(title);
  
  const value = createElement('div', {
    className: 'result-value',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  }, formatPercentage(calculations.forwardRate));
  box.appendChild(value);
  
  const description = createElement('div', { 
    className: 'result-description',
    style: 'font-size: 0.875rem; margin-top: 0.5rem; color: #374151;'
  }, 'The 1-year rate starting in year 1');
  box.appendChild(description);
  
  return box;
}

/**
 * Create one-year strategy box
 */
function createStrategy1Box(calculations, params) {
  const box = createElement('div', { className: 'result-box strategy' });
  
  const title = createElement('h5', { 
    className: 'result-title',
    style: 'color: #1e40af; font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'One-Year Strategy');
  box.appendChild(title);
  
  const details = createElement('div', { className: 'strategy-details' });
  
  // Year 0 to 1
  const step1 = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  step1.innerHTML = `<strong>Year 0 → 1:</strong> USD 100 @ ${formatPercentage(params.spot1Year)} = ${formatCurrency(calculations.strategy1Year1Value)}`;
  details.appendChild(step1);
  
  // Year 1 to 2
  const step2 = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  step2.innerHTML = `<strong>Year 1 → 2:</strong> ${formatCurrency(calculations.strategy1Year1Value)} @ ${formatPercentage(calculations.forwardRate)} = ${formatCurrency(calculations.strategy1Final)}`;
  details.appendChild(step2);
  
  // Final value
  const final = createElement('div', { 
    style: 'font-weight: 600; padding-top: 0.75rem; margin-top: 0.75rem; border-top: 2px solid #3c6ae5; color: #1e40af; font-size: 1rem;'
  });
  final.innerHTML = `<strong>Final Value:</strong> ${formatCurrency(calculations.strategy1Final)}`;
  details.appendChild(final);
  
  box.appendChild(details);
  
  return box;
}

/**
 * Create two-year strategy box
 */
function createStrategy2Box(calculations, params) {
  const box = createElement('div', { className: 'result-box strategy-twoyear' });
  
  const title = createElement('h5', { 
    className: 'result-title',
    style: 'color: #c2410c; font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'Two-Year Strategy');
  box.appendChild(title);
  
  const details = createElement('div', { className: 'strategy-details' });
  
  // Investment description
  const desc = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  desc.innerHTML = `<strong>Year 0 → 2:</strong> USD 100 @ ${formatPercentage(params.spot2Year)} annually`;
  details.appendChild(desc);
  
  // Final value
  const final = createElement('div', { 
    style: 'font-weight: 600; padding-top: 0.75rem; margin-top: 0.75rem; border-top: 2px solid #ea792d; color: #c2410c; font-size: 1rem;'
  });
  final.innerHTML = `<strong>Final Value:</strong> ${formatCurrency(calculations.strategy2Final)}`;
  details.appendChild(final);
  
  box.appendChild(details);
  
  return box;
}