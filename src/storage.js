/**
 * Builder Island — Progress Storage Manager
 * Uses independent storage key `builder-island.progress.v1`.
 * Isolates demo/test data from student data and handles unavailable storage gracefully.
 */

import {
  WORKPLANE,
  TOTAL_STEPS,
  createInitialState,
  createStepState,
  normalizeRotation,
  clamp
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

  function sanitizeLoadedState(parsed) {
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 3) {
      return createInitialState();
    }

    const step = Number.isFinite(Number(parsed.currentStep))
      ? Math.max(1, Math.min(TOTAL_STEPS, Math.round(Number(parsed.currentStep))))
      : 1;

    const completedSteps = Array.isArray(parsed.completedSteps)
      ? Array.from(
          new Set(
            parsed.completedSteps
              .map((n) => Number(n))
              .filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_STEPS)
          )
        )
      : [];

    const state = createStepState(step, completedSteps);

    if (parsed.box && typeof parsed.box === 'object') {
      const length = Number.isFinite(Number(parsed.box.length))
        ? clamp(Math.round(Number(parsed.box.length)), 6, WORKPLANE.width)
        : state.box.length;
      const width = Number.isFinite(Number(parsed.box.width))
        ? clamp(Math.round(Number(parsed.box.width)), 6, WORKPLANE.depth)
        : state.box.width;
      const height = Number.isFinite(Number(parsed.box.height))
        ? clamp(Math.round(Number(parsed.box.height)), 2, WORKPLANE.maxHeight)
        : state.box.height;
      const x = Number.isFinite(Number(parsed.box.x))
        ? clamp(Math.round(Number(parsed.box.x)), 0, WORKPLANE.width - length)
        : state.box.x;
      const y = Number.isFinite(Number(parsed.box.y))
        ? clamp(Math.round(Number(parsed.box.y)), 0, WORKPLANE.depth - width)
        : state.box.y;
      const z = Number.isFinite(Number(parsed.box.z))
        ? clamp(Math.round(Number(parsed.box.z)), 0, 36)
        : state.box.z;
      const rotation = Number.isFinite(Number(parsed.box.rotation))
        ? normalizeRotation(parsed.box.rotation)
        : state.box.rotation;

      state.box = { x, y, z, length, width, height, rotation };
    }

    if (parsed.camera && typeof parsed.camera === 'object') {
      state.camera = {
        face: typeof parsed.camera.face === 'string' ? parsed.camera.face : state.camera.face,
        yaw: Number.isFinite(Number(parsed.camera.yaw)) ? Number(parsed.camera.yaw) : state.camera.yaw,
        pitch: Number.isFinite(Number(parsed.camera.pitch)) ? Number(parsed.camera.pitch) : state.camera.pitch
      };
    }

    return state;
  }

  function loadProgress() {
    try {
      const raw = storageAvailable && backend ? backend.getItem(storageKey) : memoryFallback.get(storageKey);
      if (!raw) return createInitialState();
      return sanitizeLoadedState(JSON.parse(raw));
    } catch (_err) {
      return createInitialState();
    }
  }

  function saveProgress(state) {
    const payload = JSON.stringify({
      version: 3,
      updatedAt: new Date().toISOString(),
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      box: state.box,
      camera: state.camera
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
