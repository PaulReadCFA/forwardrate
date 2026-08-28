/**
 * Dynamic Equation Module - Forward Rate Calculator
 * Renders equation with actual calculated values
 */

import { formatPercentage } from './utils.js';
import { renderEquation } from '../equation-render.js';

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
  
  const mathML = `
    <div style="text-align: center; font-size: 1.25rem; padding: 1rem;">
      <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
        <mrow>
          <msub>
            <mi mathcolor="#7A46FF">F</mi>
            <mrow mathcolor="#374151"><mn>1</mn><mo>,</mo><mn>2</mn></mrow>
          </msub>
          <mo>=</mo>
          <mfrac>
            <msup>
              <mrow>
                <mo>(</mo><mn>1</mn><mo>+</mo>
                <mn mathcolor="#DC2626">${s2}</mn><mo>)</mo>
              </mrow>
              <mn>2</mn>
            </msup>
            <mrow>
              <mo>(</mo><mn>1</mn><mo>+</mo>
              <mn mathcolor="#07514F">${s1}</mn><mo>)</mo>
            </mrow>
          </mfrac>
          <mo>&#x2212;</mo>
          <mn>1</mn>
          <mo>=</mo>
          <mn mathcolor="#7A46FF">${forwardDecimal}</mn>
          <mo>=</mo>
          <mrow mathcolor="#7A46FF"><mn>${forwardPercent}</mn><mo>%</mo></mrow>
        </mrow>
      </math>
    </div>
  `;
  
  // The label belongs on the labelled region, not this generic div: aria-label
  // is prohibited on an element with no role, and the region already names the
  // equation for assistive technology.
  const region = document.getElementById('dynamic-equation-container');

  // The shared mount holds the card's height and hides the raw MathML while
  // MathJax typesets, so the cards below stay put.
  renderEquation(container, mathML, {
    // Update the label with the computed result so SR users hear it on first
    // tab — no input change needed.
    onTypeset: () => {
      if (region) {
        region.setAttribute(
          'aria-label',
          `Forward rate equation with your values. Result: ${forwardPercent}% (${forwardDecimal} decimal)`
        );
      }
    },
  });
  
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