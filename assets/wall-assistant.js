/* assets/wall-assistant.js
   Dynamische Skizze, Bemaßung & Verhältnis – unterstützt mehrere Sections pro Seite
*/
(() => {
  const STORAGE_KEY = 'wall.measurements.v1';
  const COOKIE_NAME = 'wall_measurements';
  const BOX = { x: 40, y: 40, w: 320, h: 200 }; // Zeichenfläche für das Rechteck

  const roots = document.querySelectorAll('[data-section-type="wall-assistant"]');
  if (!roots.length) return;

  roots.forEach(initSection);

  function initSection(root) {
    const enableSlopes = String(root.dataset.enableSlopes) === 'true';
    const returnUrl = root.dataset.returnUrl;

    // Elements
    const sketch = qs(root, '[data-el="sketch"]');
    const R = qs(root, '[data-el="rect-stroke"]');
    const F = qs(root, '[data-el="rect-fill"]');
    const HLW = qs(root, '[data-el="hl-width"]');
    const HLH = qs(root, '[data-el="hl-height"]');
    const SL = qs(root, '[data-el="slope-left"]');
    const SR = qs(root, '[data-el="slope-right"]');
    const DW = qs(root, '[data-el="dim-w"]');
    const DWT = qs(root, '[data-el="dim-w-text"]');
    const DH = qs(root, '[data-el="dim-h"]');
    const DHT = qs(root, '[data-el="dim-h-text"]');
    const wIn = qs(root, '[data-el="input-width"]');
    const hIn = qs(root, '[data-el="input-height"]');
    const summaryList = qs(root, '[data-el="summary-list"]');
    const saveBtn = qs(root, '[data-el="save-and-go"]');

    let steps = ['intro'];
    if (enableSlopes) steps.push('slopes');
    steps = steps.concat(['width', 'height', 'summary']);

    let state = load() || {
      v: 1,
      unit: 'cm',
      width: null,
      height: null,
      slopes: 'none',
      cutouts: [],
      oversize_cm: 0,
      notes: '',
    };

    // Navigation via Buttons
    root.addEventListener('click', (e) => {
      const next = e.target.matches('[data-next]');
      const prev = e.target.matches('[data-prev]');
      if (!next && !prev) return;

      const cur = currentStep();
      if (cur === 'slopes' && next) state.slopes = getRadio(root, 'slopes');

      const idx = steps.indexOf(cur);
      const to = steps[idx + (next ? 1 : -1)];
      if (to) {
        showStep(root, to, steps);
        highlightForStep(to);
      }
      if (to === 'summary') renderSummary();
    });

    // Live Inputs
    wIn &&
      wIn.addEventListener('input', () => {
        state.width = getNumber(wIn);
        updateSketchGeometry();
        showDimensions('width');
        save(state);
      });
    hIn &&
      hIn.addEventListener('input', () => {
        state.height = getNumber(hIn);
        updateSketchGeometry();
        showDimensions('height');
        save(state);
      });
    root.querySelectorAll('input[name="slopes"]').forEach((r) =>
      r.addEventListener('change', () => {
        state.slopes = getRadio(root, 'slopes');
        updateSlopes();
        save(state);
      })
    );

    // Save & redirect
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!validate()) {
          alert('Bitte sinnvolle Zahlen für Breite und Höhe eingeben.');
          return;
        }
        save(state);
        if (returnUrl) location.href = returnUrl;
      });
    }

    // Helpers (scoped)
    function currentStep() {
      const node = Array.from(root.querySelectorAll('.assistant')).find((n) => !n.hasAttribute('hidden'));
      return node ? node.getAttribute('data-step') : steps[0];
    }

    function highlightForStep(step) {
      if (!sketch) return;
      sketch.setAttribute('data-highlight', step === 'width' ? 'width' : step === 'height' ? 'height' : 'intro');
      showDimensions(step);
      updateSlopes();
    }

    function updateSlopes() {
      if (!enableSlopes) {
        SL && SL.classList.add('ghost');
        SR && SR.classList.add('ghost');
        return;
      }
      const mode = state.slopes || 'none';
      toggleSlope(SL, mode === 'left' || mode === 'both');
      toggleSlope(SR, mode === 'right' || mode === 'both');
    }
    function toggleSlope(el, active) {
      if (!el) return;
      el.classList.toggle('active', !!active);
      el.classList.toggle('ghost', !active);
    }

    function showDimensions(activeStep) {
      const hasW = isPos(state.width);
      const hasH = isPos(state.height);

      if (DWT && hasW) DWT.textContent = `${fmt(state.width)} cm`;
      if (DHT && hasH) DHT.textContent = `${fmt(state.height)} cm`;

      toggleShow(DW, hasW);
      toggleShow(DWT, hasW);
      toggleShow(DH, hasH);
      toggleShow(DHT, hasH);

      DW && DW.classList.toggle('active', activeStep === 'width');
      DWT && DWT.classList.toggle('muted', activeStep !== 'width');
      DH && DH.classList.toggle('active', activeStep === 'height');
      DHT && DHT.classList.toggle('muted', activeStep !== 'height');
    }

    function updateSketchGeometry() {
      // Aspect-fit innerhalb BOX basierend auf Breite/Höhe
      let rx = BOX.x,
        ry = BOX.y,
        rw = BOX.w,
        rh = BOX.h;
      if (isPos(state.width) && isPos(state.height)) {
        const ar = state.width / state.height;
        const boxAR = BOX.w / BOX.h;
        if (ar >= boxAR) {
          rw = BOX.w;
          rh = BOX.w / ar;
        } else {
          rh = BOX.h;
          rw = BOX.h * ar;
        }
        rx = BOX.x + (BOX.w - rw) / 2;
        ry = BOX.y + (BOX.h - rh) / 2;
      }
      setRect(R, rx, ry, rw, rh);
      setRect(F, rx, ry, rw, rh);

      // Highlights (Bottom/Left) an die Kanten binden
      setLine(HLW, rx, ry + rh, rx + rw, ry + rh);
      setLine(HLH, rx, ry, rx, ry + rh);

      // Maße platzieren
      setLine(DW, rx, ry + rh + 12, rx + rw, ry + rh + 12);
      DWT && (DWT.setAttribute('x', rx + rw / 2), DWT.setAttribute('y', ry + rh + 26));

      setLine(DH, rx - 12, ry, rx - 12, ry + rh);
      if (DHT) {
        const cx = rx - 24,
          cy = ry + rh / 2;
        DHT.setAttribute('x', cx);
        DHT.setAttribute('y', cy);
        DHT.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
      }

      // Schrägen an Ecken binden (20% der kleineren Kante)
      const L = Math.max(18, Math.min(rw, rh) * 0.22);
      setPolyline(SL, `${rx},${ry + L} ${rx + L},${ry}`);
      setPolyline(SR, `${rx + rw - L},${ry} ${rx + rw},${ry + L}`);
    }

    function renderSummary() {
      const m2 = isPos(state.width) && isPos(state.height) ? (state.width / 100) * (state.height / 100) : 0;
      if (!summaryList) return;
      const slopeLabel =
        { none: 'Nein', left: 'Ja, links', right: 'Ja, rechts', both: 'Ja, beidseitig' }[state.slopes] || '–';
      summaryList.innerHTML = `
        <li><strong>Breite:</strong> ${state.width ?? '–'} cm</li>
        <li><strong>Höhe:</strong> ${state.height ?? '–'} cm</li>
        <li><strong>Dachschrägen:</strong> ${slopeLabel}</li>
        <li><strong>Fläche (vereinfacht):</strong> ${m2.toFixed(2)} m²</li>`;
    }

    // Init with persisted values
    const loaded = load();
    if (loaded?.width) wIn && (wIn.value = String(loaded.width).replace('.', ','));
    if (loaded?.height) hIn && (hIn.value = String(loaded.height).replace('.', ','));
    if (loaded?.slopes) {
      const r = root.querySelector(`input[name="slopes"][value="${loaded.slopes}"]`);
      if (r) r.checked = true;
      state.slopes = loaded.slopes;
    }
    state.width = getNumber(wIn);
    state.height = getNumber(hIn);

    showStep(root, 'intro', steps);
    highlightForStep('intro');
    updateSketchGeometry();
    showDimensions();

    // Utilities
    function showStep(rootEl, name, order) {
      order.forEach((s) => {
        const n = rootEl.querySelector(`.assistant[data-step="${s}"]`);
        if (n) n.hidden = s !== name;
      });
    }
    function qs(scope, sel) {
      return scope.querySelector(sel);
    }
    function getNumber(inputEl) {
      if (!inputEl) return null;
      const v = (inputEl.value || '').replace(',', '.');
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    function getRadio(scope, name) {
      const r = scope.querySelector(`input[name="${name}"]:checked`);
      return r ? r.value : null;
    }
    function isPos(n) {
      return Number.isFinite(n) && n > 0;
    }
    function fmt(n) {
      return (Math.round(n * 10) / 10).toString().replace('.', ',');
    }
    function toggleShow(node, on) {
      node && node.classList.toggle('show', !!on);
    }

    function setRect(node, x, y, w, h) {
      if (!node) return;
      node.setAttribute('x', x);
      node.setAttribute('y', y);
      node.setAttribute('width', w);
      node.setAttribute('height', h);
    }
    function setLine(node, x1, y1, x2, y2) {
      if (!node) return;
      node.setAttribute('x1', x1);
      node.setAttribute('y1', y1);
      node.setAttribute('x2', x2);
      node.setAttribute('y2', y2);
    }
    function setPolyline(node, points) {
      node && node.setAttribute('points', points);
    }

    function save(m) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
          JSON.stringify(m)
        )}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent('wall:measurements-saved', { detail: m }));
      } catch (e) {}
    }
    function load() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }
  }
})();
