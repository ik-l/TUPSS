// Static reference data pulled from Irving's Apple Health export summary
// (generated 2026-09-16). There's no live Apple Health sync in this web app
// (that needs the native iOS build — see Phase 3 in the build spec), so this
// is a point-in-time snapshot. Update these arrays by hand when a new
// Apple Health export summary is provided.

const HEALTH_DATA = {
  exportDate: '2026-09-16',
  months: ['Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26'],
  partialLastMonth: true, // September 2026 was a partial month at export time
  steps: [6681, 5741, 6837, 5728, 5927, 5881, 5192, 5833, 6050, 7528, 7034, 3492],
  restingHeartRate: [70.0, 70.1, 72.7, 69.3, 69.8, 76.7, 74.4, 71.6, 74.2, 74.6, 72.5, 78.5],
  hrv: [52.4, 50.4, 45.4, 53.5, 51.3, 42.3, 41.7, 46.2, 39.7, 46.0, 42.8, 46.0],
  sleepNightsLogged: 20,
  sleepHistoryYears: 4,
  workoutsLogged: 6,
  workoutHistoryYears: 4,
};

function drawBarChart(canvas, labels, values, { highlightLastAsPartial } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = 180;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const textColor = getComputedStyle(document.body).color;
  const padding = { top: 10, right: 8, bottom: 20, left: 8 };
  const w = cssWidth - padding.left - padding.right;
  const h = cssHeight - padding.top - padding.bottom;
  const maxVal = Math.max(...values, 1) * 1.1;
  const yFor = (val) => padding.top + h - (val / maxVal) * h;

  const barGap = 6;
  const barWidth = (w - barGap * (labels.length - 1)) / labels.length;

  labels.forEach((label, i) => {
    const val = values[i];
    const x = padding.left + i * (barWidth + barGap);
    const barTop = yFor(val);
    const isPartial = highlightLastAsPartial && i === labels.length - 1;
    ctx.fillStyle = isPartial ? '#93c5fd' : '#2563eb';
    ctx.fillRect(x, barTop, barWidth, padding.top + h - barTop);

    ctx.fillStyle = textColor;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.replace(' ', "\n").split(' ')[0], x + barWidth / 2, cssHeight - 6);
  });
  ctx.textAlign = 'left';
}

function drawLineChart(canvas, labels, values, color) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = 140;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const textColor = getComputedStyle(document.body).color;
  const padding = { top: 10, right: 10, bottom: 20, left: 32 };
  const w = cssWidth - padding.left - padding.right;
  const h = cssHeight - padding.top - padding.bottom;

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 5;
    max += 5;
  }
  const range = max - min;
  min -= range * 0.15;
  max += range * 0.15;

  const xFor = (i) => padding.left + (i / (labels.length - 1)) * w;
  const yFor = (val) => padding.top + h - ((val - min) / (max - min)) * h;

  ctx.strokeStyle = 'rgba(128,128,128,0.25)';
  ctx.fillStyle = textColor;
  ctx.font = '10px sans-serif';
  for (let i = 0; i <= 2; i++) {
    const val = min + ((max - min) * i) / 2;
    const y = yFor(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + w, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(0), 2, y + 3);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((val, i) => {
    const x = xFor(i);
    const y = yFor(val);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color;
  values.forEach((val, i) => {
    ctx.beginPath();
    ctx.arc(xFor(i), yFor(val), 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = textColor;
  [0, Math.floor(labels.length / 2), labels.length - 1].forEach((i) => {
    ctx.fillText(labels[i].split(' ')[0], xFor(i) - 10, cssHeight - 6);
  });
}

function renderHealthHistory() {
  document.getElementById('health-history-note').textContent =
    `Snapshot from your Apple Health export (${HEALTH_DATA.exportDate}). This updates only when you share a new export — it isn't a live sync.`;

  drawBarChart(document.getElementById('health-steps-chart'), HEALTH_DATA.months, HEALTH_DATA.steps, { highlightLastAsPartial: HEALTH_DATA.partialLastMonth });
  drawLineChart(document.getElementById('health-rhr-chart'), HEALTH_DATA.months, HEALTH_DATA.restingHeartRate, '#dc2626');
  drawLineChart(document.getElementById('health-hrv-chart'), HEALTH_DATA.months, HEALTH_DATA.hrv, '#7c3aed');

  const firstRHR = HEALTH_DATA.restingHeartRate[0];
  const lastRHR = HEALTH_DATA.restingHeartRate[HEALTH_DATA.restingHeartRate.length - 1];
  const firstHRV = HEALTH_DATA.hrv[0];
  const lastHRV = HEALTH_DATA.hrv[HEALTH_DATA.hrv.length - 1];

  const tips = [
    `Resting heart rate drifted from ${firstRHR.toFixed(0)} to ${lastRHR.toFixed(0)} bpm over the last 12 months, and HRV drifted from ${firstHRV.toFixed(0)} to ${lastHRV.toFixed(0)}ms — RHR up and HRV down together is worth mentioning at your next checkup (not a diagnosis, just a pattern worth a doctor's read).`,
    `Sleep is barely tracked — only ${HEALTH_DATA.sleepNightsLogged} nights logged in ~${HEALTH_DATA.sleepHistoryYears} years, almost certainly because the Watch isn't worn overnight. If sleep matters to you, wearing it to bed (or logging manually) would close the biggest gap in this data.`,
    `Only ${HEALTH_DATA.workoutsLogged} deliberate workouts are logged in ~${HEALTH_DATA.workoutHistoryYears} years — most of your activity data is passive Watch background tracking (steps, standing), not intentional exercise sessions.`,
    `September's step average (partial month) is well below August — expected for a partial month, but worth a glance once the month closes out.`,
  ];

  document.getElementById('health-tips').innerHTML = `
    <div class="banner">${tips[0]}</div>
    <ul class="muted" style="padding-left:18px;margin:8px 0 0;">
      ${tips.slice(1).map((t) => `<li style="margin-bottom:6px;">${t}</li>`).join('')}
    </ul>
  `;
}

export const HealthHistory = { renderHealthHistory };
