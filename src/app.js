/**
 * Builder Island — Minimalist 3D Practice Playground Controller
 * Enforces single-action per step, relevant-only handles, and independent camera/model state.
 */

import {
  WORKPLANE,
  CAMERA_PRESETS,
  TOTAL_STEPS,
  getStepConfig,
  getBoxVertices,
  createStepState,
  evaluateStepMatch,
  updateBoxInState,
  setCameraInState,
  clamp
} from './model.js';

import { createStorageManager } from './storage.js';

const storageManager = createStorageManager({
  searchString: typeof window !== 'undefined' ? window.location.search : ''
});

let appState = storageManager.loadProgress();
let pointerSession = null;

const dom = {
  stepProgress: document.getElementById('step-progress'),
  stepInstruction: document.getElementById('step-instruction'),
  storageWarningBanner: document.getElementById('storage-warning-banner'),
  workspaceSvg: document.getElementById('workspace-3d'),
  targetMiniSvg: document.getElementById('target-mini-svg'),
  hintToast: document.getElementById('hint-toast'),
  btnPrev: document.getElementById('btn-prev'),
  btnReset: document.getElementById('btn-reset'),
  btnHint: document.getElementById('btn-hint'),
  btnNext: document.getElementById('btn-next'),
  btnOpenInfo: document.getElementById('btn-open-info'),
  btnCloseInfo: document.getElementById('btn-close-info'),
  modalInfo: document.getElementById('modal-info'),
  modalComplete: document.getElementById('modal-complete'),
  btnCloseComplete: document.getElementById('btn-close-complete'),
  btnChangeDesign: document.getElementById('btn-change-design'),
  btnReplayAll: document.getElementById('btn-replay-all'),
  viewBtns: Array.from(document.querySelectorAll('.cube-face-btn'))
};

/**
 * Projects a 3D point (wx, wy, wz) onto 2D SVG coordinates based on camera yaw & pitch.
 */
function projectPoint(wx, wy, wz, cam, cx = 500, cy = 340, scale = 5.6) {
  const dx = wx - WORKPLANE.width / 2;
  const dy = wy - WORKPLANE.depth / 2;
  const dz = wz;

  const yawRad = (cam.yaw * Math.PI) / 180;
  const pitchRad = (cam.pitch * Math.PI) / 180;

  const rx = dx * Math.cos(yawRad) - dy * Math.sin(yawRad);
  const ry = dx * Math.sin(yawRad) + dy * Math.cos(yawRad);

  const screenX = cx + rx * scale;
  const screenY = cy + ry * Math.sin(pitchRad) * scale - dz * Math.cos(pitchRad) * scale;
  const depth = ry * Math.cos(pitchRad) + dz * Math.sin(pitchRad);

  return { x: screenX, y: screenY, depth };
}

/**
 * Renders a 3D box (either solid interactive block or translucent target ghost outline)
 * using the exact shared `getBoxVertices(box)` coordinate basis from `src/model.js`.
 */
function buildBoxSvgFaces(box, cam, cx, cy, scale, styleOptions) {
  const { corners } = getBoxVertices(box);
  const pts = corners.map((c) => projectPoint(c.x, c.y, c.z, cam, cx, cy, scale));

  const faces = [
    { id: 'bottom', indices: [0, 1, 2, 3] },
    { id: 'back', indices: [0, 1, 5, 4] },
    { id: 'left', indices: [0, 3, 7, 4] },
    { id: 'right', indices: [1, 2, 6, 5] },
    { id: 'front', indices: [3, 2, 6, 7] },
    { id: 'top', indices: [4, 5, 6, 7] }
  ];

  faces.forEach((f) => {
    f.avgDepth = f.indices.reduce((sum, idx) => sum + pts[idx].depth, 0) / 4;
  });
  faces.sort((a, b) => a.avgDepth - b.avgDepth);

  return faces
    .map((f) => {
      const polyPoints = f.indices.map((i) => `${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`).join(' ');
      if (styleOptions.isTarget) {
        return `<polygon points="${polyPoints}" fill="${styleOptions.fill}" stroke="${styleOptions.stroke}" stroke-width="${styleOptions.strokeWidth}" stroke-dasharray="${styleOptions.dashArray || '6 4'}" />`;
      }
      const faceColor = styleOptions.faceColors?.[f.id] || styleOptions.fill;
      return `<polygon points="${polyPoints}" fill="${faceColor}" fill-opacity="${styleOptions.opacity ?? 0.94}" stroke="${styleOptions.stroke}" stroke-width="${styleOptions.strokeWidth}" stroke-linejoin="round" />`;
    })
    .join('');
}

