import { Store } from './state.js';
import { Photos } from './photos.js';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

let viewDate = Store.todayStr();

function pct(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, (value / target) * 100));
}

function updateStreakBadge() {
  const { count } = Store.computeStreak();
  document.getElementById('streak-badge').textContent = `🔥 ${count}`;
}

// Ring segments are sized by each macro's share of calories (carbs/protein
// @4 kcal/g, fat @9 kcal/g) — the same convention MyFitnessPal's ring uses —
// while the center shows the actual logged calorie total.
function drawMacroRing(totals) {
  const canvas = document.getElementById('macro-ring');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 160;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const carbCals = totals.carbs * 4;
  const fatCals = totals.fat * 9;
  const proteinCals = totals.protein * 4;
  const macroCalSum = carbCals + fatCals + proteinCals;

  const segments = macroCalSum > 0
    ? [
        { pct: (carbCals / macroCalSum) * 100, color: '#14b8a6' },
        { pct: (fatCals / macroCalSum) * 100, color: '#a78bfa' },
        { pct: (proteinCals / macroCalSum) * 100, color: '#f59e0b' },
      ]
    : [{ pct: 100, color: getComputedStyle(document.body).getPropertyValue('--border') || '#e5e7eb' }];

  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 16;
  const radius = size / 2 - strokeWidth / 2 - 2;
  let startAngle = -Math.PI / 2;
  segments.forEach((seg) => {
    const angle = (seg.pct / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = angle >= Math.PI * 2 - 0.01 ? 'butt' : 'round';
    ctx.stroke();
    startAngle += angle;
  });

  const textColor = getComputedStyle(document.body).color;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`${Math.round(totals.calories)}`, cx, cy - 2);
  ctx.font = '12px sans-serif';
  ctx.fillText('cal', cx, cy + 18);

  const carbsPct = macroCalSum > 0 ? Math.round((carbCals / macroCalSum) * 100) : 0;
  const fatPct = macroCalSum > 0 ? Math.round((fatCals / macroCalSum) * 100) : 0;
  const proteinPct = macroCalSum > 0 ? Math.round((proteinCals / macroCalSum) * 100) : 0;
  document.getElementById('ring-carbs-pct').textContent = `${carbsPct}%`;
  document.getElementById('ring-carbs-g').textContent = `${Math.round(totals.carbs)} g`;
  document.getElementById('ring-fat-pct').textContent = `${fatPct}%`;
  document.getElementById('ring-fat-g').textContent = `${Math.round(totals.fat)} g`;
  document.getElementById('ring-protein-pct').textContent = `${proteinPct}%`;
  document.getElementById('ring-protein-g').textContent = `${Math.round(totals.protein)} g`;
}

function renderWater(settings) {
  const extras = Store.getDailyExtras(viewDate);
  const waterOz = extras.waterOz || 0;
  const pct = Math.max(0, Math.min(100, (waterOz / settings.waterTargetOz) * 100));
  document.getElementById('bar-water').style.width = `${pct}%`;
  document.getElementById('txt-water').textContent = `${waterOz} / ${settings.waterTargetOz}oz`;
}

function shiftDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return Store.todayStr(dt);
}

