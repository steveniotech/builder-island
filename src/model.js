/**
 * Builder Island — Minimalist 3D Practice Playground Model
 * Strict single-action per step, independent camera/model state, and shared 3D coordinate basis.
 */

export const WORKPLANE = Object.freeze({
  width: 100,
  depth: 80,
  maxHeight: 60
});

export const CAMERA_PRESETS = Object.freeze({
  ISO: { face: '3D', yaw: 38, pitch: 28 },
  TOP: { face: 'TOP', yaw: 0, pitch: 88 },
  FRONT: { face: 'FRONT', yaw: 0, pitch: 6 },
  SIDE: { face: 'SIDE', yaw: 88, pitch: 6 }
});

export const STORY_INTRO =
  'A little robot has arrived on Builder Island. It has no home yet! Help it build a safe base, a doorway, and a welcome sign.';

/**
 * 8 minimalist hands-on tasks.
 * Each step practices strictly ONE primary action and only enables its relevant control.
 */
export const STEPS = Object.freeze([
  {
    step: 1,
    instruction: 'Drag the box to the target.',
    hintText: 'Drag the red box.',
    allowedAction: 'move',
    initialCamera: 'ISO',
    initialBox: { x: 14, y: 46, z: 0, length: 20, width: 20, height: 20, rotation: 0 },
    target: { x: 52, y: 30, z: 0, length: 20, width: 20, height: 20, rotation: 0 }
  },
  {
    step: 2,
    instruction: 'Stretch the box to fit.',
    hintText: 'Drag the right white square.',
    allowedAction: 'length',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 30, z: 0, length: 20, width: 20, height: 20, rotation: 0 },
    target: { x: 30, y: 30, z: 0, length: 44, width: 20, height: 20, rotation: 0 }
  },
  {
    step: 3,
    instruction: 'Push the top handle down.',
    hintText: 'Drag the top square down.',
    allowedAction: 'height',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 25, z: 0, length: 40, width: 30, height: 26, rotation: 0 },
    target: { x: 30, y: 25, z: 0, length: 40, width: 30, height: 4, rotation: 0 }
  },
  {
    step: 4,
    instruction: 'Look from the TOP view.',
    hintText: 'Click TOP on the view bar.',
    allowedAction: 'view-top',
    initialCamera: 'ISO',
    requiredFace: 'TOP',
    initialBox: { x: 35, y: 25, z: 0, length: 30, width: 30, height: 14, rotation: 0 },
    target: { x: 35, y: 25, z: 0, length: 30, width: 30, height: 14, rotation: 0 }
  },
  {
    step: 5,
    instruction: 'Rotate the box to fit.',
    hintText: 'Hold and turn the ↻ handle.',
    allowedAction: 'rotate',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 32, z: 0, length: 40, width: 16, height: 14, rotation: 0 },
    target: { x: 30, y: 32, z: 0, length: 40, width: 16, height: 14, rotation: 90 }
  },
  {
    step: 6,
    instruction: 'Look from the FRONT view.',
    hintText: 'Click FRONT on the view bar.',
    allowedAction: 'view-front',
    initialCamera: 'ISO',
    requiredFace: 'FRONT',
    initialBox: { x: 38, y: 30, z: 0, length: 24, width: 20, height: 26, rotation: 0 },
    target: { x: 38, y: 30, z: 0, length: 24, width: 20, height: 26, rotation: 0 }
  },
  {
    step: 7,
    instruction: 'Lift the block up high.',
    hintText: 'Drag the top black cone up.',
    allowedAction: 'lift',
    initialCamera: 'FRONT',
    initialBox: { x: 35, y: 30, z: 0, length: 30, width: 20, height: 10, rotation: 0 },
    target: { x: 35, y: 30, z: 22, length: 30, width: 20, height: 10, rotation: 0 }
  },
  {
    step: 8,
    instruction: 'Pull the front handle out.',
    hintText: 'Drag the front white square.',
    allowedAction: 'width',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 25, z: 0, length: 40, width: 14, height: 4, rotation: 0 },
    target: { x: 30, y: 25, z: 0, length: 40, width: 30, height: 4, rotation: 0 }
  }
]);

export const TOTAL_STEPS = STEPS.length;

