import { Store } from './state.js';
import { Swaps } from './swaps.js';
import { Photos } from './photos.js';
import { Barcode } from './barcode.js';
import { Quality } from './quality.js';

let pendingPhotoFile = null;
let pendingScanMeta = null; // { nutriscore, nova } from the last barcode lookup, cleared on form reset/edit

function fields() {
  return {
    name: document.getElementById('f-name'),
    meal: document.getElementById('f-meal'),
    calories: document.getElementById('f-calories'),
    protein: document.getElementById('f-protein'),
    carbs: document.getElementById('f-carbs'),
    fat: document.getElementById('f-fat'),
    sodium: document.getElementById('f-sodium'),
    sugar: document.getElementById('f-sugar'),
    photo: document.getElementById('f-photo'),
    saveFav: document.getElementById('f-save-fav'),
  };
}

function fillForm(data) {
  const f = fields();
  if (data.name != null) f.name.value = data.name;
  if (data.calories != null) f.calories.value = data.calories;
  if (data.protein != null) f.protein.value = data.protein;
  if (data.carbs != null) f.carbs.value = data.carbs;
  if (data.fat != null) f.fat.value = data.fat;
  if (data.sodium != null) f.sodium.value = data.sodium;
  if (data.sugar != null) f.sugar.value = data.sugar;
  pendingScanMeta = (data.nutriscore || data.nova) ? { nutriscore: data.nutriscore, nova: data.nova } : null;
  renderScanBadge();
  checkSwapSuggestion();
  checkAlertPreview();
}

function renderScanBadge() {
  const badge = document.getElementById('scan-quality-badge');
  if (!badge) return;
  badge.innerHTML = pendingScanMeta ? Quality.chipsHtml(pendingScanMeta.nutriscore, pendingScanMeta.nova) : '';
}

function checkSwapSuggestion() {
  const name = fields().name.value;
  const banner = document.getElementById('swap-banner');
  const suggestion = Swaps.getSwapSuggestion(name);
  if (suggestion) {
    banner.textContent = `💡 ${suggestion.restaurant}: ${suggestion.suggestion}`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function checkAlertPreview() {
  const f = fields();
  const settings = Store.getSettings();
  const sodium = Number(f.sodium.value) || 0;
  const sugar = Number(f.sugar.value) || 0;
  const banner = document.getElementById('alert-banner');
  const msgs = [];
  if (sodium > settings.sodiumThreshold) msgs.push(`⚠️ Sodium is ${Math.round(sodium)}mg (over ${settings.sodiumThreshold}mg)`);
  if (sugar > settings.sugarThreshold) msgs.push(`⚠️ Sugar is ${sugar}g (over ${settings.sugarThreshold}g)`);
  if (msgs.length) {
    banner.innerHTML = msgs.join('<br/>');
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function resetForm() {
  document.getElementById('form-log').reset();
  document.getElementById('f-meal').value = 'snack';
  document.getElementById('swap-banner').classList.add('hidden');
  document.getElementById('alert-banner').classList.add('hidden');
  pendingPhotoFile = null;
  pendingScanMeta = null;
  renderScanBadge();
}

async function handleSubmit(e, onSaved) {
  e.preventDefault();
  const f = fields();

  let photoId = null;
  if (pendingPhotoFile) {
    photoId = Store.uid();
    try {
      await Photos.savePhoto(photoId, pendingPhotoFile);
    } catch (err) {
      console.error('Could not save photo', err);
      photoId = null;
    }
  }

  const data = {
    name: f.name.value.trim(),
    meal: f.meal.value,
    calories: f.calories.value,
    protein: f.protein.value,
    carbs: f.carbs.value,
    fat: f.fat.value,
    sodium: f.sodium.value,
    sugar: f.sugar.value,
    photoId,
    nutriscore: pendingScanMeta ? pendingScanMeta.nutriscore : null,
    nova: pendingScanMeta ? pendingScanMeta.nova : null,
    source: pendingScanMeta ? 'barcode' : 'manual',
  };

  Store.addEntry(data);

  if (f.saveFav.checked) {
    Store.addFavorite({ ...data, label: data.name });
  }

  resetForm();
  onSaved && onSaved();
}

function wireLogForm(onSaved) {
  const f = fields();
  f.name.addEventListener('input', checkSwapSuggestion);
  f.sodium.addEventListener('input', checkAlertPreview);
  f.sugar.addEventListener('input', checkAlertPreview);
  f.photo.addEventListener('change', () => {
    pendingPhotoFile = f.photo.files && f.photo.files[0] ? f.photo.files[0] : null;
  });

  document.getElementById('form-log').addEventListener('submit', (e) => handleSubmit(e, onSaved));

  wireBarcodeScanning();
}

function wireBarcodeScanning() {
  const btnScan = document.getElementById('btn-scan');
  const btnCancel = document.getElementById('btn-scan-cancel');
  const scanArea = document.getElementById('scan-area');
  const statusEl = document.getElementById('scan-status');

  btnScan.addEventListener('click', async () => {
    if (!Barcode.isCameraSupported()) {
      statusEl.textContent = 'Camera scanning is not available on this device/browser. Enter the item manually below.';
      return;
    }
    statusEl.textContent = '';
    scanArea.classList.remove('hidden');
    await Barcode.startScanner(
      'reader',
      async (code) => {
        statusEl.textContent = `Scanned ${code} — looking it up...`;
        await Barcode.stopScanner();
        scanArea.classList.add('hidden');
        try {
          const product = await Barcode.lookupBarcode(code);
          if (!product) {
            statusEl.textContent = `No product found for barcode ${code}. Enter it manually below.`;
            return;
          }
          fillForm(product);
          const basisNote = product.basis === '100g' ? ' (values are per 100g — adjust for your portion)' : '';
          statusEl.textContent = `Found: ${product.name}${product.brand ? ' — ' + product.brand : ''}${basisNote}`;
        } catch (err) {
          statusEl.textContent = `Lookup failed: ${err.message}. Enter it manually below.`;
        }
      },
      (err) => {
        statusEl.textContent = `Camera error: ${err.message || err}`;
        scanArea.classList.add('hidden');
      }
    );
  });

  btnCancel.addEventListener('click', async () => {
    await Barcode.stopScanner();
    scanArea.classList.add('hidden');
    statusEl.textContent = '';
  });
}

export const Log = { wireLogForm, fillForm };
