import { Store } from './state.js';
import { Photos } from './photos.js';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

function pct(value, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, (value / target) * 100));
}

function updateStreakBadge() {
  const { count } = Store.computeStreak();
  document.getElementById('streak-badge').textContent = `🔥 ${count}`;
}

async function renderDashboard() {
  const settings = Store.getSettings();
  const today = Store.todayStr();
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const entries = Store.getEntriesForDate(today);
  const totals = Store.sumEntries(entries);

  const calPct = pct(totals.calories, settings.calorieTarget);
  const proteinPct = pct(totals.protein, settings.proteinTarget);
  const calBar = document.getElementById('bar-calories');
  calBar.style.width = `${calPct}%`;
  calBar.classList.toggle('over', totals.calories > settings.calorieTarget);
  document.getElementById('txt-calories').textContent = `${Math.round(totals.calories)} / ${settings.calorieTarget}`;

  const proteinBar = document.getElementById('bar-protein');
  proteinBar.style.width = `${proteinPct}%`;
  document.getElementById('txt-protein').textContent = `${Math.round(totals.protein)} / ${settings.proteinTarget}g`;

  document.getElementById('txt-carbs').textContent = `${Math.round(totals.carbs)}g`;
  document.getElementById('txt-fat').textContent = `${Math.round(totals.fat)}g`;
  document.getElementById('txt-sodium').textContent = `${Math.round(totals.sodium)}mg`;
  document.getElementById('txt-sugar').textContent = `${Math.round(totals.sugar * 10) / 10}g`;

  const extras = Store.getDailyExtras(today);
  document.getElementById('input-steps').value = extras.steps ?? '';
  document.getElementById('input-standing').value = extras.standingMinutes ?? '';

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
    container.innerHTML = '<div class="muted">Nothing logged yet today.</div>';
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
  const today = Store.todayStr();
  document.getElementById('input-steps').addEventListener('change', (e) => {
    Store.saveDailyExtras(today, { steps: e.target.value ? Number(e.target.value) : null });
  });
  document.getElementById('input-standing').addEventListener('change', (e) => {
    Store.saveDailyExtras(today, { standingMinutes: e.target.value ? Number(e.target.value) : null });
  });
}

export const Dashboard = { renderDashboard, wireDashboardInputs, updateStreakBadge };
