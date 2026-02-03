/**
 * Chart Module - Forward Rate Calculator
 * Dual-axis chart showing cash flows (bars) and interest rates (lines/points)
 */

import { formatCurrency, formatCurrencySimple, formatPercentage } from './utils.js';

const COLORS = {
  oneyear: '#3c6ae5',         // Blue - 1-year strategy
  twoyear: '#ea792d',         // Orange - 2-year strategy
  forward: '#7a46ff',         // Purple - forward rate (dashed line)
  spot1: '#047857',           // Dark green - 1Y spot (point) - WCAG compliant
  spot2: '#dc2626',           // Red - 2Y spot (line)
  maturity: '#2563eb',        // Bright blue - maturity value
  reinvest: '#38337b',        // Dark - reinvestment
  darkText: '#000000'         // Black for labels
};

let chartInstance = null;
let currentFocusIndex = 0;
let isKeyboardMode = false;

/**
 * Create or update forward rate chart
 */
export function renderChart(calculations, showLabels = true) {
  const canvas = document.getElementById('forward-chart');
  
  if (!canvas) {
    console.error('Chart canvas not found');
    return;
  }
  
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-roledescription', 'interactive chart');
  canvas.setAttribute(
    'aria-label',
    'Interactive forward rate chart showing two investment strategies and interest rates over 2 years.'
  );

  const ctx = canvas.getContext('2d');
  const cashFlows = calculations.cashFlows;
  
  const labels = cashFlows.map(cf => cf.year.toString());
  
  // Prepare datasets
  const strategy1InitialFinal = cashFlows.map(cf => cf.strategy1Cash || null);
  const strategy1Maturity = cashFlows.map(cf => cf.strategy1Maturity || null);
  const strategy1Reinvest = cashFlows.map(cf => cf.strategy1Reinvest || null);
  const strategy2Cash = cashFlows.map(cf => cf.strategy2Cash || null);
  
  const spot1Data = cashFlows.map(cf => cf.spot1Year || null);
  const spot2Data = cashFlows.map(cf => cf.spot2Year || null);
  const forwardData = cashFlows.map(cf => cf.forwardRate || null);
  
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  currentFocusIndex = 0;
  
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        // Cash flow bars (left axis)
        {
          label: 'One-Year: Initial/Final',
          data: strategy1InitialFinal,
          backgroundColor: COLORS.oneyear,
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        {
          label: 'One-Year: Maturity (+)',
          data: strategy1Maturity,
          backgroundColor: COLORS.maturity,
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        {
          label: 'One-Year: Reinvest (-)',
          data: strategy1Reinvest,
          backgroundColor: COLORS.reinvest,
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        {
          label: 'Two-Year Strategy',
          data: strategy2Cash,
          backgroundColor: COLORS.twoyear,
          borderWidth: 0,
          yAxisID: 'y-cash',
          order: 2,
          barPercentage: 0.6
        },
        // Interest rate lines and points (right axis)
        {
          label: '2Y Spot (r₂)',
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
          label: '1Y Spot (r₁)',
          data: spot1Data,
          type: 'scatter',
          backgroundColor: COLORS.spot1,
          pointRadius: 8,
          pointHoverRadius: 10,
          yAxisID: 'y-rate',
          order: 0
        },
        {
          label: 'Forward Rate (F₁,₂)',
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
      interaction: {
        mode: 'index',
        intersect: false
      },
      onHover: (event, activeElements) => {
        if (isKeyboardMode && document.activeElement === canvas) return;
        if (activeElements.length > 0) {
          const index = activeElements[0].index;
          announceDataPoint(cashFlows[index]);
        }
      },
      plugins: {
        title: { display: false },
        legend: { display: false },
        tooltip: {
          usePointStyle: true,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex;
              return `Year: ${cashFlows[index].year}`;
            },
            label: (context) => {
              const value = context.parsed.y;
              if (value === null) return null;
              
              const label = context.dataset.label;
              
              // Rate datasets
              if (label.includes('Rate') || label.includes('Forward')) {
                return `${label}: ${formatPercentage(value)}`;
              }
              
              // Cash flow datasets
              return `${label}: ${formatCurrency(value, true)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { 
            display: true, 
            text: 'Year',
            color: '#000000',
            font: { weight: 'bold', size: 13 }
          },
          ticks: {
            color: '#000000',
            font: { weight: '500', size: 12 }
          },
          grid: { 
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1
          }
        },
        'y-cash': {
          title: { 
            display: true, 
            text: 'Cash flows (USD)',
            color: '#000000',
            font: { weight: 'bold', size: 13 }
          },
          position: 'left',
          ticks: {
            callback: function(value) { return formatCurrencySimple(value); },
            color: '#000000',
            font: { weight: '500', size: 12 }
          },
          grid: { display: false }
        },
        'y-rate': {
          title: { 
            display: true, 
            text: 'Interest rate %',
            color: '#000000',
            font: { weight: 'bold', size: 13 }
          },
          position: 'right',
          min: 0,
          max: Math.max(10, calculations.forwardRate * 1.3),
          ticks: {
            callback: function(value) { return value.toFixed(1); },
            color: '#000000',
            font: { weight: '500', size: 12 }
          },
          grid: { 
            display: true,
            color: 'rgba(0, 0, 0, 0.05)',
            drawOnChartArea: true,
            drawTicks: true
          }
        }
      },
      layout: {
        padding: { left: 10, right: 10, top: showLabels ? 40 : 15, bottom: 10 }
      }
    },
    plugins: [{
      id: 'cashFlowLabels',
      afterDatasetsDraw: (chart) => {
        if (!showLabels) return;
        
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.darkText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Label each cash flow bar
        chart.data.datasets.slice(0, 4).forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index];
            if (!value || Math.abs(value) < 0.01) return;
            
            if (value < 0) {
              // Negative bars: black text near top of bar
              const text = formatCurrencySimple(value);
              const labelY = bar.y + 15;
              
              ctx.fillStyle = COLORS.darkText;
              ctx.textBaseline = 'middle';
              ctx.fillText(text, bar.x, labelY);
              ctx.textBaseline = 'bottom';
            } else {
              // Positive bars: black text above
              ctx.fillText(formatCurrencySimple(value), bar.x, bar.y - 5);
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
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Helper function to draw label with colored box and white background
        const drawLabelWithBox = (text, x, y, color) => {
          const padding = 4;
          const metrics = ctx.measureText(text);
          const width = metrics.width + padding * 2;
          const height = 16;
          
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(x - width/2, y - height/2, width, height);
          
          // Draw colored border
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - width/2, y - height/2, width, height);
          
          // Draw text
          ctx.fillStyle = color;
          ctx.fillText(text, x, y);
        };
        
        // Label spot rates and forward rate
        // Dataset 4 = 2Y Spot Rate (Line - Red)
        // Dataset 5 = 1Y Spot Rate (Point - Green)
        // Dataset 6 = Forward Rate (Dashed Line - Purple)
        
        const spot2Meta = chart.getDatasetMeta(4);
        const spot1Meta = chart.getDatasetMeta(5);
        const forwardMeta = chart.getDatasetMeta(6);
        
        // 1Y Spot Rate (points)
        spot1Meta.data.forEach((point, index) => {
          const value = chart.data.datasets[5].data[index];
          if (value !== null) {
            drawLabelWithBox(`r₁: ${formatPercentage(value)}`, point.x, point.y - 16, COLORS.spot1);
          }
        });
        
        // Forward Rate (points)
        forwardMeta.data.forEach((point, index) => {
          const value = chart.data.datasets[6].data[index];
          if (value !== null) {
            drawLabelWithBox(`F₁,₂: ${formatPercentage(value)}`, point.x, point.y + 20, COLORS.forward);
          }
        });
        
        // 2Y Spot Rate (line) - label the middle point
        const spot2Data = chart.data.datasets[4].data;
        const middleIndex = Math.floor(spot2Data.length / 2);
        if (spot2Meta.data[middleIndex] && spot2Data[middleIndex] !== null) {
          const point = spot2Meta.data[middleIndex];
          drawLabelWithBox(`r₂: ${formatPercentage(spot2Data[middleIndex])}`, point.x, point.y - 16, COLORS.spot2);
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
        const width = 60;
        const height = chart.scales['y-cash'].bottom - chart.scales['y-cash'].top;
        
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
      }
    }]
  });
  
  setupKeyboardNavigation(canvas, cashFlows);
}

function setupKeyboardNavigation(canvas, cashFlows) {
  const oldListener = canvas._keydownListener;
  if (oldListener) canvas.removeEventListener('keydown', oldListener);
  
  const keydownListener = (e) => {
    const maxIndex = cashFlows.length - 1;
    let newIndex = currentFocusIndex;
    isKeyboardMode = true;
    
    switch(e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(currentFocusIndex + 1, maxIndex);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(currentFocusIndex - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = maxIndex;
        break;
      default:
        return;
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
  
  const focusListener = () => {
    isKeyboardMode = true;
    showTooltipAtIndex(currentFocusIndex);
    announceDataPoint(cashFlows[currentFocusIndex]);
  };
  
  const blurListener = () => {
    if (chartInstance) {
      chartInstance.tooltip.setActiveElements([], {x: 0, y: 0});
      chartInstance.update('none');
    }
  };
  
  canvas._focusListener = focusListener;
  canvas._blurListener = blurListener;
  canvas.addEventListener('focus', focusListener);
  canvas.addEventListener('blur', blurListener);
  
  const mouseMoveListener = () => { isKeyboardMode = false; };
  canvas._mouseMoveListener = mouseMoveListener;
  canvas.addEventListener('mousemove', mouseMoveListener);
}

function showTooltipAtIndex(index) {
  if (!chartInstance) return;
  
  const elements = [];
  chartInstance.data.datasets.forEach((dataset, datasetIndex) => {
    if (dataset.data[index] !== null) {
      elements.push({datasetIndex, index});
    }
  });
  
  if (elements.length > 0) {
    const meta = chartInstance.getDatasetMeta(elements[0].datasetIndex);
    if (meta.data[index]) {
      chartInstance.tooltip.setActiveElements(elements, {
        x: meta.data[index].x,
        y: meta.data[index].y
      });
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
  
  let announcement = `Year ${cashFlow.year}. `;
  
  if (cashFlow.spot1Year) {
    announcement += `1-year spot rate: ${formatPercentage(cashFlow.spot1Year)}. `;
  }
  if (cashFlow.spot2Year) {
    announcement += `2-year spot rate: ${formatPercentage(cashFlow.spot2Year)}. `;
  }
  if (cashFlow.forwardRate) {
    announcement += `Forward rate: ${formatPercentage(cashFlow.forwardRate)}. `;
  }
  
  if (cashFlow.strategy1Cash) {
    announcement += `One-year strategy: ${formatCurrency(cashFlow.strategy1Cash, true)}. `;
  }
  if (cashFlow.strategy1Maturity) {
    announcement += `Maturity value: ${formatCurrency(cashFlow.strategy1Maturity, true)}. `;
  }
  if (cashFlow.strategy1Reinvest) {
    announcement += `Reinvestment: ${formatCurrency(cashFlow.strategy1Reinvest, true)}. `;
  }
  if (cashFlow.strategy2Cash) {
    announcement += `Two-year strategy: ${formatCurrency(cashFlow.strategy2Cash, true)}. `;
  }
  
  liveRegion.textContent = announcement;
}

export function shouldShowLabels() {
  return window.innerWidth > 860;
}

export function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}