/**
 * Renders only the handle relevant to the current step's `allowedAction` (or all handles in freePlay).
 */
function buildRelevantHandleMarkup(allowedAction, v, cam, cx, cy, scale, hintActive) {
  const hSize = 18;
  const pulseRing = (pt) =>
    `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="24" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="5 3" pointer-events="none" />`;

  const showAll = allowedAction === 'all';
  const parts = [];

  if (allowedAction === 'move' && hintActive) {
    const centerPt = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, (v.z0 + v.z1) / 2, cam, cx, cy, scale);
    parts.push(pulseRing(centerPt));
  }

  if (showAll || allowedAction === 'length') {
    const rightMid = projectPoint(v.x1, (v.y0 + v.y1) / 2, v.z0, cam, cx, cy, scale);
    parts.push(`
      ${hintActive && !showAll ? pulseRing(rightMid) : ''}
      <rect
        class="handle-node"
        data-action="length"
        x="${(rightMid.x - hSize / 2).toFixed(1)}"
        y="${(rightMid.y - hSize / 2).toFixed(1)}"
        width="${hSize}"
        height="${hSize}"
        rx="4"
        fill="#ffffff"
        stroke="#0f172a"
        stroke-width="3"
        style="cursor: ew-resize;"
      />
    `);
  }

  if (showAll || allowedAction === 'width') {
    const frontMid = projectPoint((v.x0 + v.x1) / 2, v.y1, v.z0, cam, cx, cy, scale);
    parts.push(`
      ${hintActive && !showAll ? pulseRing(frontMid) : ''}
      <rect
        class="handle-node"
        data-action="width"
        x="${(frontMid.x - hSize / 2).toFixed(1)}"
        y="${(frontMid.y - hSize / 2).toFixed(1)}"
        width="${hSize}"
        height="${hSize}"
        rx="4"
        fill="#ffffff"
        stroke="#0f172a"
        stroke-width="3"
        style="cursor: ns-resize;"
      />
    `);
  }

  if (showAll || allowedAction === 'height') {
    const topCenter = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1, cam, cx, cy, scale);
    parts.push(`
      ${hintActive && !showAll ? pulseRing(topCenter) : ''}
      <rect
        class="handle-node"
        data-action="height"
        x="${(topCenter.x - hSize / 2).toFixed(1)}"
        y="${(topCenter.y - hSize / 2).toFixed(1)}"
        width="${hSize}"
        height="${hSize}"
        rx="4"
        fill="#ffffff"
        stroke="#2563eb"
        stroke-width="3"
        style="cursor: ns-resize;"
      />
    `);
  }

  if (showAll || allowedAction === 'lift') {
    const topCenter = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1, cam, cx, cy, scale);
    const liftConePt = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1 + 12, cam, cx, cy, scale);
    parts.push(`
      ${hintActive && !showAll ? pulseRing(liftConePt) : ''}
      <line
        x1="${topCenter.x.toFixed(1)}"
        y1="${topCenter.y.toFixed(1)}"
        x2="${liftConePt.x.toFixed(1)}"
        y2="${liftConePt.y.toFixed(1)}"
        stroke="#0f172a"
        stroke-width="2.5"
        pointer-events="none"
      />
      <polygon
        class="handle-node"
        data-action="lift"
        points="${liftConePt.x.toFixed(1)},${(liftConePt.y - 14).toFixed(1)} ${(liftConePt.x - 11).toFixed(1)},${(liftConePt.y + 6).toFixed(1)} ${(liftConePt.x + 11).toFixed(1)},${(liftConePt.y + 6).toFixed(1)}"
        fill="#0f172a"
        stroke="#ffffff"
        stroke-width="2"
        style="cursor: ns-resize;"
      />
    `);
  }

  if (showAll || allowedAction === 'rotate') {
    const c2 = v.corners[2];
    const dirX = c2.x - v.cx;
    const dirY = c2.y - v.cy;
    const len = Math.hypot(dirX, dirY) || 1;
    const hx = c2.x + (dirX / len) * 12;
    const hy = c2.y + (dirY / len) * 12;
    const rotateHandlePt = projectPoint(hx, hy, v.z0, cam, cx, cy, scale);
    const centerPt = projectPoint(v.cx, v.cy, v.z0, cam, cx, cy, scale);
    parts.push(`
      <line
        x1="${centerPt.x.toFixed(1)}"
        y1="${centerPt.y.toFixed(1)}"
        x2="${rotateHandlePt.x.toFixed(1)}"
        y2="${rotateHandlePt.y.toFixed(1)}"
        stroke="#ca8a04"
        stroke-width="2"
        stroke-dasharray="4 4"
        pointer-events="none"
      />
      ${hintActive && !showAll ? pulseRing(rotateHandlePt) : ''}
      <g class="handle-node" data-action="rotate" transform="translate(${rotateHandlePt.x.toFixed(1)}, ${rotateHandlePt.y.toFixed(1)})" style="cursor: grab;">
        <circle r="24" fill="transparent" />
        <circle r="16" fill="#fef08a" stroke="#0f172a" stroke-width="2.5" />
        <text x="0" y="6" text-anchor="middle" font-size="17" font-weight="900" fill="#0f172a">↻</text>
      </g>
    `);
  }

  // View-only steps ('view-top', 'view-front') show NO handles on the box
  return parts.join('');
}

