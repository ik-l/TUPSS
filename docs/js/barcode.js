// Barcode scanning (device camera) + Open Food Facts lookup.
// Camera scanning relies on the html5-qrcode library loaded globally via
// a <script> tag in index.html (window.Html5Qrcode).

let scannerInstance = null;

function isCameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && !!window.Html5Qrcode;
}

async function startScanner(elementId, onDetected, onError) {
  if (!window.Html5Qrcode) {
    onError && onError(new Error('Barcode scanner library did not load (no internet connection?).'));
    return;
  }
  stopScanner();
  scannerInstance = new window.Html5Qrcode(elementId, { verbose: false });
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 150 },
    formatsToSupport: window.Html5QrcodeSupportedFormats
      ? [
          window.Html5QrcodeSupportedFormats.EAN_13,
          window.Html5QrcodeSupportedFormats.EAN_8,
          window.Html5QrcodeSupportedFormats.UPC_A,
          window.Html5QrcodeSupportedFormats.UPC_E,
          window.Html5QrcodeSupportedFormats.CODE_128,
          window.Html5QrcodeSupportedFormats.CODE_39,
        ]
      : undefined,
  };
  try {
    await scannerInstance.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        onDetected(decodedText);
      },
      () => {
        /* per-frame decode failures are normal, ignore */
      }
    );
  } catch (err) {
    onError && onError(err);
  }
}

async function stopScanner() {
  if (scannerInstance) {
    try {
      await scannerInstance.stop();
      scannerInstance.clear();
    } catch (e) {
      // ignore stop errors (e.g. already stopped)
    }
    scannerInstance = null;
  }
}

// Pull a usable numeric value out of Open Food Facts' nutriments object,
// preferring per-serving values and falling back to per-100g.
function pickNutrient(nutriments, base) {
  if (!nutriments) return { value: 0, basis: 'unknown' };
  if (typeof nutriments[`${base}_serving`] === 'number') {
    return { value: nutriments[`${base}_serving`], basis: 'serving' };
  }
  if (typeof nutriments[`${base}_100g`] === 'number') {
    return { value: nutriments[`${base}_100g`], basis: '100g' };
  }
  return { value: 0, basis: 'unknown' };
}

async function lookupBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Lookup failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    return null; // not found
  }
  const p = data.product;
  const n = p.nutriments || {};
  const calories = pickNutrient(n, 'energy-kcal');
  const protein = pickNutrient(n, 'proteins');
  const carbs = pickNutrient(n, 'carbohydrates');
  const fat = pickNutrient(n, 'fat');
  const sodiumG = pickNutrient(n, 'sodium'); // OFF reports sodium in grams
  const sugar = pickNutrient(n, 'sugars');

  return {
    name: p.product_name || p.generic_name || `Barcode ${barcode}`,
    calories: Math.round(calories.value) || 0,
    protein: round1(protein.value),
    carbs: round1(carbs.value),
    fat: round1(fat.value),
    sodium: Math.round(sodiumG.value * 1000) || 0, // convert g -> mg
    sugar: round1(sugar.value),
    basis: calories.basis, // 'serving' | '100g' | 'unknown' - shown to user so they know to adjust
    brand: p.brands || '',
    imageUrl: p.image_front_small_url || p.image_small_url || null,
    nutriscore: (p.nutriscore_grade || '').toUpperCase() || null, // 'A'..'E'
    nova: p.nova_group || null, // 1..4 (higher = more processed)
  };
}

function round1(n) {
  return Math.round((n || 0) * 10) / 10;
}

export const Barcode = { isCameraSupported, startScanner, stopScanner, lookupBarcode };
