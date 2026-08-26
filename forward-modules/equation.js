/**
 * Dynamic Equation Module - Forward Rate Calculator
 * Renders equation with actual calculated values
 */

import { formatPercentage } from './utils.js';

/**
 * Render dynamic equation with user's values
 */
export function renderDynamicEquation(calculations, params) {
  const container = document.getElementById('dynamic-mathml-equation');
  
  if (!container) {
    console.error('Dynamic equation container not found');
    return;
  }
  
  const { forwardRate } = calculations;
  const { spot1Year, spot2Year } = params;
  
  // Convert to decimals for display
  const s1 = (spot1Year / 100).toFixed(4);
  const s2 = (spot2Year / 100).toFixed(4);
  const forwardDecimal = (forwardRate / 100).toFixed(4);
  const forwardPercent = forwardRate.toFixed(2);
  
  // Build equation with actual numeric values - show both decimal and percentage
  // Indices 1,2 use body text colour; only F / result highlight use purple (same for r in static MathML)
  const mathML = `
    <div style="text-align: center; font-size: 1.25rem; padding: 1rem;">
      $$ {\\color{#7a46ff}{F}}_{\\color{#374151}{1,2}} = \\frac{(1+\\color{#dc2626}{${s2}})^2}{(1+\\color{#07514F}{${s1}})} - 1 = \\color{#7a46ff}{${forwardDecimal} = ${forwardPercent}\\%}$$
    </div>
  `;
  
  // Hide before updating to prevent raw LaTeX flashing during MathJax re-render
  container.style.visibility = 'hidden';
  container.innerHTML = mathML;

  const reveal = () => {
    container.style.visibility = 'visible';
    container.setAttribute(
      'aria-label',
      `Forward rate equation with your values. Result: ${forwardPercent}% (${forwardDecimal} decimal)`
    );
    // MathJax can hand back focusable wrappers even with inTabOrder:false;
    // drop the generated tabindex without hiding the rendered maths
    container
      .querySelectorAll('.MathJax[tabindex], .MathJax_Display[tabindex]')
      .forEach((el) => el.removeAttribute('tabindex'));
  };

  // After MathJax renders: reveal and update aria-label with the computed result
  // so SR users hear the full equation result on first tab — no input change needed
  if (window.MathJax) {
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, container], reveal);
  } else {
    reveal();
  }
  
  // Create screen-reader friendly announcement - concise update
  const announcement = `Forward rate: ${forwardPercent}% or ${forwardDecimal} decimal`;
  
  // Update aria-live region for screen readers
  let liveRegion = document.getElementById('equation-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'equation-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = announcement;
}