function dateLabelFor(dateStr) {
  const today = Store.todayStr();
  if (dateStr === today) return 'Today';
  if (dateStr === shiftDateStr(today, -1)) return 'Yesterday';
  if (dateStr === shiftDateStr(today, 1)) return 'Tomorrow';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function goToPrevDay() {
  viewDate = shiftDateStr(viewDate, -1);
  renderDashboard();
}

function goToNextDay() {
  const today = Store.todayStr();
  if (viewDate >= today) return; // never navigate past today
  viewDate = shiftDateStr(viewDate, 1);
  renderDashboard();
}

async function renderDashboard() {
  const settings = Store.getSettings();
  const today = Store.todayStr();

  document.getElementById('dash-date-label').textContent = dateLabelFor(viewDate);
  const [y, m, d] = viewDate.split('-').map(Number);
  document.getElementById('dash-date').textContent = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  document.getElementById('dash-next-day').disabled = viewDate >= today;

  const entries = Store.getEntriesForDate(viewDate);
  const totals = Store.sumEntries(entries);

  const proteinPct = pct(totals.protein, settings.proteinTarget);
  document.getElementById('txt-calories').textContent = `${Math.round(totals.calories)} / ${settings.calorieTarget}`;

  const proteinBar = document.getElementById('bar-protein');
  proteinBar.style.width = `${proteinPct}%`;
  document.getElementById('txt-protein').textContent = `${Math.round(totals.protein)} / ${settings.proteinTarget}g`;

  document.getElementById('txt-sodium').textContent = `${Math.round(totals.sodium)}mg`;
  document.getElementById('txt-sugar').textContent = `${Math.round(totals.sugar * 10) / 10}g`;

  const remaining = settings.calorieTarget - totals.calories;
  document.getElementById('txt-calories-remaining').textContent =
    remaining >= 0 ? `${Math.round(remaining)} cal remaining` : `${Math.round(-remaining)} cal over`;

  drawMacroRing(totals);

  const extras = Store.getDailyExtras(viewDate);
  document.getElementById('input-steps').value = extras.steps ?? '';
  document.getElementById('input-standing').value = extras.standingMinutes ?? '';
  renderWater(settings);

  renderWeightProgress(settings);
  await renderMeals(entries, settings);
  updateStreakBadge();
}

function renderWeightProgress(settings) {
  const latest = Store.getLatestWeight();
  const el = document.getElementById('dash-weight-progress');
  const current = latest ? latest.weight : settings.startingWeight;
  const totalToLose = settings.startingWeight - settings.weightGoal;
  const lostSoFar = settings.startingWeight - current;
  const remaining = current - settings.weightGoal;

  if (!latest) {
    el.textContent = `Goal: ${settings.weightGoal} lbs (from starting weight ${settings.startingWeight} lbs). Log a weight entry to track progress.`;
    return;
  }

  const progressPct = totalToLose > 0 ? Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100)) : 0;
  el.innerHTML = `
    Current: <b>${current} lbs</b> &middot; Goal: <b>${settings.weightGoal} lbs</b><br/>
    ${remaining > 0 ? `${remaining.toFixed(1)} lbs to go` : 'Goal reached! 🎉'}
    &middot; ${progressPct.toFixed(0)}% of the way there
    <div class="progress-bar" style="margin-top:6px;">
      <div class="progress-fill" style="width:${progressPct}%"></div>
    </div>
  `;
}

async function renderMeals(entries, settings) {
  const container = document.getElementById('dash-meals');
  container.innerHTML = '';

  if (entries.length === 0) {
    container.innerHTML = '<div class="muted">Nothing logged for this day.</div>';
    return;
  }

  for (const meal of MEAL_ORDER) {
    const items = entries.filter((e) => e.meal === meal).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (items.length === 0) continue;

    const group = document.createElement('div');
    group.className = 'meal-group';
    const heading = document.createElement('h4');
    heading.textContent = meal;
    group.appendChild(heading);

    for (const entry of items) {
      const flags = Store.getFlags(entry, settings);
      const row = document.createElement('div');
      row.className = 'entry-row';

      let photoHtml = '';
      if (entry.photoId) {
        try {
          const blob = await Photos.getPhoto(entry.photoId);
          if (blob) {
            const url = URL.createObjectURL(blob);
            photoHtml = `<img class="entry-photo" src="${url}" alt="meal photo" />`;
          }
        } catch (e) {
          /* ignore missing photo */
        }
      }

      row.innerHTML = `
        ${photoHtml}
        <div class="entry-main">
          <div class="entry-name">${escapeHtml(entry.name)}</div>
          <div class="entry-meta">${Math.round(entry.calories)} cal · ${Math.round(entry.protein)}g protein
            ${flags.sodium ? ' · <span class="entry-flags">⚠️ high sodium</span>' : ''}
            ${flags.sugar ? ' · <span class="entry-flags">⚠️ high sugar</span>' : ''}
          </div>
        </div>
        <button class="entry-delete" data-id="${entry.id}" aria-label="Delete">✕</button>
      `;
      group.appendChild(row);
    }
    container.appendChild(group);
  }

  container.querySelectorAll('.entry-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const entry = Store.getEntries().find((e) => e.id === btn.dataset.id);
      Store.deleteEntry(btn.dataset.id);
      if (entry && entry.photoId) {
        try {
          await Photos.deletePhoto(entry.photoId);
        } catch (e) {
          /* ignore */
        }
      }
      renderDashboard();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function wireDashboardInputs() {
  document.getElementById('input-steps').addEventListener('change', (e) => {
    Store.saveDailyExtras(viewDate, { steps: e.target.value ? Number(e.target.value) : null });
  });
  document.getElementById('input-standing').addEventListener('change', (e) => {
    Store.saveDailyExtras(viewDate, { standingMinutes: e.target.value ? Number(e.target.value) : null });
  });
  document.getElementById('dash-prev-day').addEventListener('click', goToPrevDay);
  document.getElementById('dash-next-day').addEventListener('click', goToNextDay);

  document.querySelectorAll('.btn-water').forEach((btn) => {
    btn.addEventListener('click', () => {
      Store.addWater(viewDate, Number(btn.dataset.oz));
      renderWater(Store.getSettings());
    });
  });
  document.getElementById('btn-water-reset').addEventListener('click', () => {
    Store.saveDailyExtras(viewDate, { waterOz: 0 });
    renderWater(Store.getSettings());
  });
}

export const Dashboard = { renderDashboard, wireDashboardInputs, updateStreakBadge };