/**
 * Renders the main 3D interactive workspace SVG
 */
function renderMainWorkspace() {
  const cfg = getStepConfig(appState.currentStep);
  const cam = appState.camera;
  const match = evaluateStepMatch(appState);
  const cx = 500;
  const cy = 345;
  const scale = 5.6;

  // 1. Workplane floor grid
  const wpCorners = [
    projectPoint(0, 0, 0, cam, cx, cy, scale),
    projectPoint(WORKPLANE.width, 0, 0, cam, cx, cy, scale),
    projectPoint(WORKPLANE.width, WORKPLANE.depth, 0, cam, cx, cy, scale),
    projectPoint(0, WORKPLANE.depth, 0, cam, cx, cy, scale)
  ];
  const wpPoly = wpCorners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let gridLines = '';
  for (let x = 10; x < WORKPLANE.width; x += 10) {
    const p0 = projectPoint(x, 0, 0, cam, cx, cy, scale);
    const p1 = projectPoint(x, WORKPLANE.depth, 0, cam, cx, cy, scale);
    gridLines += `<line x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="#bae6fd" stroke-width="1" pointer-events="none" />`;
  }
  for (let y = 10; y < WORKPLANE.depth; y += 10) {
    const p0 = projectPoint(0, y, 0, cam, cx, cy, scale);
    const p1 = projectPoint(WORKPLANE.width, y, 0, cam, cx, cy, scale);
    gridLines += `<line x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="#bae6fd" stroke-width="1" pointer-events="none" />`;
  }

  const frontMid = projectPoint(WORKPLANE.width / 2, WORKPLANE.depth + 5, 0, cam, cx, cy, scale);

  // 2. Target Ghost Outline on the 3D Workplane (uses identical coordinate basis)
  const targetMarkup = buildBoxSvgFaces(cfg.target, cam, cx, cy, scale, {
    isTarget: true,
    fill: match.matched ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.12)',
    stroke: '#16a34a',
    strokeWidth: match.matched ? 3 : 2.4,
    dashArray: match.matched ? '' : '7 5'
  });

  // 3. Shadow on workplane when box is lifted (z > 0)
  const b = appState.box;
  const v = getBoxVertices(b);
  let shadowMarkup = '';
  if (b.z > 0) {
    const shadowPts = [
      projectPoint(v.x0, v.y0, 0, cam, cx, cy, scale),
      projectPoint(v.x1, v.y0, 0, cam, cx, cy, scale),
      projectPoint(v.x1, v.y1, 0, cam, cx, cy, scale),
      projectPoint(v.x0, v.y1, 0, cam, cx, cy, scale)
    ]
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    shadowMarkup = `<polygon points="${shadowPts}" fill="rgba(15, 23, 42, 0.16)" pointer-events="none" />`;
  }

  // 4. Interactive Student Box
  const faceColors = match.matched
    ? {
        top: '#4ade80',
        front: '#22c55e',
        right: '#16a34a',
        left: '#15803d',
        back: '#166534',
        bottom: '#14532d'
      }
    : {
        top: '#f87171',
        front: '#ef4444',
        right: '#dc2626',
        left: '#b91c1c',
        back: '#991b1b',
        bottom: '#7f1d1d'
      };

  const boxFacesMarkup = buildBoxSvgFaces(b, cam, cx, cy, scale, {
    isTarget: false,
    faceColors,
    stroke: match.matched ? '#14532d' : '#7f1d1d',
    strokeWidth: 2
  });

  // Only allow dragging the box body if this is a 'move' step or freePlay mode
  const effectiveAllowed = appState.freePlay ? 'all' : cfg.allowedAction;
  const boxDataAction =
    effectiveAllowed === 'move' || effectiveAllowed === 'all'
      ? 'data-action="move" style="cursor: move;"'
      : 'style="cursor: default;"';

  // 5. Relevant handle ONLY for current step (or all handles in freePlay)
  const handlesMarkup = buildRelevantHandleMarkup(
    effectiveAllowed,
    v,
    cam,
    cx,
    cy,
    scale,
    appState.hintActive
  );

  // Cute Little Bot mascot on the completed Step 8 Safe Robot Base (40 × 30 × 4 mm)
  let robotMascotMarkup = '';
  if (appState.currentStep === TOTAL_STEPS && match.matched && !appState.freePlay) {
    const botPt = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1, cam, cx, cy, scale);
    robotMascotMarkup = `
      <g id="little-bot-mascot" transform="translate(${botPt.x.toFixed(1)}, ${(botPt.y - 22).toFixed(1)})" pointer-events="none">
        <line x1="0" y1="-26" x2="0" y2="-16" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
        <circle cx="0" cy="-28" r="4" fill="#facc15" stroke="#ca8a04" stroke-width="1.5" />
        <rect x="-16" y="-16" width="32" height="24" rx="6" fill="#38bdf8" stroke="#0284c7" stroke-width="2.5" />
        <circle cx="-6" cy="-5" r="3.5" fill="#0f172a" />
        <circle cx="6" cy="-5" r="3.5" fill="#0f172a" />
      </g>
    `;
  }

  // Success "Nice!" badge above the matched block
  let niceBadgeMarkup = '';
  if (match.matched && !appState.freePlay) {
    const badgeZ = appState.currentStep === TOTAL_STEPS ? v.z1 + 26 : v.z1 + 16;
    const badgePt = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, badgeZ, cam, cx, cy, scale);
    niceBadgeMarkup = `
      <g id="nice-badge" transform="translate(${badgePt.x.toFixed(1)}, ${badgePt.y.toFixed(1)})" pointer-events="none">
        <rect x="-42" y="-18" width="84" height="32" rx="16" fill="#16a34a" stroke="#ffffff" stroke-width="2.5" />
        <text x="0" y="4" text-anchor="middle" font-size="16" font-weight="900" fill="#ffffff">Nice!</text>
      </g>
    `;
  }

  dom.workspaceSvg.innerHTML = `
    <rect id="orbit-bg" x="0" y="0" width="1000" height="620" fill="transparent" style="cursor: grab;" />
    <polygon points="${wpPoly}" fill="#f0f9ff" stroke="#0284c7" stroke-width="3" stroke-linejoin="round" pointer-events="none" />
    ${gridLines}
    <text x="${frontMid.x.toFixed(1)}" y="${(frontMid.y + 16).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#0284c7" pointer-events="none">
      WORKPLANE
    </text>

    <g id="target-ghost-group" pointer-events="none">
      ${targetMarkup}
    </g>

    ${shadowMarkup}

    <g id="student-box-group" ${boxDataAction}>
      ${boxFacesMarkup}
    </g>

    ${robotMascotMarkup}
    ${handlesMarkup}
    ${niceBadgeMarkup}
  `;
}

