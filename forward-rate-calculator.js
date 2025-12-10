/**
 * Forward Rate Calculator - Main Entry Point
 * CFA Institute - Vanilla JavaScript Implementation
 * 
 * Demonstrates no-arbitrage pricing and implied forward rates
 */

import { state, setState, subscribe } from './forward-modules/state.js';
import { calculateForwardMetrics } from './forward-modules/calculations.js';
import { 
  validateAllInputs, 
  validateField, 
  updateFieldError, 
  updateValidationSummary,
  hasErrors 
} from './forward-modules/validation.js';
import { 
  $, 
  listen, 
  focusElement, 
  announceToScreenReader,
  debounce
} from './forward-modules/utils.js';
import { renderChart, shouldShowLabels, destroyChart } from './forward-modules/chart.js';
import { renderTable } from './forward-modules/table.js';
import { renderResults } from './forward-modules/results.js';
import { renderDynamicEquation } from './forward-modules/equation.js';

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
  console.log('Forward Rate Calculator initializing...');
  
  setupInputListeners();
  setupViewToggle();
  setupSkipLinks();
  setupResizeListener();
  
  subscribe(handleStateChange);
  
  updateCalculations();
  runSelfTests();
  
  console.log('Forward Rate Calculator ready');
}

function setupSkipLinks() {
  const skipToVisualizer = document.querySelector('a[href="#visualizer"]');
  
  if (skipToVisualizer) {
    listen(skipToVisualizer, 'click', (e) => {
      e.preventDefault();
      switchView('table');
      const section = $('#visualizer');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setTimeout(() => {
        const table = $('#cash-flow-table');
        if (table) {
          table.focus();
        }
      }, 400);
    });
  }
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

function setupInputListeners() {
  const inputs = [
    { id: 'spot-1year', field: 'spot1Year' },
    { id: 'spot-2year', field: 'spot2Year' }
  ];
  
  inputs.forEach(({ id, field }) => {
    const input = $(`#${id}`);
    if (!input) return;
    
    const debouncedUpdate = debounce(() => {
      const value = parseFloat(input.value);
      
      const error = validateField(field, value);
      updateFieldError(id, error);
      
      const errors = { ...state.errors };
      if (error) {
        errors[field] = error;
      } else {
        delete errors[field];
      }
      
      setState({
        [field]: value,
        errors
      });
      
      updateValidationSummary(errors);
      
      if (!hasErrors(errors)) {
        updateCalculations();
      }
    }, 300);
    
    listen(input, 'input', debouncedUpdate);
    listen(input, 'change', debouncedUpdate);
  });
}

function updateCalculations() {
  const { spot1Year, spot2Year, errors } = state;
  
  if (hasErrors(errors)) {
    setState({ forwardCalculations: null });
    return;
  }
  
  try {
    const calculations = calculateForwardMetrics({
      spot1Year,
      spot2Year
    });
    
    setState({ forwardCalculations: calculations });
    
  } catch (error) {
    console.error('Calculation error:', error);
    setState({ forwardCalculations: null });
  }
}

// =============================================================================
// VIEW TOGGLE (CHART/TABLE)
// =============================================================================

function setupViewToggle() {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  
  if (!chartBtn || !tableBtn) {
    console.error('Toggle buttons not found');
    return;
  }
  
  listen(chartBtn, 'click', () => switchView('chart'));
  listen(tableBtn, 'click', () => switchView('table'));
}

function switchView(view) {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  const chartContainer = $('#chart-container');
  const tableContainer = $('#table-container');
  const legend = $('#chart-legend');
  
  setState({ viewMode: view });
  
  if (view === 'chart') {
    chartBtn.classList.add('active');
    chartBtn.setAttribute('aria-pressed', 'true');
    tableBtn.classList.remove('active');
    tableBtn.setAttribute('aria-pressed', 'false');
    
    chartContainer.style.display = 'block';
    tableContainer.style.display = 'none';
    legend.style.display = 'flex';
    
    announceToScreenReader('Chart view active');
    focusElement(chartContainer, 100);
    
  } else {
    tableBtn.classList.add('active');
    tableBtn.setAttribute('aria-pressed', 'true');
    chartBtn.classList.remove('active');
    chartBtn.setAttribute('aria-pressed', 'false');
    
    tableContainer.style.display = 'block';
    chartContainer.style.display = 'none';
    legend.style.display = 'none';
    
    announceToScreenReader('Table view active');
    focusElement($('#cash-flow-table'), 100);
  }
}

// =============================================================================
// RENDERING
// =============================================================================

function handleStateChange(newState) {
  const { forwardCalculations, viewMode } = newState;
  
  if (!forwardCalculations) {
    return;
  }
  
  renderResults(forwardCalculations, {
    spot1Year: newState.spot1Year,
    spot2Year: newState.spot2Year
  });
  
  renderDynamicEquation(forwardCalculations, {
    spot1Year: newState.spot1Year,
    spot2Year: newState.spot2Year
  });
  
  if (viewMode === 'chart') {
    const showLabels = shouldShowLabels();
    renderChart(forwardCalculations, showLabels);
  }
  
  renderTable(forwardCalculations);
}

// =============================================================================
// WINDOW RESIZE HANDLING
// =============================================================================

function setupResizeListener() {
  let resizeTimeout;
  
  listen(window, 'resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      handleResponsiveView();
      
      if (state.viewMode === 'chart' && state.forwardCalculations) {
        const showLabels = shouldShowLabels();
        renderChart(state.forwardCalculations, showLabels);
      }
    }, 250);
  });
  
  handleResponsiveView();
}

