(function () {
  // Base price in EUR per square centimetre (24.9 € / m²)
  const pricePerSqCm = 24.9 / 10000;
  const widthInput = document.querySelector('[data-wallpaper-width]');
  const heightInput = document.querySelector('[data-wallpaper-height]');
  const priceEl = document.querySelector('[data-wallpaper-price]');
  const propWidth = document.querySelector('[data-wallpaper-prop-width]');
  const propHeight = document.querySelector('[data-wallpaper-prop-height]');
  const propArea = document.querySelector('[data-wallpaper-prop-area]');
  const propSku = document.querySelector('[data-wallpaper-prop-sku]');
  const qtyInput = document.querySelector('[data-wallpaper-quantity]');
  const baseSkuInput = document.querySelector('[data-wallpaper-base-sku]');

  const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  });

  function update() {
    const widthCm = parseFloat(widthInput.value) || 0;
    const heightCm = parseFloat(heightInput.value) || 0;
    const areaCm = widthCm * heightCm;
    const areaM = areaCm / 10000;
    const price = areaCm * pricePerSqCm;

    priceEl.textContent = currencyFormatter.format(price);
    propWidth.value = `${widthCm.toFixed(0)}cm`;
    propHeight.value = `${heightCm.toFixed(0)}cm`;
    propArea.value = `${areaM.toFixed(2)}m²`;
    const baseSkuPrefix = (baseSkuInput?.value || '').substring(0, 7);
    propSku.value = `${baseSkuPrefix}_${heightCm.toFixed(0)}_${widthCm.toFixed(0)}`;

    if (qtyInput) {
      // Shopify only accepts integer quantities; send square centimetres
      qtyInput.value = Math.max(1, Math.round(areaCm));
    }
  }

  widthInput.addEventListener('input', update);
  heightInput.addEventListener('input', update);
  update();
})();
