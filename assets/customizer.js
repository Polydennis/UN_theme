(function(){
  const stageWrap = document.getElementById('unik-stage-wrap');
  if(!stageWrap) return;

  const widthInput = document.getElementById('unik-width');
  const heightInput = document.getElementById('unik-height');
  const stripInput = document.getElementById('unik-strip');
  const dpiStatus = document.getElementById('unik-dpi-status');
  const saveBtn = document.getElementById('unik-save-config');
  const atcBtn = document.getElementById('unik-atc');

  const pxPerInch = 150; // Ziel-DPI
  const cmToInch = (cm)=> cm/2.54;

  // Stage aspekt-ratio = Wandmaß; wir rendern responsive
  let stageW = stageWrap.clientWidth;
  let stageH = stageWrap.clientHeight;

  const stage = new Konva.Stage({ container:'unik-stage-wrap', width: stageW, height: stageH });
  const layer = new Konva.Layer();
  stage.add(layer);

  const group = new Konva.Group({ draggable: true });
  layer.add(group);

  const imgObj = new Image();
  imgObj.crossOrigin = 'anonymous';
  imgObj.onload = () => {
    const kImg = new Konva.Image({ image: imgObj });
    group.add(kImg);

    // Start: Bild so skalieren, dass es komplett sichtbar ist
    const scaleX = stageW / imgObj.width;
    const scaleY = stageH / imgObj.height;
    const scale = Math.max(scaleX, scaleY); // cover
    group.scale({ x: scale, y: scale });
    group.position({ x: (stageW - imgObj.width * scale)/2, y: (stageH - imgObj.height * scale)/2 });
    layer.draw();
    updateDPI();
  };
  imgObj.src = window.UNIK_PRODUCT.preview;

  // Zoom mit Wheel/Pinch
  stage.on('wheel', (e)=>{
    e.evt.preventDefault();
    const oldScale = group.scaleX();
    const pointer = stage.getPointerPosition();
    const scaleBy = 1.04;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const mousePointTo = {
      x: (pointer.x - group.x()) / oldScale,
      y: (pointer.y - group.y()) / oldScale,
    };

    group.scale({ x: newScale, y: newScale });
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    group.position(newPos);
    layer.batchDraw();
    updateDPI();
  });

  function updateDPI(){
    const wallWcm = parseFloat(widthInput.value || '0');
    const wallHcm = parseFloat(heightInput.value || '0');
    if(!imgObj.width || !wallWcm || !wallHcm) return;

    // Sichtbarer Bildbereich in Originalpixeln (approx über inverse Transform)
    const scale = group.scaleX();
    const visibleWidthPx = stageW / scale; // wie viele Originalpixel füllen die Stage-Breite
    const wallWidthIn = cmToInch(wallWcm);
    const effDPI = visibleWidthPx / wallWidthIn;

    let status = `DPI: ${effDPI.toFixed(0)}`;
    if(effDPI >= 150) {
      dpiStatus.style.color = '#1a7f37';
    } else if (effDPI >= 120) {
      dpiStatus.style.color = '#b26a00';
      status += ' (grenzwertig)';
    } else {
      dpiStatus.style.color = '#b00020';
      status += ' (zu niedrig)';
    }
    dpiStatus.textContent = status;
  }

  // Speichern → App-Proxy /apps/customizer/save
  saveBtn.addEventListener('click', async()=>{
    const wallWcm = parseFloat(widthInput.value || '0');
    const wallHcm = parseFloat(heightInput.value || '0');
    const stripWcm = parseFloat(stripInput.value || '50');
    if(!wallWcm || !wallHcm) { alert('Bitte Breite und Höhe angeben'); return; }

    // Transform in Originalkoordinaten
    const scale = group.scaleX();
    const offsetX = -group.x()/scale;
    const offsetY = -group.y()/scale;
    const viewW = stageW/scale;
    const viewH = stageH/scale;

    // Vorschaubild als DataURL (klein)
    const dataUrl = stage.toDataURL({ pixelRatio: 1 });

    const payload = {
      productId: UNIK_PRODUCT.id,
      handle: UNIK_PRODUCT.handle,
      previewUrl: UNIK_PRODUCT.preview,
      wall: { width_cm: wallWcm, height_cm: wallHcm },
      strips: { width_cm: stripWcm, overlap_mm: 0 },
      viewbox: { x: Math.max(0, offsetX), y: Math.max(0, offsetY), width: viewW, height: viewH, scale },
      proof: { png_data_url: dataUrl },
      meta: { title: UNIK_PRODUCT.title }
    };

    const res = await fetch('/apps/customizer/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(!res.ok){ alert('Speichern fehlgeschlagen'); return; }
    const { configId, configUrl } = await res.json();
    document.getElementById('unik-configId').value = configId;
    document.getElementById('unik-configUrl').value = configUrl;
    document.getElementById('unik-prop-width').value = `${payload.wall.width_cm} cm`;
    document.getElementById('unik-prop-height').value = `${payload.wall.height_cm} cm`;
    document.getElementById('unik-prop-strip').value = `${payload.strips.width_cm} cm`;
    atcBtn.disabled = false;
  });

  window.addEventListener('resize', ()=>{
    stageW = stageWrap.clientWidth;
    stageH = stageWrap.clientHeight;
    stage.size({ width: stageW, height: stageH });
    updateDPI();
  });
})();