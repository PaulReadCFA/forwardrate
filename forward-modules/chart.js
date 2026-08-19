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
 *  #27 y-cash: extra range below negative bars so on-bar labels (drawn under bar) clear the x-axis
 */

import { formatCurrency, formatCurrencySimple, formatPercentage } from './utils.js';

// Unicode math-italic characters for accessible labelling (#19)
const ITALIC_r = '\u{1D45F}'; // 𝑟
const ITALIC_F = '\u{1D439}'; // 𝐹

/** Match forwardexchange / curriculum chart label convention. */
const CHART_FONT = {
  family: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size: 13,
  weight: '600'
};
const CHART_FONT_CSS = `${CHART_FONT.weight} ${CHART_FONT.size}px ${CHART_FONT.family}`;

const COLORS = {
  oneyear:  '#3c6ae5', // Blue  - 1Y strategy (all three bar types share this)
  twoyear:  '#ea792d', // Orange - 2Y strategy
  forward:  '#7a46ff', // Purple - forward rate
  spot1:    '#047857', // Green  - 1Y spot
  spot2:    '#dc2626', // Red    - 2Y spot (line)
  /** Body / label text — indices and bar amounts (not pure black) */
  darkText: '#374151',
  /** Subscripts after r / F in on-chart rate callouts */
  rateIndexText: '#374151'
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
 * Snap a negative lower bound to a round step (still at or below the padded value).
 * Keeps axis limits review-friendly (e.g. -140 instead of -131).
 */
function snapNegativeCashAxisMin(rawMin) {
  if (rawMin >= 0) return rawMin;
  const a = Math.abs(rawMin);
  const step =
    a >= 20000 ? 5000 :
    a >= 5000 ? 1000 :
    a >= 2000 ? 500 :
    a >= 500 ? 100 :
    a >= 200 ? 25 :
    a >= 50 ? 10 :
    5;
  const snappedMag = Math.ceil(a / step) * step;
  return -snappedMag;
}

/**
 * Negative cash bars get labels drawn below the bar (~15px in plot space).
 * Extend y-cash min in data units so labels sit above the category axis line.
 */
function yCashMinForLabelClearance(datasetArrays) {
  const values = [];
  for (const arr of datasetArrays) {
    for (const v of arr) {
      if (v != null && typeof v === 'number' && !Number.isNaN(v)) values.push(v);
    }
  }
  if (values.length === 0) return undefined;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  if (dataMin >= 0) return undefined;
  const span = Math.max(dataMax - dataMin, 1);
  const pad = Math.max(span * 0.11, Math.abs(dataMin) * 0.06, 20);
  const rawMin = dataMin - pad;
  return snapNegativeCashAxisMin(rawMin);
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

  const cashBarSeries = [strategy1InitialFinal, strategy1Maturity, strategy1Reinvest, strategy2Cash];
  const yCashMinExtended = yCashMinForLabelClearance(cashBarSeries);

  if (chartInstance) { chartInstance.destroy(); }
  currentFocusIndex = 0;

  const yCashScale = {
    title: { display: true, text: 'Cash flows (USD)', color: COLORS.darkText, font: CHART_FONT },
    position: 'left',
    ticks: { callback: (v) => formatCurrencySimple(v), color: COLORS.darkText, font: CHART_FONT },
    grid: { display: false }
  };
  if (yCashMinExtended !== undefined) {
    yCashScale.min = yCashMinExtended;
  }

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
          title: { display: true, text: 'Year', color: COLORS.darkText, font: CHART_FONT },
          ticks: { color: COLORS.darkText, font: CHART_FONT },
          grid:  { display: true, color: 'rgba(0,0,0,0.1)', lineWidth: 1 }
        },
        'y-cash': yCashScale,
        'y-rate': {
          title: { display: true, text: 'Interest rate %', color: COLORS.darkText, font: CHART_FONT },
          position: 'right',
          min: 0,
          max: Math.ceil(Math.max(10, calculations.forwardRate * 1.3)),
          ticks: { callback: (v) => v.toFixed(1), stepSize: 1, color: COLORS.darkText, font: CHART_FONT },
          grid: { display: true, color: 'rgba(0,0,0,0.05)', drawOnChartArea: true, drawTicks: true }
        }
      },
      layout: {
        padding: { left: 10, right: 10, top: showLabels ? 40 : 15, bottom: yCashMinExtended !== undefined ? 22 : 10 }
      }
    },
    plugins: [
      {
        id: 'cashFlowLabels',
        afterDatasetsDraw: (chart) => {
          if (!showLabels) return;
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = CHART_FONT_CSS;
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
          ctx.font = CHART_FONT_CSS;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          /** @param {{ text: string, color: string }[]} parts — variable in accent, indices/suffix in rateIndexText */
          const drawLabelWithBox = (parts, x, y, borderColor) => {
            const padding = 4;
            let totalWidth = 0;
            for (const p of parts) {
              ctx.fillStyle = p.color;
              totalWidth += ctx.measureText(p.text).width;
            }
            const width = totalWidth + padding * 2;
            const height = 18;
            const left = x - width / 2;
            const top = y - height / 2;
            ctx.fillStyle = 'white';
            ctx.fillRect(left, top, width, height);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(left, top, width, height);
            const prevAlign = ctx.textAlign;
            ctx.textAlign = 'left';
            let cx = left + padding;
            for (const p of parts) {
              ctx.fillStyle = p.color;
              ctx.fillText(p.text, cx, y);
              cx += ctx.measureText(p.text).width;
            }
            ctx.textAlign = prevAlign;
          };

          const spot2Meta   = chart.getDatasetMeta(4);
          const spot1Meta   = chart.getDatasetMeta(5);
          const forwardMeta = chart.getDatasetMeta(6);

          // #19 use italic unicode chars in on-chart labels
          spot1Meta.data.forEach((point, index) => {
            const value = chart.data.datasets[5].data[index];
            if (value !== null) {
              const pct = formatPercentage(value);
              drawLabelWithBox(
                [
                  { text: ITALIC_r, color: COLORS.spot1 },
                  { text: `\u2081: ${pct}`, color: COLORS.rateIndexText }
                ],
                point.x, point.y - 16, COLORS.spot1
              );
            }
          });

          forwardMeta.data.forEach((point, index) => {
            const value = chart.data.datasets[6].data[index];
            if (value !== null) {
              const pct = formatPercentage(value);
              drawLabelWithBox(
                [
                  { text: ITALIC_F, color: COLORS.forward },
                  { text: `\u2081,\u2082: ${pct}`, color: COLORS.rateIndexText }
                ],
                point.x, point.y + 20, COLORS.forward
              );
            }
          });

          const spot2Data = chart.data.datasets[4].data;
          const middleIndex = Math.floor(spot2Data.length / 2);
          if (spot2Meta.data[middleIndex] && spot2Data[middleIndex] !== null) {
            const point = spot2Meta.data[middleIndex];
            const pct = formatPercentage(spot2Data[middleIndex]);
            drawLabelWithBox(
              [
                { text: ITALIC_r, color: COLORS.spot2 },
                { text: `\u2082: ${pct}`, color: COLORS.rateIndexText }
              ],
              point.x, point.y - 16, COLORS.spot2
            );
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