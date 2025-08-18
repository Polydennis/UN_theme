(function () {
  const pricePerSqM = 24.9;
  const widthInput = document.querySelector('[data-wallpaper-width]');
  const heightInput = document.querySelector('[data-wallpaper-height]');
  const priceEl = document.querySelector('[data-wallpaper-price]');
  const propWidth = document.querySelector('[data-wallpaper-prop-width]');
  const propHeight = document.querySelector('[data-wallpaper-prop-height]');
  const propArea = document.querySelector('[data-wallpaper-prop-area]');
  const propSku = document.querySelector('[data-wallpaper-prop-sku]');

  function update() {
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const area = width * height;
    const price = area * pricePerSqM;
    priceEl.textContent = Shopify.formatMoney(price * 100);
    propWidth.value = width.toFixed(2);
    propHeight.value = height.toFixed(2);
    propArea.value = area.toFixed(2);
    propSku.value = `CW-${width}x${height}`;
  }

  widthInput.addEventListener('input', update);
  heightInput.addEventListener('input', update);
  update();
})();