/**
 * Renders the small corner Target schematic thumbnail (#target-mini-svg)
 */
function renderTargetMiniPreview() {
  const cfg = getStepConfig(appState.currentStep);
  const miniCam = cfg.requiredFace ? CAMERA_PRESETS[cfg.requiredFace] : CAMERA_PRESETS.ISO;
  const cx = 70;
  const cy = 62;
  const scale = 1.05;

  const wpCorners = [
    projectPoint(0, 0, 0, miniCam, cx, cy, scale),
    projectPoint(WORKPLANE.width, 0, 0, miniCam, cx, cy, scale),
    projectPoint(WORKPLANE.width, WORKPLANE.depth, 0, miniCam, cx, cy, scale),
    projectPoint(0, WORKPLANE.depth, 0, miniCam, cx, cy, scale)
  ]
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const targetBoxSvg = buildBoxSvgFaces(cfg.target, miniCam, cx, cy, scale, {
    isTarget: false,
    faceColors: {
      top: '#4ade80',
      front: '#22c55e',
      right: '#16a34a',
      left: '#15803d',
      back: '#166534',
      bottom: '#14532d'
    },
    stroke: '#14532d',
    strokeWidth: 1.2
  });

  dom.targetMiniSvg.innerHTML = `
    <polygon points="${wpCorners}" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.2" />
    ${targetBoxSvg}
  `;
}

