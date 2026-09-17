import { Store } from './state.js';
import { Reminder } from './reminder.js';
import { UI } from './ui.js';

// One-time convenience default for the "Import from another app" box, so a
// backfill from another tracker is a single tap instead of retyping items.
// Times are combined with *today's* date at import time (see parseTimeToToday),
// so this stays correct no matter which day it's actually used.
const DEFAULT_IMPORT = [
  { name: 'Vanilla Protein Shake (Oikos)', meal: 'breakfast', time: '10:45 AM', calories: 170, protein: 30, carbs: 8, fat: 4, sodium: 0, sugar: 0 },
  { name: 'Raspberry Lemon Sparkling Energy Drink (Bloom)', meal: 'lunch', time: '1:00 PM', calories: 10, protein: 0, carbs: 2, fat: 0, sodium: 0, sugar: 0 },
  { name: 'Dinner: Chocolate Milk, Vietnamese Summer Roll, Spring Roll, Bread, Pepper Jack Singles, Over Easy Egg', meal: 'dinner', time: '7:45 PM', calories: 970, protein: 56, carbs: 101, fat: 39, sodium: 0, sugar: 0 },
];

function parseTimeToToday(timeStr) {
  const match = String(timeStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  const d = new Date();
  if (!match) return d.toISOString();
  let hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const ap = match[3];
  if (ap && /PM/i.test(ap) && hh !== 12) hh += 12;
  if (ap && /AM/i.test(ap) && hh === 12) hh = 0;
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function loadSettingsIntoForm() {
  const s = Store.getSettings();
  document.getElementById('s-calorie-target').value = s.calorieTarget;
  document.getElementById('s-protein-target').value = s.proteinTarget;
  document.getElementById('s-starting-weight').value = s.startingWeight;
  document.getElementById('s-weight-goal').value = s.weightGoal;
  document.getElementById('s-sodium-threshold').value = s.sodiumThreshold;
  document.getElementById('s-sugar-threshold').value = s.sugarThreshold;
  document.getElementById('s-reminder-enabled').checked = s.reminderEnabled;
  document.getElementById('s-reminder-time').value = `${String(s.reminderHour).padStart(2, '0')}:${String(
    s.reminderMinute
  ).padStart(2, '0')}`;
  updateReminderStatus(s);

  const importBox = document.getElementById('import-textarea');
  if (importBox && !importBox.value.trim()) {
    importBox.value = JSON.stringify(DEFAULT_IMPORT, null, 2);
  }
}

function updateReminderStatus(s) {
  const el = document.getElementById('reminder-status');
  if (!s.reminderEnabled) {
    el.textContent = 'Reminder is off.';
    return;
  }
  const permission = window.Notification ? Notification.permission : 'unsupported';
  const permNote =
    permission === 'granted'
      ? 'Browser notifications enabled.'
      : permission === 'denied'
      ? 'Browser notifications blocked — you\'ll still see an in-app banner while this tab is open.'
      : 'You\'ll see an in-app banner while this tab is open (allow notifications for an OS alert too).';
  el.textContent = `Reminds you if nothing is logged by then. ${permNote}`;
}

function wireSettingsForm(onSaved) {
  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const timeVal = document.getElementById('s-reminder-time').value || '13:00';
    const [hh, mm] = timeVal.split(':').map(Number);
    const reminderEnabled = document.getElementById('s-reminder-enabled').checked;

    const next = Store.saveSettings({
      calorieTarget: Number(document.getElementById('s-calorie-target').value) || 1900,
      proteinTarget: Number(document.getElementById('s-protein-target').value) || 150,
      startingWeight: Number(document.getElementById('s-starting-weight').value) || 251,
      weightGoal: Number(document.getElementById('s-weight-goal').value) || 208,
      sodiumThreshold: Number(document.getElementById('s-sodium-threshold').value) || 800,
      sugarThreshold: Number(document.getElementById('s-sugar-threshold').value) || 25,
      reminderEnabled,
      reminderHour: hh,
      reminderMinute: mm,
    });

    if (reminderEnabled) {
      await Reminder.requestPermissionIfNeeded();
    }
    updateReminderStatus(next);
    Reminder.startReminderLoop();
    onSaved && onSaved();
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    const box = document.getElementById('import-textarea');
    const statusEl = document.getElementById('import-status');
    let items;
    try {
      items = JSON.parse(box.value);
      if (!Array.isArray(items)) throw new Error('Expected a list of items');
    } catch (e) {
      statusEl.textContent = `Couldn't read that: ${e.message}`;
      return;
    }

    let count = 0;
    for (const item of items) {
      if (!item || !item.name) continue;
      Store.addEntry({
        name: item.name,
        meal: item.meal || 'snack',
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        sodium: item.sodium,
        sugar: item.sugar,
        timestamp: parseTimeToToday(item.time),
        source: 'import',
      });
      count += 1;
    }

    box.value = '';
    statusEl.textContent = `Imported ${count} item${count === 1 ? '' : 's'} into today's log. Check the Dashboard tab.`;
    UI.showToast(`Imported ${count} item${count === 1 ? '' : 's'}`);
    onSaved && onSaved();
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    const ok = confirm('This will permanently delete all logged food, weight entries, favorites, and photos on this device. Continue?');
    if (!ok) return;
    localStorage.clear();
    indexedDB.deleteDatabase('fitness-tracker-photos');
    location.reload();
  });
}

export const Settings = { loadSettingsIntoForm, wireSettingsForm };
