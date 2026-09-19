import { Store } from './state.js';
import { UI } from './ui.js';

function renderFavorites(onLogged) {
  const listEl = document.getElementById('favorites-list');
  const favorites = Store.getFavorites();

  if (favorites.length === 0) {
    listEl.innerHTML = '<div class="muted">No favorites saved yet. Add one below, or check "save as favorite" when logging an item.</div>';
    return;
  }

  listEl.innerHTML = favorites
    .map(
      (f) => `
      <div class="fav-row">
        <div>
          <div class="fav-name">${escapeHtml(f.label)}</div>
          <div class="fav-meta">${f.meal} · ${Math.round(f.calories)} cal · ${Math.round(f.protein)}g protein</div>
        </div>
        <div class="fav-actions">
          <button class="btn-small btn-log" data-id="${f.id}" data-action="log">Log Now</button>
          <button class="btn-small btn-del" data-id="${f.id}" data-action="del">Delete</button>
        </div>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('[data-action="log"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fav = Store.getFavorites().find((f) => f.id === btn.dataset.id);
      if (!fav) return;
      Store.addEntry({
        name: fav.name,
        meal: fav.meal,
        calories: fav.calories,
        protein: fav.protein,
        carbs: fav.carbs,
        fat: fav.fat,
        sodium: fav.sodium,
        sugar: fav.sugar,
        source: 'favorite',
      });
      UI.showToast(`Logged: ${fav.label}`);
      onLogged && onLogged(fav);
    });
  });

  listEl.querySelectorAll('[data-action="del"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Store.deleteFavorite(btn.dataset.id);
      renderFavorites(onLogged);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function wireFavoriteForm(onSaved) {
  document.getElementById('form-favorite').addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('fav-label').value.trim();
    if (!label) return;
    Store.addFavorite({
      label,
      name: label,
      meal: document.getElementById('fav-meal').value,
      calories: document.getElementById('fav-calories').value,
      protein: document.getElementById('fav-protein').value,
      carbs: document.getElementById('fav-carbs').value,
      fat: document.getElementById('fav-fat').value,
      sodium: document.getElementById('fav-sodium').value,
      sugar: document.getElementById('fav-sugar').value,
    });
    document.getElementById('form-favorite').reset();
    document.getElementById('fav-meal').value = 'snack';
    renderFavorites(onSaved);
    onSaved && onSaved();
  });
}

// ---------- Recipe builder ----------
// A "recipe" here is just several ingredients summed into one Favorite —
// there's no separate recipe data model, it reuses the existing favorites store.

let ingredientCount = 0;

function ingredientRowHtml(idx) {
  return `
    <div class="ingredient-row" data-idx="${idx}">
      <div class="ingredient-header">
        <input type="text" class="ing-name" placeholder="Ingredient (e.g. Chicken breast, 6oz)" />
        <button type="button" class="entry-delete ing-delete" aria-label="Remove ingredient">✕</button>
      </div>
      <div class="two-col">
        <label>Calories<input type="number" class="ing-calories" min="0" step="1" /></label>
        <label>Protein (g)<input type="number" class="ing-protein" min="0" step="0.1" /></label>
      </div>
      <div class="two-col">
        <label>Carbs (g)<input type="number" class="ing-carbs" min="0" step="0.1" /></label>
        <label>Fat (g)<input type="number" class="ing-fat" min="0" step="0.1" /></label>
      </div>
      <div class="two-col">
        <label>Sodium (mg)<input type="number" class="ing-sodium" min="0" step="1" /></label>
        <label>Sugar (g)<input type="number" class="ing-sugar" min="0" step="0.1" /></label>
      </div>
    </div>
  `;
}

function addIngredientRow() {
  const container = document.getElementById('recipe-ingredients');
  const div = document.createElement('div');
  div.innerHTML = ingredientRowHtml(ingredientCount++);
  container.appendChild(div.firstElementChild);
  recalcRecipeTotals();
}

function recalcRecipeTotals() {
  const rows = document.querySelectorAll('#recipe-ingredients .ingredient-row');
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, sugar: 0 };
  rows.forEach((row) => {
    totals.calories += Number(row.querySelector('.ing-calories').value) || 0;
    totals.protein += Number(row.querySelector('.ing-protein').value) || 0;
    totals.carbs += Number(row.querySelector('.ing-carbs').value) || 0;
    totals.fat += Number(row.querySelector('.ing-fat').value) || 0;
    totals.sodium += Number(row.querySelector('.ing-sodium').value) || 0;
    totals.sugar += Number(row.querySelector('.ing-sugar').value) || 0;
  });
  document.getElementById('recipe-total-calories').textContent = Math.round(totals.calories);
  document.getElementById('recipe-total-protein').textContent = `${Math.round(totals.protein)}g`;
  document.getElementById('recipe-total-carbs').textContent = `${Math.round(totals.carbs)}g`;
  document.getElementById('recipe-total-fat').textContent = `${Math.round(totals.fat)}g`;
  return totals;
}

function wireRecipeBuilder(onSaved) {
  document.getElementById('btn-add-ingredient').addEventListener('click', addIngredientRow);
  addIngredientRow(); // start with one row so the form isn't empty

  document.getElementById('recipe-ingredients').addEventListener('input', recalcRecipeTotals);
  document.getElementById('recipe-ingredients').addEventListener('click', (e) => {
    if (e.target.classList.contains('ing-delete')) {
      e.target.closest('.ingredient-row').remove();
      recalcRecipeTotals();
    }
  });

  document.getElementById('btn-save-recipe').addEventListener('click', () => {
    const name = document.getElementById('recipe-name').value.trim();
    const statusEl = document.getElementById('recipe-status');
    const rowCount = document.querySelectorAll('#recipe-ingredients .ingredient-row').length;
    if (!name) {
      statusEl.textContent = 'Give the recipe a name first.';
      return;
    }
    if (rowCount === 0) {
      statusEl.textContent = 'Add at least one ingredient first.';
      return;
    }
    const totals = recalcRecipeTotals();
    Store.addFavorite({
      label: name,
      name,
      meal: document.getElementById('recipe-meal').value,
      ...totals,
    });

    document.getElementById('recipe-ingredients').innerHTML = '';
    document.getElementById('recipe-name').value = '';
    ingredientCount = 0;
    addIngredientRow();
    statusEl.textContent = `Saved "${name}" as a favorite (${Math.round(totals.calories)} cal total).`;
    UI.showToast(`Saved recipe: ${name}`);
    renderFavorites(onSaved);
    onSaved && onSaved();
  });
}

export const Favorites = { renderFavorites, wireFavoriteForm, wireRecipeBuilder };
