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

export const Favorites = { renderFavorites, wireFavoriteForm };
