/* assets/wall-assistant.js
   Dynamische Skizze, Bemaßung & Verhältnis – unterstützt mehrere Sections pro Seite
*/
(() => {
  const STORAGE_KEY = 'wall.measurements.v1';
  const COOKIE_NAME = 'wall_measurements';
  const BOX = { x: 40, y: 40, w: 320, h: 200 }; // Zeichenfläche für das Rechteck
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 700;
  const MIN_HEIGHT = 100;
  const MAX_HEIGHT = 400;

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
    const SLH = qs(root, '[data-el="sl-left-peak"]');
    const SLO = qs(root, '[data-el="sl-left-offset"]');
    const SLS = qs(root, '[data-el="sl-left-start"]');
    const SRH = qs(root, '[data-el="sl-right-peak"]');
    const SRO = qs(root, '[data-el="sl-right-offset"]');
    const SRS = qs(root, '[data-el="sl-right-start"]');
    const wIn = qs(root, '[data-el="input-width"]');
    const hIn = qs(root, '[data-el="input-height"]');
    const lpIn = qs(root, '[data-el="input-left-peak"]');
    const loIn = qs(root, '[data-el="input-left-offset"]');
    const lsIn = qs(root, '[data-el="input-left-start"]');
    const rpIn = qs(root, '[data-el="input-right-peak"]');
    const roIn = qs(root, '[data-el="input-right-offset"]');
    const rsIn = qs(root, '[data-el="input-right-start"]');
    const summaryList = qs(root, '[data-el="summary-list"]');
    const saveBtn = qs(root, '[data-el="save-and-go"]');

    let steps = ['intro'];
    if (enableSlopes) steps.push('slopes');
    steps = steps.concat([
      'width',
      'height',
      'slope-left-peak',
      'slope-left-offset',
      'slope-left-start',
      'slope-right-peak',
      'slope-right-offset',
      'slope-right-start',
      'summary',
    ]);

    let state = load() || {
      v: 1,
      unit: 'cm',
      width: null,
      height: null,
      slopes: 'none',
      cutouts: [],
      oversize_cm: 0,
      notes: '',
      slopeLeft: { peak: null, offset: null, start: null },
      slopeRight: { peak: null, offset: null, start: null },
    };

    // Navigation via Buttons
    root.addEventListener('click', (e) => {
      const next = e.target.matches('[data-next]');
      const prev = e.target.matches('[data-prev]');
      if (!next && !prev) return;

      const cur = currentStep();
      if (next) {
        if (cur === 'width' && !validateDim('width')) return;
        if (cur === 'height' && !validateDim('height')) return;
        if (cur === 'slopes') state.slopes = getRadio(root, 'slopes');
      }

      let idx = steps.indexOf(cur);
      let to;
      do {
        idx += next ? 1 : -1;
        to = steps[idx];
      } while (to && !stepApplicable(to));
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
    lpIn &&
      lpIn.addEventListener('input', () => {
        state.slopeLeft.peak = getNumber(lpIn);
        updateSketchGeometry();
      });
    loIn &&
      loIn.addEventListener('input', () => {
        state.slopeLeft.offset = getNumber(loIn);
        updateSketchGeometry();
      });
    lsIn &&
      lsIn.addEventListener('input', () => {
        state.slopeLeft.start = getNumber(lsIn);
        updateSketchGeometry();
      });
    rpIn &&
      rpIn.addEventListener('input', () => {
        state.slopeRight.peak = getNumber(rpIn);
        updateSketchGeometry();
      });
    roIn &&
      roIn.addEventListener('input', () => {
        state.slopeRight.offset = getNumber(roIn);
        updateSketchGeometry();
      });
    rsIn &&
      rsIn.addEventListener('input', () => {
        state.slopeRight.start = getNumber(rsIn);
        updateSketchGeometry();
      });

    // Save & redirect
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!validateDim('width') || !validateDim('height')) return;
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
      let hl = 'intro';
      if (step === 'width') hl = 'width';
      else if (step === 'height') hl = 'height';
      else if (step.startsWith('slope-left')) hl = 'slope-left';
      else if (step.startsWith('slope-right')) hl = 'slope-right';
      sketch.setAttribute('data-highlight', hl);
      showDimensions(step);
      updateSlopes();
      updateSlopeGuides();
    }

    function stepApplicable(name) {
      if (name === 'slopes') return enableSlopes;
      if (name.startsWith('slope-left')) return state.slopes === 'left' || state.slopes === 'both';
      if (name.startsWith('slope-right')) return state.slopes === 'right' || state.slopes === 'both';
      return true;
    }

    function updateSlopeGuides() {
      const step = currentStep();
      toggleShow(SLH, step === 'slope-left-peak');
      toggleShow(SLO, step === 'slope-left-offset');
      toggleShow(SLS, step === 'slope-left-start');
      toggleShow(SRH, step === 'slope-right-peak');
      toggleShow(SRO, step === 'slope-right-offset');
      toggleShow(SRS, step === 'slope-right-start');
    }

    function updateSlopes() {
      const step = currentStep();
      const mode = enableSlopes ? state.slopes || 'none' : 'none';
      const showGhosts = enableSlopes && step === 'slopes';
      toggleSlope(SL, mode === 'left' || mode === 'both', showGhosts);
      toggleSlope(SR, mode === 'right' || mode === 'both', showGhosts);
    }
    function toggleSlope(el, active, showGhosts) {
      if (!el) return;
      el.classList.toggle('active', !!active);
      el.classList.toggle('ghost', !active && showGhosts);
      if (active || (!active && showGhosts)) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
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

      const scale = isPos(state.width) ? rw / state.width : 1;

      // Linke Schräge
      if (SL) {
        if (state.slopes === 'left' || state.slopes === 'both') {
          const peak = isPos(state.slopeLeft.peak) ? state.slopeLeft.peak : state.height || 0;
          const offset = isPos(state.slopeLeft.offset) ? state.slopeLeft.offset : state.width * 0.2;
          const start = isPos(state.slopeLeft.start) ? state.slopeLeft.start : state.height * 0.6;
          const xPeak = rx + rw - offset * scale;
          const yPeak = ry + rh - peak * scale;
          const xStart = rx;
          const yStart = ry + rh - start * scale;
          setPolyline(SL, `${xStart},${yStart} ${xPeak},${yPeak}`);
          setLine(SLH, xPeak, yPeak, xPeak, ry + rh);
          setLine(SLO, xPeak, yPeak, rx + rw, yPeak);
          setLine(SLS, rx, yStart, rx, ry + rh);
        } else {
          const L = Math.max(18, Math.min(rw, rh) * 0.22);
          setPolyline(SL, `${rx},${ry + L} ${rx + L},${ry}`);
        }
      }

      // Rechte Schräge
      if (SR) {
        if (state.slopes === 'right' || state.slopes === 'both') {
          const peak = isPos(state.slopeRight.peak) ? state.slopeRight.peak : state.height || 0;
          const offset = isPos(state.slopeRight.offset) ? state.slopeRight.offset : state.width * 0.2;
          const start = isPos(state.slopeRight.start) ? state.slopeRight.start : state.height * 0.6;
          const xPeak = rx + offset * scale;
          const yPeak = ry + rh - peak * scale;
          const xStart = rx + rw;
          const yStart = ry + rh - start * scale;
          setPolyline(SR, `${xPeak},${yPeak} ${xStart},${yStart}`);
          setLine(SRH, xPeak, yPeak, xPeak, ry + rh);
          setLine(SRO, rx, yPeak, xPeak, yPeak);
          setLine(SRS, rx + rw, yStart, rx + rw, ry + rh);
        } else {
          const L = Math.max(18, Math.min(rw, rh) * 0.22);
          setPolyline(SR, `${rx + rw - L},${ry} ${rx + rw},${ry + L}`);
        }
      }
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
        ${state.slopes === 'left' || state.slopes === 'both' ? `<li><strong>Linke Schräge:</strong> Höhe ${state.slopeLeft.peak ?? '–'} cm, Abstand ${state.slopeLeft.offset ?? '–'} cm, Beginn bei ${state.slopeLeft.start ?? '–'} cm</li>` : ''}
        ${state.slopes === 'right' || state.slopes === 'both' ? `<li><strong>Rechte Schräge:</strong> Höhe ${state.slopeRight.peak ?? '–'} cm, Abstand ${state.slopeRight.offset ?? '–'} cm, Beginn bei ${state.slopeRight.start ?? '–'} cm</li>` : ''}
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
    if (loaded?.slopeLeft) {
      lpIn && loaded.slopeLeft.peak && (lpIn.value = String(loaded.slopeLeft.peak).replace('.', ','));
      loIn && loaded.slopeLeft.offset && (loIn.value = String(loaded.slopeLeft.offset).replace('.', ','));
      lsIn && loaded.slopeLeft.start && (lsIn.value = String(loaded.slopeLeft.start).replace('.', ','));
      state.slopeLeft = { ...state.slopeLeft, ...loaded.slopeLeft };
    }
    if (loaded?.slopeRight) {
      rpIn && loaded.slopeRight.peak && (rpIn.value = String(loaded.slopeRight.peak).replace('.', ','));
      roIn && loaded.slopeRight.offset && (roIn.value = String(loaded.slopeRight.offset).replace('.', ','));
      rsIn && loaded.slopeRight.start && (rsIn.value = String(loaded.slopeRight.start).replace('.', ','));
      state.slopeRight = { ...state.slopeRight, ...loaded.slopeRight };
    }
    state.width = getNumber(wIn);
    state.height = getNumber(hIn);
    state.slopeLeft.peak = getNumber(lpIn);
    state.slopeLeft.offset = getNumber(loIn);
    state.slopeLeft.start = getNumber(lsIn);
    state.slopeRight.peak = getNumber(rpIn);
    state.slopeRight.offset = getNumber(roIn);
    state.slopeRight.start = getNumber(rsIn);

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

    function validateDim(kind) {
      const v = kind === 'width' ? state.width : state.height;
      const min = kind === 'width' ? MIN_WIDTH : MIN_HEIGHT;
      const max = kind === 'width' ? MAX_WIDTH : MAX_HEIGHT;
      if (!isPos(v)) {
        alert(`Bitte eine ${kind === 'width' ? 'Breite' : 'Höhe'} in Zentimetern eingeben.`);
        return false;
      }
      if (v < min || v > max) {
        alert(
          `Die ${kind === 'width' ? 'Breite' : 'Höhe'} muss zwischen ${min} und ${max} cm liegen.\nKontaktiere uns gern für Sonderlösungen: https://unik-nordic.com/pages/kontakt`
        );
        return false;
      }
      return true;
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
