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
import { getChartTypography } from '../chart-typography.js';

// Unicode math-italic characters for accessible labelling (#19)
const ITALIC_r = '\u{1D45F}'; // 𝑟
const ITALIC_F = '\u{1D439}'; // 𝐹

/** Curriculum chart label convention: 13px / 600 / Lato at the 18px design root. */
const CHART_FONT = { family: '', size: 13, weight: '600' };
let CHART_FONT_CSS = '';

const COLORS = {
  oneyear:  '#3c6ae5', // Blue  - 1Y strategy (all three bar types share this)
  twoyear:  '#ea792d', // Orange - 2Y strategy
  forward:  '#7a46ff', // Purple - forward rate
  spot1:    '#047857', // Green  - 1Y spot
  spot2:    '#dc2626', // Red    - 2Y spot (line)
  /** Body / label text — indices and bar amounts (not pure black) */
  darkText: '#374151',
  /** Operator and value in on-chart rate callouts — only the variable is coloured */
  rateIndexText: '#374151'
};

/** Shared pill geometry so every label box has the same breathing space. */
let LABEL_PAD_X = 8;
let LABEL_PAD_Y = 5;
let LABEL_BOX_HEIGHT = 23;

function syncChartTypography() {
  const t = getChartTypography('curriculum');
  CHART_FONT.family = t.font.family;
  CHART_FONT.size = t.font.size;
  CHART_FONT.weight = t.font.weight;
  CHART_FONT_CSS = t.fontCss;
  LABEL_PAD_X = t.pill.padX;
  LABEL_PAD_Y = t.pill.padY;
  LABEL_BOX_HEIGHT = t.pill.boxHeight;
}

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
  syncChartTypography();
  const chartAnimationDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400;
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
      animation: { duration: chartAnimationDuration }, // #6
      interaction: { mode: 'index', intersect: false },
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

          /** @param {{ text: string, color: string }[]} parts — variable and its subscript in accent, operator and value in rateIndexText */
          const drawLabelWithBox = (parts, x, y, borderColor) => {
            let totalWidth = 0;
            for (const p of parts) {
              ctx.fillStyle = p.color;
              totalWidth += ctx.measureText(p.text).width;
            }
            const width = totalWidth + LABEL_PAD_X * 2;
            const height = LABEL_BOX_HEIGHT;
            const left = x - width / 2;
            const top = y - height / 2;
            ctx.fillStyle = 'white';
            ctx.fillRect(left, top, width, height);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(left, top, width, height);
            const prevAlign = ctx.textAlign;
            ctx.textAlign = 'left';
            let cx = left + LABEL_PAD_X;
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
                  { text: `${ITALIC_r}\u2081`, color: COLORS.spot1 },
                  { text: ` = ${pct}`, color: COLORS.rateIndexText }
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
                  { text: `${ITALIC_F}\u2081,\u2082`, color: COLORS.forward },
                  { text: ` = ${pct}`, color: COLORS.rateIndexText }
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
                { text: `${ITALIC_r}\u2082`, color: COLORS.spot2 },
                { text: ` = ${pct}`, color: COLORS.rateIndexText }
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
          const yScale = chart.scales['y-cash'];

          // The four cash-flow datasets are grouped side by side and each is
          // sparse, so span every bar actually drawn at this year rather than
          // anchoring to dataset 0.
          const bars = chart.data.datasets
            .map((dataset, i) => {
              const meta = chart.getDatasetMeta(i);
              if (meta.type !== 'bar') return null;
              const value = dataset.data[currentFocusIndex];
              if (!Number.isFinite(value)) return null;
              return meta.data[currentFocusIndex] || null;
            })
            .filter(Boolean);

          let left, right, top, bottom;

          if (bars.length > 0) {
            left = Math.min(...bars.map((bar) => bar.x - bar.width / 2));
            right = Math.max(...bars.map((bar) => bar.x + bar.width / 2));
            const edges = bars.flatMap((bar) => [bar.y, bar.base]);
            top = Math.min(...edges);
            bottom = Math.max(...edges);
          } else {
            // Years with no cash flow still need a visible focus target.
            const xScale = chart.scales.x;
            const centre = xScale.getPixelForValue(currentFocusIndex);
            const band = (xScale.width / Math.max(1, chart.data.labels.length)) * 0.6;
            left = centre - band / 2;
            right = centre + band / 2;
            top = yScale.top;
            bottom = yScale.bottom;
          }

          ctx.save();
          ctx.strokeStyle = COLORS.darkText;
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(left - 4, top - 4, right - left + 8, bottom - top + 8);
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
    }
  }
  // Redraw regardless so the keyboard focus ring appears on years with no data.
  chartInstance.update('none');
}

function announceDataPoint(cashFlow) {
  const liveRegion = document.getElementById('chart-point-announcement');
  if (!liveRegion || liveRegion.getAttribute('aria-hidden') === 'true') return;

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