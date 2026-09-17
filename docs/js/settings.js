import { Store } from './state.js';
import { Reminder } from './reminder.js';
import { UI } from './ui.js';
import { CSV } from './csv.js';

// One-time convenience prefill: your actual MyFitnessPal-style export
// (2026-09-09 to 2026-09-16), so the first import is a single tap.
const DEFAULT_NUTRITION_CSV = `Date,Meal,Time,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-09-16,Breakfast,10:45 AM,170.0,3.5,2.5,0.0,0.0,0.0,25.0,210.0,0.0,8.0,5.0,1.0,30.0,0.0,0.0,72.0,0.0,
2026-09-16,Dinner,,240.0,5.0,0.0,3.0,0.0,0.0,0.0,340.0,200.0,38.0,6.0,6.0,10.0,0.0,0.0,3.0,10.0,
2026-09-16,Dinner,7:45 PM,220.0,8.0,5.0,0.0,0.0,0.2,35.0,210.0,416.0,31.0,0.0,22.0,7.0,240.0,2.4,280.0,0.6,
2026-09-16,Dinner,8:25 PM,250.2,6.7,1.3,1.8,2.7,0.0,124.3,996.5,406.0,29.3,2.7,4.8,18.6,78.4,13.5,9.5,6.5,
2026-09-16,Dinner,9:25 PM,260.0,19.0,9.0,2.4,3.0,0.0,420.0,570.0,328.0,2.8,0.0,1.0,20.0,20.0,0.0,30.0,12.0,
2026-09-16,Lunch,1:00 PM,10.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,2.0,1.0,0.0,0.0,0.0,0.0,0.0,0.0,`;

const DEFAULT_MEASUREMENT_CSV = `Date,Weight
2026-09-16,250.0`;

const DEFAULT_EXERCISE_CSV = `Date,Exercise,Type,Exercise Calories,Exercise Minutes,Sets,Reps Per Set,Pounds,Steps,Note
2026-09-16,MFP iOS calorie adjustment,Cardio,14.0,1,,,,1829,`;

function loadSettingsIntoForm() {
  const s = Store.getSettings();
  document.getElementById('s-calorie-target').value = s.calorieTarget;
  document.getElementById('s-protein-target').value = s.proteinTarget;
  document.getElementById('s-starting-weight').value = s.startingWeight;
  document.getElementById('s-weight-goal').value = s.weightGoal;
  document.getElementById('s-water-target').value = s.waterTargetOz;
  document.getElementById('s-sodium-threshold').value = s.sodiumThreshold;
  document.getElementById('s-sugar-threshold').value = s.sugarThreshold;
  document.getElementById('s-reminder-enabled').checked = s.reminderEnabled;
  document.getElementById('s-reminder-time').value = `${String(s.reminderHour).padStart(2, '0')}:${String(
    s.reminderMinute
  ).padStart(2, '0')}`;
  updateReminderStatus(s);

  document.getElementById('s-snack-reminder-enabled').checked = s.snackReminderEnabled;
  document.getElementById('s-snack-reminder-time').value = `${String(s.snackReminderHour).padStart(2, '0')}:${String(
    s.snackReminderMinute
  ).padStart(2, '0')}`;
  updateSnackReminderStatus(s);

  const nBox = document.getElementById('import-nutrition-csv');
  const mBox = document.getElementById('import-measurement-csv');
  const eBox = document.getElementById('import-exercise-csv');
  if (nBox && !nBox.value.trim()) nBox.value = DEFAULT_NUTRITION_CSV;
  if (mBox && !mBox.value.trim()) mBox.value = DEFAULT_MEASUREMENT_CSV;
  if (eBox && !eBox.value.trim()) eBox.value = DEFAULT_EXERCISE_CSV;
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

function updateSnackReminderStatus(s) {
  const el = document.getElementById('snack-reminder-status');
  el.textContent = s.snackReminderEnabled
    ? "Reminds you if no fruit/snack is logged by then."
    : 'Reminder is off.';
}

function wireSettingsForm(onSaved) {
  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const timeVal = document.getElementById('s-reminder-time').value || '13:00';
    const [hh, mm] = timeVal.split(':').map(Number);
    const reminderEnabled = document.getElementById('s-reminder-enabled').checked;

    const snackTimeVal = document.getElementById('s-snack-reminder-time').value || '15:00';
    const [shh, smm] = snackTimeVal.split(':').map(Number);
    const snackReminderEnabled = document.getElementById('s-snack-reminder-enabled').checked;

    const next = Store.saveSettings({
      calorieTarget: Number(document.getElementById('s-calorie-target').value) || 1900,
      proteinTarget: Number(document.getElementById('s-protein-target').value) || 150,
      startingWeight: Number(document.getElementById('s-starting-weight').value) || 251,
      weightGoal: Number(document.getElementById('s-weight-goal').value) || 208,
      waterTargetOz: Number(document.getElementById('s-water-target').value) || 100,
      sodiumThreshold: Number(document.getElementById('s-sodium-threshold').value) || 800,
      sugarThreshold: Number(document.getElementById('s-sugar-threshold').value) || 25,
      reminderEnabled,
      reminderHour: hh,
      reminderMinute: mm,
      snackReminderEnabled,
      snackReminderHour: shh,
      snackReminderMinute: smm,
    });

    if (reminderEnabled || snackReminderEnabled) {
      await Reminder.requestPermissionIfNeeded();
    }
    updateReminderStatus(next);
    updateSnackReminderStatus(next);
    Reminder.startReminderLoop();
    onSaved && onSaved();
  });

  document.getElementById('btn-import-csv').addEventListener('click', () => {
    const statusEl = document.getElementById('import-status');
    const nText = document.getElementById('import-nutrition-csv').value.trim();
    const mText = document.getElementById('import-measurement-csv').value.trim();
    const eText = document.getElementById('import-exercise-csv').value.trim();

    let nCount = 0;
    let mCount = 0;
    let eCount = 0;
    try {
      if (nText) nCount = CSV.importNutritionCSV(nText);
      if (mText) mCount = CSV.importMeasurementCSV(mText);
      if (eText) eCount = CSV.importExerciseCSV(eText);
    } catch (e) {
      statusEl.textContent = `Couldn't read that: ${e.message}`;
      return;
    }

    document.getElementById('import-nutrition-csv').value = '';
    document.getElementById('import-measurement-csv').value = '';
    document.getElementById('import-exercise-csv').value = '';

    const parts = [];
    if (nText) parts.push(`${nCount} food entr${nCount === 1 ? 'y' : 'ies'}`);
    if (mText) parts.push(`${mCount} weight entr${mCount === 1 ? 'y' : 'ies'}`);
    if (eText) parts.push(`steps for ${eCount} day${eCount === 1 ? '' : 's'}`);
    const summary = parts.length ? `Imported ${parts.join(', ')}.` : 'Nothing to import — all boxes were empty.';
    statusEl.textContent = summary;
    UI.showToast(summary);
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
