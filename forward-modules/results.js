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
  
  const title = createElement('h5', { className: 'result-title forward-rate' }, 
    'Implied Forward Rate f(1,1)'
  );
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
  
  // Formula display
  const formulaDiv = createElement('div', {
    style: 'margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; font-size: 0.8125rem; color: #4b5563;'
  });
  
  formulaDiv.innerHTML = `
    <div style="margin-bottom: 0.25rem;"><strong>Formula:</strong> f(1,1) = [(1 + s₂)² ÷ (1 + s₁)] - 1</div>
    <div style="color: #7a46ff; font-weight: 600;">✓ No arbitrage condition satisfied</div>
  `;
  
  box.appendChild(formulaDiv);
  
  return box;
}

/**
 * Create one-year strategy box
 */
function createStrategy1Box(calculations, params) {
  const box = createElement('div', { className: 'result-box strategy' });
  
  const title = createElement('h5', { 
    className: 'result-title',
    style: 'color: #3c6ae5; font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'One-Year Strategy');
  box.appendChild(title);
  
  const details = createElement('div', { className: 'strategy-details' });
  
  // Year 0 to 1
  const step1 = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  step1.innerHTML = `<strong>Year 0 → 1:</strong> $100 @ ${formatPercentage(params.spot1Year)} = ${formatCurrency(calculations.strategy1Year1Value)}`;
  details.appendChild(step1);
  
  // Year 1 to 2
  const step2 = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  step2.innerHTML = `<strong>Year 1 → 2:</strong> ${formatCurrency(calculations.strategy1Year1Value)} @ ${formatPercentage(calculations.forwardRate)} = ${formatCurrency(calculations.strategy1Final)}`;
  details.appendChild(step2);
  
  // Calculation detail
  const calc = createElement('div', { 
    style: 'font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; padding: 0.5rem; background: #f9fafb; border-radius: 0.25rem;'
  });
  calc.innerHTML = `Compound: ${formatCurrency(calculations.strategy1Year1Value)} × (1 + ${(calculations.forwardRateDecimal).toFixed(4)}) = ${formatCurrency(calculations.strategy1Final)}`;
  details.appendChild(calc);
  
  // Final value
  const final = createElement('div', { 
    style: 'font-weight: 600; padding-top: 0.75rem; border-top: 2px solid #3c6ae5; color: #1e40af; font-size: 1rem;'
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
    style: 'color: #ea792d; font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;'
  }, 'Two-Year Strategy');
  box.appendChild(title);
  
  const details = createElement('div', { className: 'strategy-details' });
  
  // Investment description
  const desc = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  desc.innerHTML = `<strong>Year 0 → 2:</strong> $100 @ ${formatPercentage(params.spot2Year)} annually`;
  details.appendChild(desc);
  
  // Compound calculation
  const compound = createElement('div', { style: 'margin-bottom: 0.5rem;' });
  const compoundFactor = Math.pow(1 + params.spot2Year/100, 2);
  compound.innerHTML = `<strong>Compound:</strong> (1 + ${(params.spot2Year/100).toFixed(4)})² = ${compoundFactor.toFixed(4)}`;
  details.appendChild(compound);
  
  // Full calculation
  const calc = createElement('div', { 
    style: 'font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; padding: 0.5rem; background: #fff7ed; border-radius: 0.25rem;'
  });
  calc.innerHTML = `Full calculation: $100 × ${compoundFactor.toFixed(4)} = ${formatCurrency(calculations.strategy2Final)}`;
  details.appendChild(calc);
  
  // Final value
  const final = createElement('div', { 
    style: 'font-weight: 600; padding-top: 0.75rem; border-top: 2px solid #ea792d; color: #c2410c; font-size: 1rem;'
  });
  final.innerHTML = `<strong>Final Value:</strong> ${formatCurrency(calculations.strategy2Final)}`;
  details.appendChild(final);
  
  box.appendChild(details);
  
  return box;
}
