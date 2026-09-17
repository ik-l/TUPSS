import { Store } from './state.js';

function lastNDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(Store.todayStr(d));
  }
  return dates;
}

function drawCaloriesBarChart(canvas, dates, calorieTotals, target) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = canvas.clientHeight || 220;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const textColor = getComputedStyle(document.body).color;
  const padding = { top: 12, right: 12, bottom: 24, left: 40 };
  const w = cssWidth - padding.left - padding.right;
  const h = cssHeight - padding.top - padding.bottom;

  const maxVal = Math.max(target * 1.15, ...calorieTotals, 1);
  const yFor = (val) => padding.top + h - (val / maxVal) * h;

  // target line
  const targetY = yFor(target);
  ctx.strokeStyle = '#16a34a';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, targetY);
  ctx.lineTo(padding.left + w, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#16a34a';
  ctx.font = '11px sans-serif';
  ctx.fillText(`Target ${target}`, padding.left + w - 68, targetY - 6);

  // bars
  const barGap = 10;
  const barWidth = (w - barGap * (dates.length - 1)) / dates.length;
  dates.forEach((dateStr, i) => {
    const val = calorieTotals[i];
    const x = padding.left + i * (barWidth + barGap);
    const barTop = yFor(val);
    ctx.fillStyle = val > target ? '#dc2626' : '#2563eb';
    ctx.fillRect(x, barTop, barWidth, padding.top + h - barTop);

    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';
    const [, m, d] = dateStr.split('-');
    ctx.fillText(`${m}/${d}`, x + barWidth / 2 - 10, cssHeight - 6);
  });
}

function renderTrends() {
  const settings = Store.getSettings();
  const dates = lastNDates(7);

  const calorieTotals = [];
  const proteinTotals = [];
  let stepsSum = 0;
  let stepsDaysLogged = 0;

  for (const dateStr of dates) {
    const totals = Store.sumEntries(Store.getEntriesForDate(dateStr));
    calorieTotals.push(totals.calories);
    proteinTotals.push(totals.protein);
    const extras = Store.getDailyExtras(dateStr);
    if (extras.steps) {
      stepsSum += extras.steps;
      stepsDaysLogged += 1;
    }
  }

  drawCaloriesBarChart(document.getElementById('trend-calories-chart'), dates, calorieTotals, settings.calorieTarget);

  const avgCalories = Math.round(calorieTotals.reduce((a, b) => a + b, 0) / 7);
  const avgProtein = Math.round(proteinTotals.reduce((a, b) => a + b, 0) / 7);
  const avgSteps = stepsDaysLogged ? Math.round(stepsSum / stepsDaysLogged) : 0;

  document.getElementById('trend-stats').innerHTML = `
    <div><span class="muted">Avg cal/day</span><br /><b>${avgCalories}</b></div>
    <div><span class="muted">Avg protein/day</span><br /><b>${avgProtein}g</b></div>
    <div><span class="muted">Avg steps/day</span><br /><b>${avgSteps || '—'}</b></div>
    <div><span class="muted">Days logged</span><br /><b>${calorieTotals.filter((c) => c > 0).length}/7</b></div>
  `;
}

export const Trends = { renderTrends };
