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
  const formEl = document.getElementById('wallpaper-form');
  const baseSku = (formEl?.dataset.productSku || '').slice(0, 7);

  const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  });

  // Prefill from persisted measurements
  const persisted = load();
  if (persisted) {
    if (typeof persisted.width === 'number') widthInput.value = persisted.width;
    if (typeof persisted.height === 'number') heightInput.value = persisted.height;
  }

  if (!widthInput.value) widthInput.value = 100;
  if (!heightInput.value) heightInput.value = 100;

  roundAndValidate('width');
  roundAndValidate('height');
  update();
  persist();

  let wTimer;
  let hTimer;
  widthInput.addEventListener('input', () => {
    clearTimeout(wTimer);
    update();
    persist();
    wTimer = setTimeout(() => {
      roundAndValidate('width');
      update();
      persist();
    }, 2000);
  });
  heightInput.addEventListener('input', () => {
    clearTimeout(hTimer);
    update();
    persist();
    hTimer = setTimeout(() => {
      roundAndValidate('height');
      update();
      persist();
    }, 2000);
  });
  widthInput.addEventListener('blur', () => {
    roundAndValidate('width');
    update();
    persist();
  });
  heightInput.addEventListener('blur', () => {
    roundAndValidate('height');
    update();
    persist();
  });

  window.addEventListener('wall:measurements-saved', (e) => {
    const m = e.detail || {};
    if (typeof m.width === 'number') widthInput.value = m.width;
    if (typeof m.height === 'number') heightInput.value = m.height;
    roundAndValidate('width');
    roundAndValidate('height');
    update();
  });

  function update() {
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const area = (width * height) / 10000;
    const price = area * pricePerSqM;

    priceEl.textContent = currencyFormatter.format(price);
    propWidth.value = `${width}cm`;
    propHeight.value = `${height}cm`;
    propArea.value = `${area.toFixed(2)}m²`;
    const widthCm = Math.round(width);
    const heightCm = Math.round(height);
    propSku.value = `${baseSku}_${heightCm}_${widthCm}`;

    if (qtyInput) {
      qtyInput.value = Math.max(1, Math.round(area * 100));
    }
  }

  function persist() {
    const width = parseFloat(widthInput.value);
    const height = parseFloat(heightInput.value);
    const m =
      load() || { v: 1, unit: 'cm', width: null, height: null, slopes: 'none', cutouts: [], oversize_cm: 0, notes: '' };
    m.width = Number.isFinite(width) ? width : null;
    m.height = Number.isFinite(height) ? height : null;
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

  function roundAndValidate(kind) {
    const input = kind === 'width' ? widthInput : heightInput;
    const info = document.querySelector(kind === 'width' ? '[data-info-width]' : '[data-info-height]');
    const min = 100;
    const max = kind === 'width' ? 700 : 400;
    const label = kind === 'width' ? 'Breite' : 'Höhe';
    let v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    const rounded = Math.ceil(v / 10) * 10;
    if (rounded !== v) {
      input.value = rounded;
      info.textContent = `Wir haben auf ${rounded} cm aufgerundet, damit du beim Tapezieren Beschnittzugabe hast.`;
    } else {
      info.textContent = `Wir empfehlen auf ${rounded + 10} cm aufzurunden, um Beschnittzugabe zu haben.`;
    }
    info.hidden = false;
    if (rounded < min || rounded > max) {
      info.innerHTML = `Die ${label} muss zwischen ${min} und ${max} cm liegen. Kontaktiere uns gern für Sonderlösungen: <a href="https://unik-nordic.com/pages/kontakt" target="_blank">Kontakt</a>`;
      input.setCustomValidity('invalid');
      input.reportValidity();
    } else {
      input.setCustomValidity('');
    }
  }
})();