export function getStepConfig(stepNumber) {
  const index = Math.max(0, Math.min(STEPS.length - 1, (Number(stepNumber) || 1) - 1));
  return STEPS[index];
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function normalizeRotation(deg) {
  const raw = Number(deg) || 0;
  const mod = ((raw % 180) + 180) % 180;
  return Math.round(mod);
}

/**
 * Shared 3D coordinate basis for both rendering and target validation.
 * Rotation pivots around the horizontal center (cx, cy) of the unrotated box.
 * Supports smooth intermediate angles (0..180 deg) while dragging, and exact axis-aligned vertices at 0 and 90 deg.
 */
export function getBoxVertices(box) {
  const rot = normalizeRotation(box.rotation);
  const cx = box.x + box.length / 2;
  const cy = box.y + box.width / 2;
  const z0 = box.z || 0;
  const z1 = z0 + box.height;

  if (rot === 0 || rot === 90) {
    const effLength = rot === 90 ? box.width : box.length;
    const effWidth = rot === 90 ? box.length : box.width;

    const x0 = cx - effLength / 2;
    const x1 = cx + effLength / 2;
    const y0 = cy - effWidth / 2;
    const y1 = cy + effWidth / 2;

    return {
      x0,
      x1,
      y0,
      y1,
      z0,
      z1,
      cx,
      cy,
      effLength,
      effWidth,
      corners: [
        { x: x0, y: y0, z: z0 }, // 0: back-left-bottom
        { x: x1, y: y0, z: z0 }, // 1: back-right-bottom
        { x: x1, y: y1, z: z0 }, // 2: front-right-bottom
        { x: x0, y: y1, z: z0 }, // 3: front-left-bottom
        { x: x0, y: y0, z: z1 }, // 4: back-left-top
        { x: x1, y: y0, z: z1 }, // 5: back-right-top
        { x: x1, y: y1, z: z1 }, // 6: front-right-top
        { x: x0, y: y1, z: z1 }  // 7: front-left-top
      ]
    };
  }

  // Smooth intermediate angle during click-and-hold turning
  const rad = (rot * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const hx = box.length / 2;
  const hy = box.width / 2;

  const localBase = [
    { lx: -hx, ly: -hy },
    { lx: hx, ly: -hy },
    { lx: hx, ly: hy },
    { lx: -hx, ly: hy }
  ];

  const baseCorners = localBase.map(({ lx, ly }) => ({
    x: cx + lx * cosA - ly * sinA,
    y: cy + lx * sinA + ly * cosA
  }));

  const xs = baseCorners.map((p) => p.x);
  const ys = baseCorners.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  return {
    x0,
    x1,
    y0,
    y1,
    z0,
    z1,
    cx,
    cy,
    effLength: x1 - x0,
    effWidth: y1 - y0,
    corners: [
      { x: baseCorners[0].x, y: baseCorners[0].y, z: z0 },
      { x: baseCorners[1].x, y: baseCorners[1].y, z: z0 },
      { x: baseCorners[2].x, y: baseCorners[2].y, z: z0 },
      { x: baseCorners[3].x, y: baseCorners[3].y, z: z0 },
      { x: baseCorners[0].x, y: baseCorners[0].y, z: z1 },
      { x: baseCorners[1].x, y: baseCorners[1].y, z: z1 },
      { x: baseCorners[2].x, y: baseCorners[2].y, z: z1 },
      { x: baseCorners[3].x, y: baseCorners[3].y, z: z1 }
    ]
  };
}

export function createStepState(stepNumber = 1, completedSteps = []) {
  const cfg = getStepConfig(stepNumber);
  const cam = CAMERA_PRESETS[cfg.initialCamera] || CAMERA_PRESETS.ISO;
  return {
    version: 3,
    currentStep: cfg.step,
    completedSteps: Array.from(new Set(completedSteps)),
    box: { ...cfg.initialBox },
    selected: true,
    camera: { ...cam },
    hintActive: false,
    freePlay: false
  };
}

export function createInitialState() {
  return createStepState(1, []);
}

/**
 * Evaluates whether the current state matches the step target using the shared 3D coordinate basis.
 */
export function evaluateStepMatch(state) {
  const cfg = getStepConfig(state.currentStep);
  const bv = getBoxVertices(state.box);
  const tv = getBoxVertices(cfg.target);

  const tol = 2.5;
  const x0Ok = Math.abs(bv.x0 - tv.x0) <= tol;
  const x1Ok = Math.abs(bv.x1 - tv.x1) <= tol;
  const y0Ok = Math.abs(bv.y0 - tv.y0) <= tol;
  const y1Ok = Math.abs(bv.y1 - tv.y1) <= tol;
  const z0Ok = Math.abs(bv.z0 - tv.z0) <= tol;
  const z1Ok = Math.abs(bv.z1 - tv.z1) <= tol;
  const rotOk = normalizeRotation(state.box.rotation) === normalizeRotation(cfg.target.rotation);
  const faceOk = !cfg.requiredFace || state.camera.face === cfg.requiredFace;

  const matched = x0Ok && x1Ok && y0Ok && y1Ok && z0Ok && z1Ok && rotOk && faceOk;

  return {
    matched,
    x0Ok,
    x1Ok,
    y0Ok,
    y1Ok,
    z0Ok,
    z1Ok,
    rotOk,
    faceOk
  };
}

/**
 * Snaps only the active dimension/property when dragged within 2.5mm of target.
 */
export function snapBoxToTargetIfClose(box, target, allowedAction) {
  const next = { ...box };
  if (allowedAction === 'move' && Math.abs(next.x - target.x) <= 3 && Math.abs(next.y - target.y) <= 3) {
    next.x = target.x;
    next.y = target.y;
  }
  if (allowedAction === 'length' && Math.abs(next.length - target.length) <= 2.5) {
    next.length = target.length;
  }
  if (allowedAction === 'width' && Math.abs(next.width - target.width) <= 2.5) {
    next.width = target.width;
  }
  if (allowedAction === 'height' && Math.abs(next.height - target.height) <= 2.5) {
    next.height = target.height;
  }
  if (allowedAction === 'lift' && Math.abs(next.z - target.z) <= 2.5) {
    next.z = target.z;
  }
  if (allowedAction === 'rotate' && Math.abs(next.rotation - target.rotation) <= 15) {
    next.rotation = target.rotation;
  }
  return next;
}

/**
 * Updates only the property permitted by the current step's `allowedAction`.
 * View steps ('view-top', 'view-front') never allow modifying the box.
 */
export function updateBoxInState(state, updates, enableSnap = true) {
  const cfg = getStepConfig(state.currentStep);
  const allowed = state.freePlay ? 'all' : cfg.allowedAction;

  // View-only steps do not allow modifying the box
  if (allowed === 'view-top' || allowed === 'view-front') {
    return state;
  }

  const b = state.box;
  let length = b.length;
  let width = b.width;
  let height = b.height;
  let x = b.x;
  let y = b.y;
  let z = b.z;
  let rotation = b.rotation;

  if (allowed === 'all' || allowed === 'length') {
    if (updates.length !== undefined) length = clamp(Math.round(updates.length), 6, WORKPLANE.width - x);
  }
  if (allowed === 'all' || allowed === 'width') {
    if (updates.width !== undefined) width = clamp(Math.round(updates.width), 6, WORKPLANE.depth - y);
  }
  if (allowed === 'all' || allowed === 'height') {
    if (updates.height !== undefined) height = clamp(Math.round(updates.height), 2, WORKPLANE.maxHeight);
  }
  if (allowed === 'all' || allowed === 'move') {
    if (updates.x !== undefined) x = clamp(Math.round(updates.x), 0, WORKPLANE.width - length);
    if (updates.y !== undefined) y = clamp(Math.round(updates.y), 0, WORKPLANE.depth - width);
  }
  if (allowed === 'all' || allowed === 'lift') {
    if (updates.z !== undefined) z = clamp(Math.round(updates.z), 0, 36);
  }
  if (allowed === 'all' || allowed === 'rotate') {
    if (updates.rotation !== undefined) rotation = normalizeRotation(updates.rotation);
  }

  const rawBox = { x, y, z, length, width, height, rotation };
  const finalBox =
    enableSnap && !state.freePlay ? snapBoxToTargetIfClose(rawBox, cfg.target, allowed) : rawBox;

  const nextState = {
    ...state,
    box: finalBox
  };

  const match = evaluateStepMatch(nextState);
  if (match.matched && !nextState.completedSteps.includes(nextState.currentStep)) {
    nextState.completedSteps = [...nextState.completedSteps, nextState.currentStep];
  }

  return nextState;
}

/**
 * Updates ONLY the camera state. Never mutates `state.box`.
 */
export function setCameraInState(state, cameraUpdates) {
  const nextCamera = {
    ...state.camera,
    ...cameraUpdates
  };
  const nextState = {
    ...state,
    box: { ...state.box },
    camera: nextCamera
  };
  const match = evaluateStepMatch(nextState);
  if (match.matched && !nextState.completedSteps.includes(nextState.currentStep)) {
    nextState.completedSteps = [...nextState.completedSteps, nextState.currentStep];
  }
  return nextState;
}
