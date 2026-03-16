/**
 * Chart Module - Forward Rate Calculator
 * Dual-axis chart: cash flows (bars) + interest rates (lines/points)
 *
 * Changes applied:
 *  #12 bar labels 2dp
 *  #13 hover tooltip: rates in % not USD
 *  #16 consistent dataset label naming
 *  #17 no space between USD and number in tooltips
 *  #19 italic math chars for r / F in tooltips
 *  #23 maturity/reinvest bars same blue as One-year (#3c6ae5)
 *  #6  prefers-reduced-motion: disable chart animations
 */

import { formatCurrency, formatCurrencySimple, formatPercentage } from './utils.js';

// Unicode math-italic characters for accessible labelling (#19)
const ITALIC_r = '\u{1D45F}'; // 𝑟
const ITALIC_F = '\u{1D439}'; // 𝐹

const COLORS = {
  oneyear:  '#3c6ae5', // Blue  - 1Y strategy (all three bar types share this)
  twoyear:  '#ea792d', // Orange - 2Y strategy
  forward:  '#7a46ff', // Purple - forward rate
  spot1:    '#047857', // Green  - 1Y spot
  spot2:    '#dc2626', // Red    - 2Y spot (line)
  darkText: '#000000'
};

// #6: respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CHART_ANIMATION_DURATION = prefersReducedMotion ? 0 : 400;

let chartInstance = null;
let currentFocusIndex = 0;
let isKeyboardMode = false;

/**
 * Friendly currency formatter without space after USD (#17)
 */
function fmtMoney(value) {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `\u2212USD${formatted}` : `USD${formatted}`;
}

/**
 * Create or update forward rate chart
 */
