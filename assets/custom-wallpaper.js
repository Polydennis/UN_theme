(function () {
  const pricePerSqM = 24.9;
  const STORAGE_KEY = 'wall.measurements.v1';
  const COOKIE_NAME = 'wall_measurements';

  const widthInput = document.querySelector('[data-wallpaper-width]');
  const heightInput = document.querySelector('[data-wallpaper-height]');
  const priceEl = document.querySelector('[data-wallpaper-price]');
  const propWidth = document.querySelector('[data-wallpaper-prop-width]');
  const propHeight = document.querySelector('[data-wallpaper-prop-height]');
  const propArea = document.querySelector('[data-wallpaper-prop-area]');
  const propSku = document.querySelector('[data-wallpaper-prop-sku]');
  const qtyInput = document.querySelector('[data-wallpaper-quantity]');

  const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  });

  // Prefill from persisted measurements
  const persisted = load();
  if (persisted) {
    if (typeof persisted.width === 'number') widthInput.value = (persisted.width / 100).toFixed(2);
    if (typeof persisted.height === 'number') heightInput.value = (persisted.height / 100).toFixed(2);
  }

  update();

  widthInput.addEventListener('input', () => {
    update();
    persist();
  });
  heightInput.addEventListener('input', () => {
    update();
    persist();
  });

  window.addEventListener('wall:measurements-saved', (e) => {
    const m = e.detail || {};
    if (typeof m.width === 'number') widthInput.value = (m.width / 100).toFixed(2);
    if (typeof m.height === 'number') heightInput.value = (m.height / 100).toFixed(2);
    update();
  });

  function update() {
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const area = width * height;
    const price = area * pricePerSqM;

    priceEl.textContent = currencyFormatter.format(price);
    propWidth.value = `${width.toFixed(2)}m`;
    propHeight.value = `${height.toFixed(2)}m`;
    propArea.value = `${area.toFixed(2)}m²`;
    propSku.value = `CW-${width.toFixed(2)}x${height.toFixed(2)}`;

    if (qtyInput) {
      qtyInput.value = Math.max(1, Math.round(area * 100));
    }
  }

  function persist() {
    const width = parseFloat(widthInput.value);
    const height = parseFloat(heightInput.value);
    const m =
      load() || { v: 1, unit: 'cm', width: null, height: null, slopes: 'none', cutouts: [], oversize_cm: 0, notes: '' };
    m.width = Number.isFinite(width) ? width * 100 : null;
    m.height = Number.isFinite(height) ? height * 100 : null;
    save(m);
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function save(m) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(m))}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('wall:measurements-saved', { detail: m }));
    } catch (e) {}
  }
})();