/**
 * Synchronizes top bar, ViewCube buttons, 3D canvas, mini target preview, and Next button
 */
function renderAll() {
  const cfg = getStepConfig(appState.currentStep);
  const match = evaluateStepMatch(appState);

  dom.stepProgress.textContent = `${appState.currentStep} / ${TOTAL_STEPS}`;
  if (appState.freePlay) {
    dom.stepInstruction.textContent = 'Free build! Try any handle.';
  } else {
    dom.stepInstruction.textContent = match.matched ? 'Nice!' : cfg.instruction;
  }

  if (!storageManager.isStorageAvailable) {
    dom.storageWarningBanner.classList.remove('hidden');
  } else {
    dom.storageWarningBanner.classList.add('hidden');
  }

  // Highlight relevant ViewCube button on view steps ('view-top', 'view-front')
  dom.viewBtns.forEach((btn) => {
    const viewKey = btn.dataset.view;
    const preset = CAMERA_PRESETS[viewKey];
    btn.classList.toggle('active', appState.camera.face === preset.face);

    const isTargetViewBtn =
      (cfg.allowedAction === 'view-top' && viewKey === 'TOP') ||
      (cfg.allowedAction === 'view-front' && viewKey === 'FRONT');
    btn.classList.toggle('hint-pulse', Boolean(!match.matched && isTargetViewBtn));
  });

  // Hint toast
  if (appState.hintActive && !match.matched) {
    dom.hintToast.textContent = cfg.hintText;
    dom.hintToast.classList.remove('hidden');
  } else {
    dom.hintToast.classList.add('hidden');
  }

  // Back & Next buttons
  if (dom.btnPrev) {
    dom.btnPrev.disabled = appState.currentStep <= 1;
  }
  dom.btnNext.disabled = !appState.freePlay && !match.matched;
  dom.btnNext.textContent =
    appState.currentStep === TOTAL_STEPS && (match.matched || appState.freePlay) ? 'Finish 🎉' : 'Next →';

  renderMainWorkspace();
  renderTargetMiniPreview();
}

function persistAndRender() {
  storageManager.saveProgress(appState);
  renderAll();
}

function safeSetPointerCapture(el, pointerId) {
  if (typeof pointerId === 'number' && typeof el.setPointerCapture === 'function') {
    try {
      el.setPointerCapture(pointerId);
    } catch (_err) {
      // Ignore synthetic pointer capture errors
    }
  }
}

