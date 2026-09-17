import { Store } from './state.js';
import { Reminder } from './reminder.js';

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

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    const ok = confirm('This will permanently delete all logged food, weight entries, favorites, and photos on this device. Continue?');
    if (!ok) return;
    localStorage.clear();
    indexedDB.deleteDatabase('fitness-tracker-photos');
    location.reload();
  });
}

export const Settings = { loadSettingsIntoForm, wireSettingsForm };
