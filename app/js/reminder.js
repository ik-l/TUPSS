// Midday meal reminder. Works only while the app tab is open in the browser
// (there's no backend/push service in v1), so it's a best-effort nudge:
// an in-app toast, plus a browser Notification if the user granted permission.

import { Store } from './state.js';
import { UI } from './ui.js';

let intervalId = null;

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

  const message = "You haven't logged a meal today yet — don't skip to dinner. Log something now.";
  if (window.Notification && Notification.permission === 'granted') {
    try {
      new Notification('Fitness Tracker', { body: message });
    } catch (e) {
      UI.showToast(message, 8000);
    }
  } else {
    UI.showToast(message, 8000);
  }
  Store.saveReminderState({ lastShownDate: today });
}

function startReminderLoop() {
  if (intervalId) clearInterval(intervalId);
  maybeFireReminder();
  intervalId = setInterval(maybeFireReminder, 60 * 1000);
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
