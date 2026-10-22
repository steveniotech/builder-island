/**
 * Builder Island — Progress Storage Manager
 * Uses independent storage key `builder-island.progress.v1`.
 * Preserves per-stage progress (Stages 1–4) independently without cross-stage overwriting,
 * migrates v3 single-stage progress cleanly, and handles unavailable storage gracefully.
 */

import {
  WORKPLANE,
  TOTAL_STEPS,
  createInitialState,
  createStepState,
  toPlainBox,
  normalizeRotation,
  normalizeRotation360,
  clamp,
  updateBoxInState,
  normalizeOrientation,
  ORIENTATION_VERSION
} from './model.js';

export const STUDENT_STORAGE_KEY = 'builder-island.progress.v1';
export const ISOLATED_TEST_STORAGE_KEY = 'builder-island.isolated-test.v1';
export const ISOLATED_DEMO_STORAGE_KEY = 'builder-island.demo.v3';

export function getRuntimeStorageConfig(searchString = '') {
  const params = new URLSearchParams(searchString);
  const mode = params.get('mode') || 'student';
  const forceDisableStorage = params.get('storage') === 'disabled';
  const isIsolated = mode === 'test' || mode === 'demo';

  let storageKey = STUDENT_STORAGE_KEY;
  if (mode === 'test') storageKey = ISOLATED_TEST_STORAGE_KEY;
  if (mode === 'demo') storageKey = ISOLATED_DEMO_STORAGE_KEY;

  return {
    mode,
    isIsolated,
    forceDisableStorage,
    storageKey
  };
}

