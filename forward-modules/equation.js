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
  
  // Build MathML equation with actual values
  const mathML = `
    <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
      <mrow>
        <mi mathcolor="#7a46ff" mathvariant="bold">f</mi>
        <mo>(</mo>
        <mn>1</mn>
        <mo>,</mo>
        <mn>1</mn>
        <mo>)</mo>
        <mo>=</mo>
        <mfrac linethickness="1.2px">
          <msup>
            <mrow>
              <mo>(</mo>
              <mn>1</mn>
              <mo>+</mo>
              <msub>
                <mi mathcolor="#ea792d">s</mi>
                <mn>2</mn>
              </msub>
              <mo>)</mo>
            </mrow>
            <mn>2</mn>
          </msup>
          <mrow>
            <mo>(</mo>
            <mn>1</mn>
            <mo>+</mo>
            <msub>
              <mi mathcolor="#38337b">s</mi>
              <mn>1</mn>
            </msub>
            <mo>)</mo>
          </mrow>
        </mfrac>
        <mo>−</mo>
        <mn>1</mn>
      </mrow>
    </math>
    
    <div style="text-align: center; margin-top: 1rem; font-size: 0.875rem; color: #374151; font-family: monospace; background: #f3f4f6; padding: 0.75rem; border-radius: 0.375rem;">
      <div style="margin-bottom: 0.5rem;"><strong>Substituting values:</strong></div>
      <div style="color: #4b5563;">
        f(1,1) = [(1 + <span style="color: #ea792d; font-weight: 600;">${s2}</span>)² ÷ (1 + <span style="color: #38337b; font-weight: 600;">${s1}</span>)] − 1
      </div>
      <div style="margin-top: 0.5rem; color: #7a46ff; font-weight: 700; font-size: 1rem;">
        = ${formatPercentage(forwardRate)}
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 1rem; font-size: 0.8125rem; color: #6b7280;">
      <div><strong>Where:</strong></div>
      <div style="margin-top: 0.25rem;">
        <span style="color: #38337b; font-weight: 600;">s₁ = ${formatPercentage(spot1Year)}</span> (1-year spot rate)
      </div>
      <div>
        <span style="color: #ea792d; font-weight: 600;">s₂ = ${formatPercentage(spot2Year)}</span> (2-year spot rate)
      </div>
    </div>
  `;
  
  container.innerHTML = mathML;
  
  // Create screen-reader friendly announcement
  const announcement = `Implied forward rate f(1,1) equals ${formatPercentage(forwardRate)}. ` +
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