function handleResponsiveView() {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  const viewportWidth = window.innerWidth;
  
  if (viewportWidth < 600) {
    if (state.viewMode === 'chart') {
      switchView('table');
    }
    
    if (chartBtn) {
      chartBtn.disabled = true;
      chartBtn.setAttribute('aria-disabled', 'true');
      chartBtn.title = 'Chart view not available at this screen size';
    }
    if (tableBtn) {
      tableBtn.disabled = false;
      tableBtn.removeAttribute('aria-disabled');
      tableBtn.title = '';
    }
  } else {
    if (chartBtn) {
      chartBtn.disabled = false;
      chartBtn.removeAttribute('aria-disabled');
      chartBtn.title = '';
    }
  }
}

// =============================================================================
// SELF-TESTS
// =============================================================================

function runSelfTests() {
  console.log('Running self-tests...');
  
  const tests = [
    {
      name: 'Forward rate calculation',
      inputs: { spot1Year: 6.3, spot2Year: 8.0 },
      expected: { forwardApprox: 9.73 }
    },
    {
      name: 'No arbitrage condition',
      inputs: { spot1Year: 5.0, spot2Year: 6.0 },
      expected: { strategiesEqual: true }
    }
  ];
  
  tests.forEach(test => {
    try {
      const result = calculateForwardMetrics(test.inputs);
      
      if (test.expected.forwardApprox !== undefined) {
        const diff = Math.abs(result.forwardRate - test.expected.forwardApprox);
        if (diff <= 0.1) {
          console.log(`✓ ${test.name} passed`);
        } else {
          console.warn(`✗ ${test.name} failed: expected ~${test.expected.forwardApprox}%, got ${result.forwardRate.toFixed(2)}%`);
        }
      }
      
      if (test.expected.strategiesEqual) {
        const diff = Math.abs(result.strategy1Final - result.strategy2Final);
        if (diff < 0.01) {
          console.log(`✓ ${test.name} passed: strategies equal`);
        } else {
          console.warn(`✗ ${test.name} failed: strategy values differ by $${diff.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error(`✗ ${test.name} threw error:`, error);
    }
  });
  
  console.log('Self-tests complete');
}

// =============================================================================
// CLEANUP
// =============================================================================

function cleanup() {
  destroyChart();
  console.log('Calculator cleanup complete');
}

window.addEventListener('beforeunload', cleanup);

// =============================================================================
// START THE APPLICATION
// =============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { state, setState, updateCalculations };