function setupInteractions() {
  function clientToSvgPoint(clientX, clientY) {
    const ctm = dom.workspaceSvg.getScreenCTM();
    if (ctm && ctm.a !== 0 && ctm.d !== 0) {
      return {
        x: (clientX - ctm.e) / ctm.a,
        y: (clientY - ctm.f) / ctm.d
      };
    }
    const rect = dom.workspaceSvg.getBoundingClientRect();
    const scaleX = 1000 / Math.max(1, rect.width);
    const scaleY = 620 / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  dom.workspaceSvg.addEventListener('pointerdown', (e) => {
    const cfg = getStepConfig(appState.currentStep);
    const actionEl = e.target.closest('[data-action]');
    const rawAction = actionEl ? actionEl.dataset.action : 'orbit';

    // Only allow the action permitted by the current step (or any action in freePlay); otherwise fall back to camera orbit
    const isPermitted =
      appState.freePlay && ['move', 'length', 'width', 'height', 'lift', 'rotate'].includes(rawAction)
        ? true
        : rawAction === cfg.allowedAction;
    const action = isPermitted ? rawAction : 'orbit';

    e.preventDefault();
    const v = getBoxVertices(appState.box);
    const centerSvg = projectPoint(v.cx, v.cy, v.z0, appState.camera, 500, 345, 5.6);
    const startSvg = clientToSvgPoint(e.clientX, e.clientY);
    const startAngleRad = Math.atan2(startSvg.y - centerSvg.y, startSvg.x - centerSvg.x);

    pointerSession = {
      action,
      startX: e.clientX,
      startY: e.clientY,
      startSvg,
      centerSvg,
      startAngleRad,
      startBox: { ...appState.box },
      startCam: { ...appState.camera }
    };
    safeSetPointerCapture(dom.workspaceSvg, e.pointerId);
  });

  function clientDeltaToSvgDelta(startX, startY, currentX, currentY) {
    const ctm = dom.workspaceSvg.getScreenCTM();
    if (ctm && ctm.a !== 0 && ctm.d !== 0) {
      return {
        dxSvg: (currentX - startX) / ctm.a,
        dySvg: (currentY - startY) / ctm.d
      };
    }
    const rect = dom.workspaceSvg.getBoundingClientRect();
    const fallbackScale = 1000 / Math.max(1, rect.width);
    return {
      dxSvg: (currentX - startX) * fallbackScale,
      dySvg: (currentY - startY) * fallbackScale
    };
  }

  dom.workspaceSvg.addEventListener('pointermove', (e) => {
    if (!pointerSession) return;
    const { dxSvg, dySvg } = clientDeltaToSvgDelta(
      pointerSession.startX,
      pointerSession.startY,
      e.clientX,
      e.clientY
    );

    const { action, startBox, startCam } = pointerSession;

    // Orbiting the camera NEVER alters `appState.box`
    if (action === 'orbit') {
      const nextYaw = clamp(startCam.yaw - dxSvg * 0.25, -88, 88);
      const nextPitch = clamp(startCam.pitch + dySvg * 0.22, 5, 88);
      appState = setCameraInState(appState, { face: '3D', yaw: nextYaw, pitch: nextPitch });
      renderAll();
      return;
    }

    const mmScale = 5.6;
    const yawRad = (appState.camera.yaw * Math.PI) / 180;
    const pitchRad = (appState.camera.pitch * Math.PI) / 180;
    const sinPitch = Math.max(0.25, Math.sin(pitchRad));
    const cosPitch = Math.max(0.25, Math.cos(pitchRad));

    if (action === 'move') {
      const rx = dxSvg / mmScale;
      const ry = dySvg / (mmScale * sinPitch);
      const dWorldX = rx * Math.cos(yawRad) + ry * Math.sin(yawRad);
      const dWorldY = -rx * Math.sin(yawRad) + ry * Math.cos(yawRad);

      appState = updateBoxInState(appState, {
        x: startBox.x + dWorldX,
        y: startBox.y + dWorldY
      });
      renderAll();
    } else if (action === 'length') {
      // Project screen delta onto world +X axis screen vector
      const ux = Math.cos(yawRad) * mmScale;
      const uy = Math.sin(yawRad) * sinPitch * mmScale;
      const denom = ux * ux + uy * uy;
      const deltaLen = denom > 0 ? (dxSvg * ux + dySvg * uy) / denom : 0;
      appState = updateBoxInState(appState, { length: startBox.length + deltaLen });
      renderAll();
    } else if (action === 'width') {
      // Project screen delta onto world +Y axis screen vector
      const vx = -Math.sin(yawRad) * mmScale;
      const vy = Math.cos(yawRad) * sinPitch * mmScale;
      const denom = vx * vx + vy * vy;
      const deltaWid = denom > 0 ? (dxSvg * vx + dySvg * vy) / denom : 0;
      appState = updateBoxInState(appState, { width: startBox.width + deltaWid });
      renderAll();
    } else if (action === 'height') {
      const deltaH = -dySvg / (mmScale * cosPitch);
      appState = updateBoxInState(appState, { height: startBox.height + deltaH });
      renderAll();
    } else if (action === 'lift') {
      const deltaZ = -dySvg / (mmScale * cosPitch);
      appState = updateBoxInState(appState, { z: startBox.z + deltaZ });
      renderAll();
    } else if (action === 'rotate') {
      // Click and hold then turn: require actual pointer drag (single click does not rotate)
      const dragDist = Math.hypot(dxSvg, dySvg);
      if (dragDist < 5) return;

      const currSvgX = pointerSession.startSvg.x + dxSvg;
      const currSvgY = pointerSession.startSvg.y + dySvg;
      const currAngleRad = Math.atan2(
        currSvgY - pointerSession.centerSvg.y,
        currSvgX - pointerSession.centerSvg.x
      );
      let deltaDeg = ((currAngleRad - pointerSession.startAngleRad) * 180) / Math.PI;
      if (deltaDeg > 180) deltaDeg -= 360;
      if (deltaDeg < -180) deltaDeg += 360;

      const turnAmount = Math.max(Math.abs(deltaDeg), dragDist * 0.75);
      appState = updateBoxInState(appState, {
        rotation: startBox.rotation + turnAmount
      });
      renderAll();
    }
  });

  const endPointer = () => {
    if (pointerSession) {
      pointerSession = null;
      persistAndRender();
    }
  };
  dom.workspaceSvg.addEventListener('pointerup', endPointer);
  dom.workspaceSvg.addEventListener('pointercancel', endPointer);

  // ViewCube Face Buttons (3D, TOP, FRONT, SIDE) — strictly camera-only
  dom.viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewKey = btn.dataset.view;
      const preset = CAMERA_PRESETS[viewKey] || CAMERA_PRESETS.ISO;
      appState = setCameraInState(appState, { ...preset });
      persistAndRender();
    });
  });

  // Back Button: returns to the previous step (e.g. from Step 4 back to Step 3)
  if (dom.btnPrev) {
    dom.btnPrev.addEventListener('click', () => {
      if (appState.currentStep <= 1) return;
      const prevStep = appState.currentStep - 1;
      const remainingCompleted = appState.completedSteps.filter((s) => s !== prevStep);
      appState = createStepState(prevStep, remainingCompleted);
      persistAndRender();
    });
  }

  // Reset Button: resets ONLY the current step
  dom.btnReset.addEventListener('click', () => {
    const remainingCompleted = appState.completedSteps.filter((s) => s !== appState.currentStep);
    appState = createStepState(appState.currentStep, remainingCompleted);
    persistAndRender();
  });

  // Hint Button
  dom.btnHint.addEventListener('click', () => {
    appState.hintActive = !appState.hintActive;
    renderAll();
  });

  // Next Button: advances only when the user clicks Next; on Step 8 opens Completion Modal
  dom.btnNext.addEventListener('click', () => {
    const match = evaluateStepMatch(appState);
    if (!match.matched && !appState.freePlay) return;

    if (appState.currentStep === TOTAL_STEPS) {
      if (dom.modalComplete) {
        dom.modalComplete.classList.remove('hidden');
      }
      return;
    }

    const nextStep = appState.currentStep + 1;
    const remainingCompleted = appState.completedSteps.filter((s) => s !== nextStep);
    appState = createStepState(nextStep, remainingCompleted);
    persistAndRender();
  });

  // Completion Modal Actions (Change My Design / Replay 1 / 8)
  if (dom.btnCloseComplete) {
    dom.btnCloseComplete.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
    });
  }
  if (dom.btnChangeDesign) {
    dom.btnChangeDesign.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
      appState = {
        ...appState,
        freePlay: true
      };
      persistAndRender();
    });
  }
  if (dom.btnReplayAll) {
    dom.btnReplayAll.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
      appState = createStepState(1, []);
      persistAndRender();
    });
  }

  // Separate Story & Teacher Info Modal
  dom.btnOpenInfo.addEventListener('click', () => {
    dom.modalInfo.classList.remove('hidden');
  });
  dom.btnCloseInfo.addEventListener('click', () => {
    dom.modalInfo.classList.add('hidden');
  });
}

setupInteractions();
renderAll();
