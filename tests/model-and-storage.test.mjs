import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STEPS,
  TOTAL_STEPS,
  CAMERA_PRESETS,
  getStepConfig,
  getBoxVertices,
  createStepState,
  evaluateStepMatch,
  updateBoxInState,
  setCameraInState
} from '../src/model.js';

import {
  STUDENT_STORAGE_KEY,
  ISOLATED_TEST_STORAGE_KEY,
  ISOLATED_DEMO_STORAGE_KEY,
  createStorageManager
} from '../src/storage.js';

test('Every step 1..8 starts uncompleted and has instruction <= 6 words', () => {
  assert.equal(TOTAL_STEPS, 8);
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    const cfg = getStepConfig(step);
    const wordCount = cfg.instruction.trim().split(/\s+/).length;
    assert.ok(wordCount <= 6, `Step ${step} instruction has ${wordCount} words`);

    const initialState = createStepState(step);
    const match = evaluateStepMatch(initialState);
    assert.equal(
      match.matched,
      false,
      `Step ${step} (${cfg.allowedAction}) must NOT be completed in its initial state`
    );
  }
});

test('Each step practices only 1 primary action and blocks unrelated model edits', () => {
  // Step 1: Move only — attempting resize/rotate/lift does nothing
  let s1 = createStepState(1);
  s1 = updateBoxInState(s1, { length: 50, height: 50, z: 20, rotation: 90 });
  assert.equal(s1.box.length, 20);
  assert.equal(s1.box.height, 20);
  assert.equal(s1.box.z, 0);
  assert.equal(s1.box.rotation, 0);
  s1 = updateBoxInState(s1, { x: 52, y: 30 });
  assert.equal(evaluateStepMatch(s1).matched, true);

  // Step 2: Length resize only
  let s2 = createStepState(2);
  s2 = updateBoxInState(s2, { x: 10, height: 4, width: 40 });
  assert.equal(s2.box.x, 30);
  assert.equal(s2.box.height, 20);
  assert.equal(s2.box.width, 20);
  s2 = updateBoxInState(s2, { length: 44 });
  assert.equal(evaluateStepMatch(s2).matched, true);

  // Step 3: Height resize only (does NOT change z lift)
  let s3 = createStepState(3);
  s3 = updateBoxInState(s3, { z: 20, height: 4 });
  assert.equal(s3.box.z, 0);
  assert.equal(s3.box.height, 4);
  assert.equal(evaluateStepMatch(s3).matched, true);

  // Step 4: Switch to TOP view only (no movement required, model cannot be modified)
  let s4 = createStepState(4);
  const s4Before = { ...s4.box };
  s4 = updateBoxInState(s4, { x: 0, y: 0, length: 90, height: 50 });
  assert.deepEqual(s4.box, s4Before, 'View step 4 must not allow model edits');
  assert.equal(evaluateStepMatch(s4).matched, false);
  s4 = setCameraInState(s4, CAMERA_PRESETS.TOP);
  assert.equal(evaluateStepMatch(s4).matched, true);
  assert.deepEqual(s4.box, s4Before, 'Switching to TOP view must not alter box state');

  // Step 5: Rotate only, using shared center-pivot coordinate basis
  let s5 = createStepState(5);
  s5 = updateBoxInState(s5, { rotation: 90 });
  assert.equal(evaluateStepMatch(s5).matched, true);
  assert.deepEqual(
    getBoxVertices(s5.box).corners,
    getBoxVertices(getStepConfig(5).target).corners,
    'Rotated box and target outline must share identical 3D vertices'
  );

  // Step 6: Switch to FRONT view only (no height change required, model cannot be modified)
  let s6 = createStepState(6);
  const s6Before = { ...s6.box };
  s6 = updateBoxInState(s6, { height: 50, x: 10 });
  assert.deepEqual(s6.box, s6Before, 'View step 6 must not allow model edits');
  assert.equal(evaluateStepMatch(s6).matched, false);
  s6 = setCameraInState(s6, CAMERA_PRESETS.FRONT);
  assert.equal(evaluateStepMatch(s6).matched, true);
  assert.deepEqual(s6.box, s6Before);

  // Step 7: Lift entire object (z) only — height remains unchanged
  let s7 = createStepState(7);
  s7 = updateBoxInState(s7, { height: 40, z: 22 });
  assert.equal(s7.box.height, 10, 'Lift step must not change object height');
  assert.equal(s7.box.z, 22);
  assert.equal(evaluateStepMatch(s7).matched, true);

  // Step 8: Width resize only (completes the 40 × 30 × 4 mm Safe Robot Base)
  let s8 = createStepState(8);
  s8 = updateBoxInState(s8, { width: 30 });
  assert.equal(evaluateStepMatch(s8).matched, true);
  assert.equal(s8.box.length, 40);
  assert.equal(s8.box.width, 30);
  assert.equal(s8.box.height, 4);

  // Free Play mode after Step 8 allows editing all box properties
  let freeState = { ...s8, freePlay: true };
  freeState = updateBoxInState(freeState, { x: 20, y: 20, length: 50, width: 24, height: 12, z: 10, rotation: 90 });
  assert.equal(freeState.box.length, 50);
  assert.equal(freeState.box.height, 12);
  assert.equal(freeState.box.z, 10);
  assert.equal(freeState.box.rotation, 90);
});

test('Camera changes (TOP/FRONT/SIDE/orbit) are completely independent from model state', () => {
  let state = createStepState(1);
  state = updateBoxInState(state, { x: 28, y: 34 }, false);
  const snapshotBox = { ...state.box };

  for (const preset of Object.values(CAMERA_PRESETS)) {
    state = setCameraInState(state, preset);
    assert.deepEqual(state.box, snapshotBox);
  }

  state = setCameraInState(state, { face: '3D', yaw: -42, pitch: 55 });
  assert.deepEqual(state.box, snapshotBox);
});

test('Storage isolation between student progress and demo/test modes', () => {
  const backingMap = new Map();
  const mockLocalStorage = {
    getItem: (k) => (backingMap.has(k) ? backingMap.get(k) : null),
    setItem: (k, v) => backingMap.set(k, String(v)),
    removeItem: (k) => backingMap.delete(k)
  };

  const studentStorage = createStorageManager({
    searchString: '',
    customStorage: mockLocalStorage
  });
  assert.equal(studentStorage.storageKey, STUDENT_STORAGE_KEY);

  let state = createStepState(3, [1, 2]);
  state = updateBoxInState(state, { height: 4 });
  studentStorage.saveProgress(state);

  const demoStorage = createStorageManager({
    searchString: '?mode=demo',
    customStorage: mockLocalStorage
  });
  assert.equal(demoStorage.storageKey, ISOLATED_DEMO_STORAGE_KEY);
  assert.equal(demoStorage.loadProgress().currentStep, 1);

  const testStorage = createStorageManager({
    searchString: '?mode=test',
    customStorage: mockLocalStorage
  });
  assert.equal(testStorage.storageKey, ISOLATED_TEST_STORAGE_KEY);
  assert.equal(studentStorage.loadProgress().currentStep, 3);
});
