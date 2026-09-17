// Central data layer. Everything is stored in localStorage as plain JSON.
// Photos are stored separately in IndexedDB (see photos.js) because they're
// too large to keep comfortably in localStorage.

const KEYS = {
  entries: 'ft_food_entries',
  weights: 'ft_weight_entries',
  daily: 'ft_daily_extras',
  favorites: 'ft_favorites',
  settings: 'ft_settings',
  reminder: 'ft_reminder_state',
};

const DEFAULT_SETTINGS = {
  calorieTarget: 1900,
  proteinTarget: 150,
  sodiumThreshold: 800, // mg, per item
  sugarThreshold: 25, // g, per item
  startingWeight: 251,
  weightGoal: 208,
  reminderEnabled: false,
  reminderHour: 13,
  reminderMinute: 0,
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------- Settings ----------
function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) };
}

function saveSettings(partial) {
  const current = getSettings();
  const next = { ...current, ...partial };
  writeJSON(KEYS.settings, next);
  return next;
}

// ---------- Food entries ----------
function getEntries() {
  return readJSON(KEYS.entries, []);
}

function addEntry(entry) {
  const entries = getEntries();
  const full = {
    id: uid(),
    name: entry.name || 'Unnamed item',
    meal: entry.meal || 'snack',
    calories: Number(entry.calories) || 0,
    protein: Number(entry.protein) || 0,
    carbs: Number(entry.carbs) || 0,
    fat: Number(entry.fat) || 0,
    sodium: Number(entry.sodium) || 0,
    sugar: Number(entry.sugar) || 0,
    timestamp: entry.timestamp || new Date().toISOString(),
    photoId: entry.photoId || null,
    source: entry.source || 'manual',
  };
  entries.push(full);
  writeJSON(KEYS.entries, entries);
  return full;
}

function deleteEntry(id) {
  const entries = getEntries().filter((e) => e.id !== id);
  writeJSON(KEYS.entries, entries);
}

function getEntriesForDate(dateStr) {
  return getEntries().filter((e) => todayStr(new Date(e.timestamp)) === dateStr);
}

function getFlags(entry, settings) {
  const s = settings || getSettings();
  return {
    sodium: entry.sodium > s.sodiumThreshold,
    sugar: entry.sugar > s.sugarThreshold,
  };
}

function sumEntries(entries) {
  return entries.reduce(
    (acc, e) => {
      acc.calories += e.calories;
      acc.protein += e.protein;
      acc.carbs += e.carbs;
      acc.fat += e.fat;
      acc.sodium += e.sodium;
      acc.sugar += e.sugar;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, sugar: 0 }
  );
}

// ---------- Streak ----------
function computeStreak() {
  const entries = getEntries();
  const days = new Set(entries.map((e) => todayStr(new Date(e.timestamp))));
  const today = new Date();
  const todayKey = todayStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = todayStr(yesterday);

  let cursor;
  if (days.has(todayKey)) {
    cursor = new Date(today);
  } else if (days.has(yesterdayKey)) {
    cursor = new Date(yesterday);
  } else {
    return { count: 0, atRisk: false };
  }

  let count = 0;
  while (days.has(todayStr(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count, atRisk: !days.has(todayKey) };
}

// ---------- Weight ----------
function getWeights() {
  return readJSON(KEYS.weights, []).sort((a, b) => a.date.localeCompare(b.date));
}

function addWeight(date, weight) {
  const weights = readJSON(KEYS.weights, []);
  const existingIdx = weights.findIndex((w) => w.date === date);
  const entry = { id: uid(), date, weight: Number(weight) };
  if (existingIdx >= 0) {
    entry.id = weights[existingIdx].id;
    weights[existingIdx] = entry;
  } else {
    weights.push(entry);
  }
  writeJSON(KEYS.weights, weights);
  return entry;
}

function deleteWeight(id) {
  const weights = readJSON(KEYS.weights, []).filter((w) => w.id !== id);
  writeJSON(KEYS.weights, weights);
}

function getLatestWeight() {
  const weights = getWeights();
  return weights.length ? weights[weights.length - 1] : null;
}

// ---------- Daily extras (steps / standing) ----------
function getDailyExtras(dateStr) {
  const all = readJSON(KEYS.daily, {});
  return all[dateStr] || { steps: null, standingMinutes: null };
}

function saveDailyExtras(dateStr, partial) {
  const all = readJSON(KEYS.daily, {});
  all[dateStr] = { ...(all[dateStr] || {}), ...partial };
  writeJSON(KEYS.daily, all);
  return all[dateStr];
}

// ---------- Favorites ----------
function getFavorites() {
  return readJSON(KEYS.favorites, []);
}

function addFavorite(fav) {
  const favorites = getFavorites();
  const full = {
    id: uid(),
    label: fav.label || fav.name,
    name: fav.name || 'Unnamed item',
    meal: fav.meal || 'snack',
    calories: Number(fav.calories) || 0,
    protein: Number(fav.protein) || 0,
    carbs: Number(fav.carbs) || 0,
    fat: Number(fav.fat) || 0,
    sodium: Number(fav.sodium) || 0,
    sugar: Number(fav.sugar) || 0,
  };
  favorites.push(full);
  writeJSON(KEYS.favorites, favorites);
  return full;
}

function deleteFavorite(id) {
  const favorites = getFavorites().filter((f) => f.id !== id);
  writeJSON(KEYS.favorites, favorites);
}

// ---------- Reminder state ----------
function getReminderState() {
  return readJSON(KEYS.reminder, { lastShownDate: null });
}

function saveReminderState(partial) {
  const current = getReminderState();
  const next = { ...current, ...partial };
  writeJSON(KEYS.reminder, next);
  return next;
}

export const Store = {
  uid,
  todayStr,
  getSettings,
  saveSettings,
  getEntries,
  addEntry,
  deleteEntry,
  getEntriesForDate,
  getFlags,
  sumEntries,
  computeStreak,
  getWeights,
  addWeight,
  deleteWeight,
  getLatestWeight,
  getDailyExtras,
  saveDailyExtras,
  getFavorites,
  addFavorite,
  deleteFavorite,
  getReminderState,
  saveReminderState,
};