export function createStorageManager(options = {}) {
  const config = getRuntimeStorageConfig(options.searchString ?? '');
  const storageKey = options.storageKey ?? config.storageKey;
  const forceDisable = options.forceDisableStorage ?? config.forceDisableStorage;

  const memoryFallback = new Map();
  let storageAvailable = false;
  let backend = null;

  if (!forceDisable) {
    try {
      const candidate =
        options.customStorage ??
        (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);

      if (candidate) {
        const probeKey = `${storageKey}.__probe__`;
        candidate.setItem(probeKey, '1');
        candidate.removeItem(probeKey);
        backend = candidate;
        storageAvailable = true;
      }
    } catch (_err) {
      storageAvailable = false;
      backend = null;
    }
  }

  function sanitizeSingleBox(rawBox, defaultBox, stageId) {
    if (!rawBox || typeof rawBox !== 'object') return { ...defaultBox };
    const length = Number.isFinite(Number(rawBox.length))
      ? clamp(Math.round(Number(rawBox.length)), 6, WORKPLANE.width)
      : defaultBox.length;
    const width = Number.isFinite(Number(rawBox.width))
      ? clamp(Math.round(Number(rawBox.width)), 6, WORKPLANE.depth)
      : defaultBox.width;
    const height = Number.isFinite(Number(rawBox.height))
      ? clamp(Math.round(Number(rawBox.height)), 2, WORKPLANE.maxHeight)
      : defaultBox.height;
    const x = Number.isFinite(Number(rawBox.x))
      ? clamp(Math.round(Number(rawBox.x)), 0, WORKPLANE.width - length)
      : defaultBox.x;
    const y = Number.isFinite(Number(rawBox.y))
      ? clamp(Math.round(Number(rawBox.y)), 0, WORKPLANE.depth - width)
      : defaultBox.y;
    const z = Number.isFinite(Number(rawBox.z))
      ? clamp(Math.round(Number(rawBox.z)), 0, 36)
      : defaultBox.z;
    const rotation = Number.isFinite(Number(rawBox.rotation))
      ? defaultBox.hasDirectionMarker || stageId === 2
        ? normalizeRotation360(rawBox.rotation)
        : normalizeRotation(rawBox.rotation)
      : defaultBox.rotation;

    return {
      ...defaultBox,
      x,
      y,
      z,
      length,
      width,
      height,
      rotation
    };
  }

  function sanitizeStageSnapshot(snap, stageId = 1) {
    const normalizedStage = [1, 2, 3, 4].includes(stageId) ? stageId : 1;
    if (!snap || typeof snap !== 'object') {
      return createInitialState(normalizedStage);
    }

    const step = Number.isFinite(Number(snap.currentStep))
      ? Math.max(1, Math.min(TOTAL_STEPS, Math.round(Number(snap.currentStep))))
      : 1;

    const completedSteps = Array.isArray(snap.completedSteps)
      ? Array.from(
          new Set(
            snap.completedSteps
              .map((n) => Number(n))
              .filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_STEPS)
          )
        )
      : [];

    const state = createStepState(step, completedSteps, normalizedStage);

    if (Array.isArray(snap.boxes) && snap.boxes.length > 0) {
      state.boxes = state.boxes.map((defaultBox, idx) => {
        const savedBox =
          snap.boxes.find((b) => b && b.id === defaultBox.id) || snap.boxes[idx];
        return sanitizeSingleBox(savedBox, defaultBox, normalizedStage);
      });
      // If stage 1 caller mutated `snap.box` directly, honor it for single-box stage 1
      if (normalizedStage === 1 && snap.box && typeof snap.box === 'object') {
        const sanitizedBox = sanitizeSingleBox(snap.box, state.boxes[0], 1);
        state.boxes[0] = sanitizedBox;
      }
      state.box = toPlainBox(state.boxes[0]);
    } else if (snap.box && typeof snap.box === 'object') {
      const sanitizedBox = sanitizeSingleBox(snap.box, state.boxes[0], normalizedStage);
      state.boxes[0] = sanitizedBox;
      state.box = toPlainBox(sanitizedBox);
    }

    if (normalizedStage === 3) {
      const clean = createStepState(step, completedSteps, 3);
      const saved = (Array.isArray(snap.boxes) && snap.boxes[0]) || snap.box || {};
      const initial = clean.boxes[0];
      const updates = { length: saved.length, width: saved.width, z: saved.z, scale: Number.isFinite(Number(saved.length)) ? saved.length / initial.length : 1 };
      const normalized = updateBoxInState(clean, updates, false);
      state.boxes = normalized.boxes;
      state.box = normalized.box;
    }

    if (normalizedStage === 4) {
      const initial = createStepState(step, completedSteps, 4);
      const saved = (Array.isArray(snap.boxes) && snap.boxes[0]) || snap.box || {};
      const orientation = saved.orientationVersion === ORIENTATION_VERSION ? normalizeOrientation(saved.orientation) : [1,0,0,0];
      state.boxes = [{...initial.boxes[0], orientation}];
      state.box = toPlainBox(state.boxes[0]);
    }

    if (
      typeof snap.selectedBoxId === 'string' &&
      state.boxes.some((b) => b.id === snap.selectedBoxId)
    ) {
      state.selectedBoxId = snap.selectedBoxId;
    }

    if (normalizedStage !== 4 && snap.camera && typeof snap.camera === 'object') {
      state.camera = {
        face: typeof snap.camera.face === 'string' ? snap.camera.face : state.camera.face,
        yaw: Number.isFinite(Number(snap.camera.yaw)) ? Number(snap.camera.yaw) : state.camera.yaw,
        pitch: Number.isFinite(Number(snap.camera.pitch))
          ? Number(snap.camera.pitch)
          : state.camera.pitch
      };
    }

    return state;
  }

  function readRawObject() {
    try {
      const raw =
        storageAvailable && backend
          ? backend.getItem(storageKey)
          : memoryFallback.get(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (![3,4,5].includes(parsed.version)) return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  function sanitizeLoadedState(parsed, requestedStageId = null) {
    if (!parsed || typeof parsed !== 'object' || (![3,4,5].includes(parsed.version))) {
      return createInitialState([1, 2, 3, 4].includes(requestedStageId) ? requestedStageId : 1);
    }

    const activeStage =
      [1, 2, 3, 4].includes(requestedStageId)
        ? requestedStageId
        : [1, 2, 3, 4].includes(parsed.currentStage)
          ? parsed.currentStage
          : 1;

    if (activeStage === 4 && parsed.version !== 5) return createInitialState(4);

    if ([4,5].includes(parsed.version) && parsed.stages && typeof parsed.stages === 'object') {
      const stageSnap = parsed.stages[activeStage] || parsed.stages[String(activeStage)];
      if (stageSnap) {
        return sanitizeStageSnapshot(stageSnap, activeStage);
      }
      return createInitialState(activeStage);
    }

    // Migrate version 3 (or flat object) as Stage 1
    if (activeStage === 1) {
      return sanitizeStageSnapshot(parsed, 1);
    }
    return createInitialState(activeStage);
  }

  function loadProgress(requestedStageId = null) {
    const parsed = readRawObject();
    if (!parsed) return createInitialState([1, 2, 3, 4].includes(requestedStageId) ? requestedStageId : 1);
    return sanitizeLoadedState(parsed, requestedStageId);
  }

  function saveProgress(state) {
    const activeStage = [1, 2, 3, 4].includes(state.currentStage) ? state.currentStage : 1;
    const existing = readRawObject();

    const existingStages =
      existing && [4,5].includes(existing.version) && existing.stages && typeof existing.stages === 'object'
        ? { ...existing.stages }
        : existing && existing.version === 3
          ? {
              1: {
                currentStep: existing.currentStep,
                completedSteps: existing.completedSteps,
                box: existing.box,
                camera: existing.camera
              }
            }
          : {};

    const stageEntry = {
      currentStage: activeStage,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      box: state.box,
      boxes: state.boxes,
      selectedBoxId: state.selectedBoxId,
      camera: state.camera
    };

    existingStages[activeStage] = stageEntry;

    const payload = JSON.stringify({
      version: 5,
      updatedAt: new Date().toISOString(),
      currentStage: activeStage,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      box: state.box,
      boxes: state.boxes,
      selectedBoxId: state.selectedBoxId,
      camera: state.camera,
      stages: existingStages
    });

    if (storageAvailable && backend) {
      try {
        backend.setItem(storageKey, payload);
        return { savedToPersistentStorage: true, storageKey };
      } catch (_err) {
        storageAvailable = false;
      }
    }

    memoryFallback.set(storageKey, payload);
    return { savedToPersistentStorage: false, storageKey };
  }

  function clearProgress() {
    if (storageAvailable && backend) {
      try {
        backend.removeItem(storageKey);
      } catch (_err) {
        // ignore
      }
    }
    memoryFallback.delete(storageKey);
  }

  return {
    get storageKey() {
      return storageKey;
    },
    get isStorageAvailable() {
      return storageAvailable;
    },
    get isIsolatedMode() {
      return config.isIsolated;
    },
    get mode() {
      return config.mode;
    },
    loadProgress,
    saveProgress,
    clearProgress
  };
}
