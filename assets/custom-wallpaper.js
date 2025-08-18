(function () {
  const pricePerSqM = 24.9;
  const widthInput = document.querySelector('[data-wallpaper-width]');
  const heightInput = document.querySelector('[data-wallpaper-height]');
  const priceEl = document.querySelector('[data-wallpaper-price]');
  const propWidth = document.querySelector('[data-wallpaper-prop-width]');
  const propHeight = document.querySelector('[data-wallpaper-prop-height]');
  const propArea = document.querySelector('[data-wallpaper-prop-area]');
  const propSku = document.querySelector('[data-wallpaper-prop-sku]');
  const qtyInput = document.querySelector('[data-wallpaper-quantity]');

  function update() {
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const area = width * height;
    const price = area * pricePerSqM;
    priceEl.textContent = Shopify.formatMoney(price * 100);
    propWidth.value = `${width.toFixed(2)}m`;
    propHeight.value = `${height.toFixed(2)}m`;
    propArea.value = `${area.toFixed(2)}m²`;
    propSku.value = `CW-${width.toFixed(2)}x${height.toFixed(2)}`;
    if (qtyInput) {
      qtyInput.value = Math.max(1, Math.round(area * 100));
    }
  }

  widthInput.addEventListener('input', update);
  heightInput.addEventListener('input', update);
  update();
})();
