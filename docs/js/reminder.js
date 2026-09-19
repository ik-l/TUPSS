// Midday meal reminder. Works only while the app tab is open in the browser
// (there's no backend/push service in v1), so it's a best-effort nudge:
// an in-app toast, plus a browser Notification if the user granted permission.

import { Store } from './state.js';
import { UI } from './ui.js';

let intervalId = null;

function sendReminder(message) {
  if (window.Notification && Notification.permission === 'granted') {
    try {
      new Notification('Fitness Tracker', { body: message });
      return;
    } catch (e) {
      /* fall through to toast */
    }
  }
  UI.showToast(message, 8000);
}

function maybeFireReminder() {
  const settings = Store.getSettings();
  if (!settings.reminderEnabled) return;

  const now = new Date();
  const target = new Date(now);
  target.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
  if (now < target) return;

  const today = Store.todayStr();
  const reminderState = Store.getReminderState();
  if (reminderState.lastShownDate === today) return;

  const hasLoggedToday = Store.getEntriesForDate(today).length > 0;
  if (hasLoggedToday) {
    Store.saveReminderState({ lastShownDate: today });
    return;
  }

  sendReminder("You haven't logged a meal today yet — don't skip to dinner. Log something now.");
  Store.saveReminderState({ lastShownDate: today });
}

function maybeFireSnackReminder() {
  const settings = Store.getSettings();
  if (!settings.snackReminderEnabled) return;

  const now = new Date();
  const target = new Date(now);
  target.setHours(settings.snackReminderHour, settings.snackReminderMinute, 0, 0);
  if (now < target) return;

  const today = Store.todayStr();
  const reminderState = Store.getReminderState();
  if (reminderState.lastSnackShownDate === today) return;

  const hasSnackToday = Store.getEntriesForDate(today).some((e) => e.meal === 'snack');
  if (hasSnackToday) {
    Store.saveReminderState({ lastSnackShownDate: today });
    return;
  }

  sendReminder("No fruit or snack logged yet today — a good time for one.");
  Store.saveReminderState({ lastSnackShownDate: today });
}

function startReminderLoop() {
  if (intervalId) clearInterval(intervalId);
  maybeFireReminder();
  maybeFireSnackReminder();
  intervalId = setInterval(() => {
    maybeFireReminder();
    maybeFireSnackReminder();
  }, 60 * 1000);
}

async function requestPermissionIfNeeded() {
  if (window.Notification && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (e) {
      /* ignore */
    }
  }
}

export const Reminder = { startReminderLoop, requestPermissionIfNeeded };
