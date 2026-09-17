import { Dashboard } from './dashboard.js';
import { Log } from './log.js';
import { Favorites } from './favorites.js';
import { Weight } from './weight.js';
import { Settings } from './settings.js';
import { Reminder } from './reminder.js';
import { Trends } from './trends.js';

function switchView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelector(`.tab[data-view="${name}"]`).classList.add('active');

  if (name === 'dashboard') Dashboard.renderDashboard();
  if (name === 'favorites') Favorites.renderFavorites(() => Dashboard.updateStreakBadge());
  if (name === 'weight') {
    Weight.renderWeightView();
    Trends.renderTrends();
  }
  if (name === 'settings') Settings.loadSettingsIntoForm();
}

function wireTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
}

function init() {
  wireTabs();
  Dashboard.wireDashboardInputs();
  Log.wireLogForm(() => switchView('dashboard'));
  Favorites.wireFavoriteForm();
  Weight.wireWeightForm();
  Settings.wireSettingsForm();
  Reminder.startReminderLoop();
  switchView('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
