// Minimal CSV parsing + import helpers for MyFitnessPal-style export files
// (Nutrition Summary / Measurement Summary / Exercise Summary).

import { Store } from './state.js';

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] !== undefined ? cols[i] : '').trim();
    });
    return obj;
  });
}

// Combines a "YYYY-MM-DD" date with an optional "H:MM AM/PM" time into a
// local ISO timestamp. Missing time defaults to noon so the entry still
// lands on the right day even without a time-of-day.
function combineDateTime(dateStr, timeStr) {
  const [y, mo, d] = (dateStr || '').split('-').map(Number);
  if (!y || !mo || !d) return new Date().toISOString();

  let hh = 12;
  let mm = 0;
  const match = String(timeStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    hh = parseInt(match[1], 10);
    mm = parseInt(match[2], 10);
    const ap = match[3];
    if (ap && /PM/i.test(ap) && hh !== 12) hh += 12;
    if (ap && /AM/i.test(ap) && hh === 12) hh = 0;
  }
  return new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();
}

const MEAL_NAMES = ['breakfast', 'lunch', 'dinner'];

function importNutritionCSV(text) {
  const rows = parseCSV(text);
  let count = 0;
  for (const row of rows) {
    if (!row.Date || row.Calories === undefined || row.Calories === '') continue;
    const mealRaw = (row.Meal || 'snack').toLowerCase();
    const meal = MEAL_NAMES.includes(mealRaw) ? mealRaw : 'snack';
    Store.addEntry({
      name: `Imported ${meal}${row.Time ? ' — ' + row.Time : ''} (${row.Date})`,
      meal,
      calories: row.Calories,
      protein: row['Protein (g)'],
      carbs: row['Carbohydrates (g)'],
      fat: row['Fat (g)'],
      sodium: row['Sodium (mg)'],
      sugar: row['Sugar'],
      timestamp: combineDateTime(row.Date, row.Time),
      source: 'csv-import',
    });
    count += 1;
  }
  return count;
}

function importMeasurementCSV(text) {
  const rows = parseCSV(text);
  let count = 0;
  for (const row of rows) {
    if (!row.Date || !row.Weight) continue;
    Store.addWeight(row.Date, row.Weight);
    count += 1;
  }
  return count;
}

function importExerciseCSV(text) {
  const rows = parseCSV(text);
  const seenDates = new Set();
  for (const row of rows) {
    if (!row.Date || !row.Steps) continue;
    Store.saveDailyExtras(row.Date, { steps: Number(row.Steps) });
    seenDates.add(row.Date);
  }
  return seenDates.size;
}

function csvEscape(val) {
  const str = String(val ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCSV(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatTimeFromISO(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function exportNutritionCSV() {
  const entries = Store.getEntries().slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const headers = ['Date', 'Meal', 'Time', 'Name', 'Calories', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Sodium (mg)', 'Sugar (g)', 'Nutri-Score', 'NOVA', 'Source'];
  const rows = entries.map((e) => ({
    Date: e.timestamp.slice(0, 10),
    Meal: e.meal,
    Time: formatTimeFromISO(e.timestamp),
    Name: e.name,
    Calories: e.calories,
    'Protein (g)': e.protein,
    'Carbohydrates (g)': e.carbs,
    'Fat (g)': e.fat,
    'Sodium (mg)': e.sodium,
    'Sugar (g)': e.sugar,
    'Nutri-Score': e.nutriscore || '',
    NOVA: e.nova || '',
    Source: e.source || '',
  }));
  downloadCSV(`fitness-tracker-nutrition-${Store.todayStr()}.csv`, toCSV(headers, rows));
  return entries.length;
}

function exportMeasurementCSV() {
  const weights = Store.getWeights();
  const headers = ['Date', 'Weight'];
  const rows = weights.map((w) => ({ Date: w.date, Weight: w.weight }));
  downloadCSV(`fitness-tracker-weight-${Store.todayStr()}.csv`, toCSV(headers, rows));
  return weights.length;
}

function exportDailyExtrasCSV() {
  const all = Store.getAllDailyExtras();
  const dates = Object.keys(all).sort();
  const headers = ['Date', 'Steps', 'Standing Minutes', 'Water (oz)'];
  const rows = dates.map((date) => ({
    Date: date,
    Steps: all[date].steps ?? '',
    'Standing Minutes': all[date].standingMinutes ?? '',
    'Water (oz)': all[date].waterOz ?? '',
  }));
  downloadCSV(`fitness-tracker-daily-${Store.todayStr()}.csv`, toCSV(headers, rows));
  return dates.length;
}

export const CSV = {
  parseCSV,
  combineDateTime,
  importNutritionCSV,
  importMeasurementCSV,
  importExerciseCSV,
  exportNutritionCSV,
  exportMeasurementCSV,
  exportDailyExtrasCSV,
};