export function renderChart(calculations, showLabels = true) {
  const canvas = document.getElementById('forward-chart');
  if (!canvas) { console.error('Chart canvas not found'); return; }

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-roledescription', 'interactive chart');
  canvas.setAttribute('aria-label',
    'Interactive forward rate chart showing two investment strategies and interest rates over 2 years.');

  const ctx = canvas.getContext('2d');
  const cashFlows = calculations.cashFlows;
  const labels = cashFlows.map(cf => cf.year.toString());

  const strategy1InitialFinal = cashFlows.map(cf => cf.strategy1Cash    || null);
  const strategy1Maturity     = cashFlows.map(cf => cf.strategy1Maturity || null);
  const strategy1Reinvest     = cashFlows.map(cf => cf.strategy1Reinvest || null);
  const strategy2Cash         = cashFlows.map(cf => cf.strategy2Cash    || null);
  const spot1Data             = cashFlows.map(cf => cf.spot1Year  || null);
  const spot2Data             = cashFlows.map(cf => cf.spot2Year  || null);
  const forwardData           = cashFlows.map(cf => cf.forwardRate || null);

  if (chartInstance) { chartInstance.destroy(); }
  currentFocusIndex = 0;

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        // #16 consistent names; #23 all one-year bars use same blue
        {
          label: '1Y Initial/Final',
          data: strategy1InitialFinal,
          backgroundColor: COLORS.oneyear,
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        {
          label: '1Y Maturity',
          data: strategy1Maturity,
          backgroundColor: COLORS.oneyear, // #23: was #2563eb (bright blue)
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        {
          label: '1Y Reinvest',
          data: strategy1Reinvest,
          backgroundColor: COLORS.oneyear, // #23: was #38337b (navy)
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        {
          label: '2Y Strategy',
          data: strategy2Cash,
          backgroundColor: COLORS.twoyear,
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        // Rate lines (#19: use italic unicode in label; #13: tooltip shows % not USD)
        {
          label: `2Y Spot (${ITALIC_r}\u2082)`,
          data: spot2Data,
          type: 'line',
          borderColor: COLORS.spot2,
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          yAxisID: 'y-rate',
          order: 1
        },
        {
          label: `1Y Spot (${ITALIC_r}\u2081)`,
          data: spot1Data,
          type: 'scatter',
          backgroundColor: COLORS.spot1,
          pointRadius: 8,
          pointHoverRadius: 10,
          yAxisID: 'y-rate',
          order: 0
        },
        {
          label: `Forward Rate (${ITALIC_F}\u2081,\u2082)`,
          data: forwardData,
          type: 'scatter',
          backgroundColor: COLORS.forward,
          pointRadius: 8,
          pointHoverRadius: 10,
          yAxisID: 'y-rate',
          order: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: CHART_ANIMATION_DURATION }, // #6
      interaction: { mode: 'index', intersect: false },
      onHover: (event, activeElements) => {
        if (isKeyboardMode && document.activeElement === canvas) return;
        if (activeElements.length > 0) {
          announceDataPoint(cashFlows[activeElements[0].index]);
        }
      },
      plugins: {
        title:  { display: false },
        legend: { display: false },
        tooltip: {
          usePointStyle: true,
          callbacks: {
            title: (context) => `Year: ${cashFlows[context[0].dataIndex].year}`,
            label: (context) => {
              const value = context.parsed.y;
              if (value === null) return null;
              const label = context.dataset.label;

              // #13: rate datasets → show as %
              if (label.includes('Spot') || label.includes('Forward')) {
                return `${label}: ${formatPercentage(value)}`;
              }

              // #17: cash flow datasets → no space between USD and number
              return `${label}: ${fmtMoney(value)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Year', color: '#000', font: { size: 13, weight: '600', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" } },
          ticks: { color: '#000', font: { size: 13, weight: '600', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" } },
          grid:  { display: true, color: 'rgba(0,0,0,0.1)', lineWidth: 1 }
        },
        'y-cash': {
          title: { display: true, text: 'Cash flows (USD)', color: '#000', font: { size: 13, weight: '600', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" } },
          position: 'left',
          ticks: { callback: (v) => formatCurrencySimple(v), color: '#000', font: { size: 13, weight: '600', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" } },
          grid: { display: false }
        },
        'y-rate': {
          title: { display: true, text: 'Interest rate %', color: '#000', font: { size: 13, weight: '600', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" } },
          position: 'right',
          min: 0,
          max: Math.max(10, calculations.forwardRate * 1.3),
          ticks: { callback: (v) => v.toFixed(1), color: '#000', font: { size: 13, weight: '600', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" } },
          grid: { display: true, color: 'rgba(0,0,0,0.05)', drawOnChartArea: true, drawTicks: true }
        }
      },
      layout: {
        padding: { left: 10, right: 10, top: showLabels ? 40 : 15, bottom: 10 }
      }
    },
    plugins: [
      {
        id: 'cashFlowLabels',
        afterDatasetsDraw: (chart) => {
          if (!showLabels) return;
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = "700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";
          ctx.fillStyle = COLORS.darkText;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          chart.data.datasets.slice(0, 4).forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            meta.data.forEach((bar, index) => {
              const value = dataset.data[index];
              if (!value || Math.abs(value) < 0.01) return;

              // #12: 2dp on bar labels using same fmtMoney helper
              if (value < 0) {
                const text = formatCurrencySimple2dp(value);
                ctx.fillStyle = COLORS.darkText;
                ctx.textBaseline = 'middle';
                ctx.fillText(text, bar.x, bar.y + 15);
                ctx.textBaseline = 'bottom';
              } else {
                ctx.fillText(formatCurrencySimple2dp(value), bar.x, bar.y - 5);
              }
            });
          });
          ctx.restore();
        }
      },
      {
        id: 'rateLabels',
        afterDatasetsDraw: (chart) => {
          if (!showLabels) return;
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = "700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const drawLabelWithBox = (text, x, y, color) => {
            const padding = 4;
            const metrics = ctx.measureText(text);
            const width = metrics.width + padding * 2;
            const height = 16;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - width/2, y - height/2, width, height);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - width/2, y - height/2, width, height);
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
          };

          const spot2Meta   = chart.getDatasetMeta(4);
          const spot1Meta   = chart.getDatasetMeta(5);
          const forwardMeta = chart.getDatasetMeta(6);

          // #19 use italic unicode chars in on-chart labels
          spot1Meta.data.forEach((point, index) => {
            const value = chart.data.datasets[5].data[index];
            if (value !== null) {
              drawLabelWithBox(`${ITALIC_r}\u2081: ${formatPercentage(value)}`, point.x, point.y - 16, COLORS.spot1);
            }
          });

          forwardMeta.data.forEach((point, index) => {
            const value = chart.data.datasets[6].data[index];
            if (value !== null) {
              drawLabelWithBox(`${ITALIC_F}\u2081,\u2082: ${formatPercentage(value)}`, point.x, point.y + 20, COLORS.forward);
            }
          });

          const spot2Data = chart.data.datasets[4].data;
          const middleIndex = Math.floor(spot2Data.length / 2);
          if (spot2Meta.data[middleIndex] && spot2Data[middleIndex] !== null) {
            const point = spot2Meta.data[middleIndex];
            drawLabelWithBox(`${ITALIC_r}\u2082: ${formatPercentage(spot2Data[middleIndex])}`, point.x, point.y - 16, COLORS.spot2);
          }

          ctx.restore();
        }
      },
      {
        id: 'keyboardFocus',
        afterDatasetsDraw: (chart) => {
          if (document.activeElement !== canvas) return;
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          if (!meta.data[currentFocusIndex]) return;
          const bar = meta.data[currentFocusIndex];
          ctx.save();
          ctx.strokeStyle = COLORS.darkText;
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          const x = bar.x - 30;
          const y = chart.scales['y-cash'].top;
          ctx.strokeRect(x, y, 60, chart.scales['y-cash'].bottom - y);
          ctx.restore();
        }
      }
    ]
  });

  setupKeyboardNavigation(canvas, cashFlows);
}

/** #12: 2dp version of formatCurrencySimple for bar labels */
function formatCurrencySimple2dp(value) {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `\u2212${formatted}` : formatted;
}

function setupKeyboardNavigation(canvas, cashFlows) {
  if (canvas._keydownListener) canvas.removeEventListener('keydown', canvas._keydownListener);

  const keydownListener = (e) => {
    const maxIndex = cashFlows.length - 1;
    let newIndex = currentFocusIndex;
    isKeyboardMode = true;

    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); newIndex = Math.min(currentFocusIndex + 1, maxIndex); break;
      case 'ArrowLeft':  case 'ArrowUp':   e.preventDefault(); newIndex = Math.max(currentFocusIndex - 1, 0); break;
      case 'Home': e.preventDefault(); newIndex = 0; break;
      case 'End':  e.preventDefault(); newIndex = maxIndex; break;
      default: return;
    }

    if (newIndex !== currentFocusIndex) {
      currentFocusIndex = newIndex;
      chartInstance.update('none');
      announceDataPoint(cashFlows[currentFocusIndex]);
      showTooltipAtIndex(currentFocusIndex);
    }
  };

  canvas._keydownListener = keydownListener;
  canvas.addEventListener('keydown', keydownListener);

  canvas.addEventListener('focus', () => {
    isKeyboardMode = true;
    showTooltipAtIndex(currentFocusIndex);
    announceDataPoint(cashFlows[currentFocusIndex]);
  });
  canvas.addEventListener('blur', () => {
    if (chartInstance) {
      chartInstance.tooltip.setActiveElements([], { x: 0, y: 0 });
      chartInstance.update('none');
    }
  });
  canvas.addEventListener('mousemove', () => { isKeyboardMode = false; });
}

function showTooltipAtIndex(index) {
  if (!chartInstance) return;
  const elements = [];
  chartInstance.data.datasets.forEach((dataset, datasetIndex) => {
    if (dataset.data[index] !== null) elements.push({ datasetIndex, index });
  });
  if (elements.length > 0) {
    const meta = chartInstance.getDatasetMeta(elements[0].datasetIndex);
    if (meta.data[index]) {
      chartInstance.tooltip.setActiveElements(elements, { x: meta.data[index].x, y: meta.data[index].y });
      chartInstance.update('none');
    }
  }
}

function announceDataPoint(cashFlow) {
  let liveRegion = document.getElementById('chart-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'chart-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }

  let msg = `Year ${cashFlow.year}. `;
  if (cashFlow.spot1Year)     msg += `1-year spot rate: ${formatPercentage(cashFlow.spot1Year)}. `;
  if (cashFlow.spot2Year)     msg += `2-year spot rate: ${formatPercentage(cashFlow.spot2Year)}. `;
  if (cashFlow.forwardRate)   msg += `Forward rate: ${formatPercentage(cashFlow.forwardRate)}. `;
  if (cashFlow.strategy1Cash)    msg += `One-year strategy: ${formatCurrency(cashFlow.strategy1Cash, true)}. `;
  if (cashFlow.strategy1Maturity) msg += `Maturity value: ${formatCurrency(cashFlow.strategy1Maturity, true)}. `;
  if (cashFlow.strategy1Reinvest) msg += `Reinvestment: ${formatCurrency(cashFlow.strategy1Reinvest, true)}. `;
  if (cashFlow.strategy2Cash)    msg += `Two-year strategy: ${formatCurrency(cashFlow.strategy2Cash, true)}. `;

  liveRegion.textContent = msg;
}

export function shouldShowLabels() {
  return window.innerWidth > 860;
}

export function destroyChart() {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}