import { Store } from './state.js';

function drawChart(canvas, weights, goal) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = 260;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const styles = getComputedStyle(document.body);
  const textColor = styles.color;
  const gridColor = 'rgba(128,128,128,0.25)';

  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const w = cssWidth - padding.left - padding.right;
  const h = cssHeight - padding.top - padding.bottom;

  if (weights.length === 0) {
    ctx.fillStyle = textColor;
    ctx.font = '13px sans-serif';
    ctx.fillText('No weight entries yet.', padding.left, padding.top + 16);
    return;
  }

  const values = weights.map((w2) => w2.weight).concat([goal]);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 5;
    max += 5;
  }
  const range = max - min;
  min -= range * 0.08;
  max += range * 0.08;

  const xFor = (i) => padding.left + (weights.length === 1 ? w / 2 : (i / (weights.length - 1)) * w);
  const yFor = (val) => padding.top + h - ((val - min) / (max - min)) * h;

  // grid lines + y labels
  ctx.strokeStyle = gridColor;
  ctx.fillStyle = textColor;
  ctx.font = '11px sans-serif';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = min + ((max - min) * i) / steps;
    const y = yFor(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + w, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toString(), 4, y + 4);
  }

  // goal line
  const goalY = yFor(goal);
  ctx.strokeStyle = '#16a34a';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, goalY);
  ctx.lineTo(padding.left + w, goalY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#16a34a';
  ctx.fillText(`Goal ${goal}`, padding.left + w - 60, goalY - 6);

  // weight line
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  weights.forEach((wt, i) => {
    const x = xFor(i);
    const y = yFor(wt.weight);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points
  ctx.fillStyle = '#2563eb';
  weights.forEach((wt, i) => {
    const x = xFor(i);
    const y = yFor(wt.weight);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // x labels (first, middle, last)
  ctx.fillStyle = textColor;
  const labelIdxs = new Set([0, weights.length - 1, Math.floor(weights.length / 2)]);
  labelIdxs.forEach((i) => {
    if (i < 0 || i >= weights.length) return;
    const x = xFor(i);
    const label = weights[i].date.slice(5); // MM-DD
    ctx.fillText(label, Math.min(Math.max(x - 14, padding.left), padding.left + w - 30), cssHeight - 8);
  });
}

function renderWeightHistory() {
  const listEl = document.getElementById('weight-list');
  const weights = Store.getWeights().slice().reverse();
  if (weights.length === 0) {
    listEl.innerHTML = '<div class="muted">No entries yet.</div>';
    return;
  }
  listEl.innerHTML = weights
    .map(
      (w) => `
      <div class="entry-row">
        <div class="entry-main">
          <div class="entry-name">${w.weight} lbs</div>
          <div class="entry-meta">${w.date}</div>
        </div>
        <button class="entry-delete" data-id="${w.id}" aria-label="Delete">✕</button>
      </div>`
    )
    .join('');
  listEl.querySelectorAll('.entry-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      Store.deleteWeight(btn.dataset.id);
      renderWeightView();
    });
  });
}

function renderWeightView() {
  const settings = Store.getSettings();
  const weights = Store.getWeights();
  drawChart(document.getElementById('weight-chart'), weights, settings.weightGoal);
  renderWeightHistory();

  const latest = weights.length ? weights[weights.length - 1] : null;
  const goalText = document.getElementById('weight-goal-text');
  if (latest) {
    const remaining = latest.weight - settings.weightGoal;
    goalText.textContent =
      remaining > 0
        ? `${remaining.toFixed(1)} lbs to reach your ${settings.weightGoal} lb goal.`
        : `You've reached your ${settings.weightGoal} lb goal! 🎉`;
  } else {
    goalText.textContent = `Log a weight entry to start tracking toward ${settings.weightGoal} lbs.`;
  }
}

function wireWeightForm(onSaved) {
  const dateInput = document.getElementById('w-date');
  dateInput.value = Store.todayStr();

  document.getElementById('form-weight').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = dateInput.value || Store.todayStr();
    const weightVal = document.getElementById('w-weight').value;
    if (!weightVal) return;
    Store.addWeight(date, weightVal);
    document.getElementById('w-weight').value = '';
    renderWeightView();
    onSaved && onSaved();
  });
}

export const Weight = { renderWeightView, wireWeightForm };
