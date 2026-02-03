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
  const mathML = `
    <div style="text-align: center; font-size: 1.25rem; padding: 1rem;">
      $$\\color{#7a46ff}{F_{1,2}} = \\frac{(1+\\color{#dc2626}{${s2}})^2}{(1+\\color{#047857}{${s1}})} - 1 = \\color{#7a46ff}{${forwardDecimal} = ${forwardPercent}\\%}$$
    </div>
  `;
  
  container.innerHTML = mathML;
  
  // Trigger MathJax to re-render the equation
  if (window.MathJax) {
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, container]);
  }
  
  // Create screen-reader friendly announcement
  const announcement = `Implied forward rate F 1,2 equals ${forwardDecimal} or ${formatPercentage(forwardRate)}. ` +
    `Calculated as: quantity 1 plus 2-year spot rate ${formatPercentage(spot2Year)}, squared, ` +
    `divided by quantity 1 plus 1-year spot rate ${formatPercentage(spot1Year)}, minus 1.`;
  
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