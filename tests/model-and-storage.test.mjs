import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STEPS,
  STAGE_2_STEPS,
  STAGES,
  TOTAL_STEPS,
  CAMERA_PRESETS,
  getStageConfig,
  getStepConfig,
  getBoxVertices,
  normalizeRotation,
  normalizeRotation360,
  createStepState,
  evaluateStepMatch,
  selectBoxInState,
  updateBoxInState,
  setCameraInState
} from '../src/model.js';

import {
  STUDENT_STORAGE_KEY,
  ISOLATED_TEST_STORAGE_KEY,
  ISOLATED_DEMO_STORAGE_KEY,
  createStorageManager
} from '../src/storage.js';

test('Stage 1: Every step 1..8 starts uncompleted and has instruction <= 6 words', () => {
  assert.equal(TOTAL_STEPS, 8);
  assert.equal(STEPS.length, 8);
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    const cfg = getStepConfig(step, 1);
    const wordCount = cfg.instruction.trim().split(/\s+/).length;
    assert.ok(wordCount <= 6, `Stage 1 Step ${step} instruction has ${wordCount} words`);

    const initialState = createStepState(step, [], 1);
    const match = evaluateStepMatch(initialState);
    assert.equal(
      match.matched,
      false,
      `Stage 1 Step ${step} (${cfg.allowedAction}) must NOT be completed in its initial state`
    );
  }
});

test('Stage 1: Each step practices only 1 primary action and blocks unrelated model edits', () => {
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

test('Stage 2: All 8 Challenge tasks have required instructions, start uncompleted, and validate move/rotate/direction/multi-block rules', () => {
  assert.equal(STAGES[1].name, 'Stage 1 — Basics');
  assert.equal(STAGES[2].name, 'Stage 2 — Challenge');
  assert.equal(STAGE_2_STEPS.length, 8);

  const expectedInstructions = [
    'Turn and move the block to match the target.',
    'Match the direction, then move to the target.',
    'Turn the block to match the target.',
    'Look closely. Match the position and direction.',
    'Move both blocks to their matching targets.',
    'One block needs a turn. Match both targets.',
    'Turn and move both blocks to match.',
    'Build the whole shape. Match all three blocks.'
  ];

  for (let step = 1; step <= 8; step++) {
    const cfg = getStepConfig(step, 2);
    assert.equal(cfg.instruction, expectedInstructions[step - 1]);
    const st = createStepState(step, [], 2);
    assert.equal(evaluateStepMatch(st).matched, false, `Stage 2 Step ${step} must start uncompleted`);
  }

  // Q1: Turn and Move — order-independent (move first then rotate, OR rotate first then move)
  let q1MoveFirst = createStepState(1, [], 2);
  q1MoveFirst = updateBoxInState(q1MoveFirst, { x: 52, y: 24 });
  assert.equal(evaluateStepMatch(q1MoveFirst).matched, false, 'Position alone must not pass Q1');
  q1MoveFirst = updateBoxInState(q1MoveFirst, { rotation: 90 });
  assert.equal(evaluateStepMatch(q1MoveFirst).matched, true);

  let q1TurnFirst = createStepState(1, [], 2);
  q1TurnFirst = updateBoxInState(q1TurnFirst, { rotation: 90 });
  assert.equal(evaluateStepMatch(q1TurnFirst).matched, false, 'Rotation alone must not pass Q1');
  q1TurnFirst = updateBoxInState(q1TurnFirst, { x: 52, y: 24 });
  assert.equal(evaluateStepMatch(q1TurnFirst).matched, true);

  // Moving away after matching must immediately un-match (even though completedSteps has 1)
  assert.ok(q1TurnFirst.completedSteps.includes(1));
  const q1MovedAway = updateBoxInState(q1TurnFirst, { x: 12, y: 48 }, false);
  assert.equal(evaluateStepMatch(q1MovedAway).matched, false);

  // Q2: Match the Direction (180° with direction marker)
  let q2 = createStepState(2, [], 2);
  q2 = updateBoxInState(q2, { x: 52, y: 20 });
  assert.equal(evaluateStepMatch(q2).matched, false, '0° at target position must NOT pass 180° directional target');
  q2 = updateBoxInState(q2, { rotation: 180 });
  assert.equal(evaluateStepMatch(q2).matched, true);
  assert.deepEqual(
    getBoxVertices(q2.boxes[0]).directionMarker,
    getBoxVertices(getStepConfig(2, 2).targets[0]).directionMarker,
    '3D direction marker vertices must match target at 180°'
  );

  // Q3: Find the Turn (270° === -90° clockwise or counter-clockwise)
  assert.equal(normalizeRotation360(-90), 270);
  assert.equal(normalizeRotation360(270), 270);
  let q3Clockwise = createStepState(3, [], 2);
  q3Clockwise = updateBoxInState(q3Clockwise, { x: 50, y: 36, rotation: 270 });
  assert.equal(evaluateStepMatch(q3Clockwise).matched, true);

  let q3CounterClockwise = createStepState(3, [], 2);
  q3CounterClockwise = updateBoxInState(q3CounterClockwise, { x: 50, y: 36, rotation: -90 });
  assert.equal(q3CounterClockwise.boxes[0].rotation, 270);
  assert.equal(evaluateStepMatch(q3CounterClockwise).matched, true);

  // Q4: Look and Match (distinct layout from Q1, move + 90° turn)
  const q1Cfg = getStepConfig(1, 2);
  const q4Cfg = getStepConfig(4, 2);
  assert.notDeepEqual(q4Cfg.initialBoxes[0], q1Cfg.initialBoxes[0]);
  assert.notDeepEqual(q4Cfg.targets[0], q1Cfg.targets[0]);
  let q4 = createStepState(4, [], 2);
  q4 = updateBoxInState(q4, { x: 16, y: 42, rotation: 90 });
  assert.equal(evaluateStepMatch(q4).matched, true);

  // Q5: Two Blocks (move only, rotation disabled, fixed correspondence)
  let q5 = createStepState(5, [], 2);
  q5 = updateBoxInState(q5, { boxId: 'b1', rotation: 90 });
  assert.equal(q5.boxes[0].rotation, 0, 'Q5 must not allow rotation');
  // Swapping b1 and b2 positions must NOT match
  q5 = updateBoxInState(q5, { boxId: 'b1', x: 60, y: 16 }, false);
  q5 = updateBoxInState(q5, { boxId: 'b2', x: 54, y: 48 }, false);
  assert.equal(evaluateStepMatch(q5).matched, false, 'Fixed correspondence: swapped blocks must not pass');
  // Correct matching targets
  q5 = updateBoxInState(q5, { boxId: 'b1', x: 54, y: 48 });
  assert.equal(evaluateStepMatch(q5).matched, false, 'Matching only 1 of 2 blocks must not pass');
  q5 = updateBoxInState(q5, { boxId: 'b2', x: 60, y: 16 });
  assert.equal(evaluateStepMatch(q5).matched, true);

  // Q6: One Needs a Turn (b1 moves + turns 90°, b2 only moves)
  let q6 = createStepState(6, [], 2);
  q6 = updateBoxInState(q6, { boxId: 'b1', x: 16, y: 44, rotation: 90 });
  q6 = updateBoxInState(q6, { boxId: 'b2', x: 54, y: 50 });
  assert.equal(evaluateStepMatch(q6).matched, true);

  // Q7: Turn Both (b1 turns 90°, b2 has direction marker and turns 180°)
  let q7 = createStepState(7, [], 2);
  q7 = updateBoxInState(q7, { boxId: 'b1', x: 16, y: 44, rotation: 90 });
  q7 = updateBoxInState(q7, { boxId: 'b2', x: 52, y: 48, rotation: 0 });
  assert.equal(evaluateStepMatch(q7).matched, false, 'b2 at 0° must not pass 180° directional target');
  q7 = updateBoxInState(q7, { boxId: 'b2', rotation: 180 });
  assert.equal(evaluateStepMatch(q7).matched, true);

  // Q8: Build the Shape (3 blocks, all move, b1 & b3 turn 90°)
  let q8 = createStepState(8, [], 2);
  q8 = selectBoxInState(q8, 'b2');
  assert.equal(q8.selectedBoxId, 'b2');
  q8 = updateBoxInState(q8, { boxId: 'b1', x: 12, y: 40, rotation: 90 });
  q8 = updateBoxInState(q8, { boxId: 'b2', x: 34, y: 12, rotation: 0 });
  assert.equal(evaluateStepMatch(q8).matched, false, '2 of 3 blocks matched must not pass Q8');
  q8 = updateBoxInState(q8, { boxId: 'b3', x: 58, y: 40, rotation: 90 });
  assert.equal(evaluateStepMatch(q8).matched, true);
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

test('Storage isolation and independent per-stage progress (Stage 1 vs Stage 2)', () => {
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

  // Save Stage 1 progress on Step 3
  let s1 = createStepState(3, [1, 2], 1);
  s1 = updateBoxInState(s1, { height: 4 });
  studentStorage.saveProgress(s1);

  // Save Stage 2 progress on Step 5
  let s2 = createStepState(5, [1, 2, 3, 4], 2);
  s2 = updateBoxInState(s2, { boxId: 'b1', x: 54, y: 48 });
  studentStorage.saveProgress(s2);

  // Loading Stage 1 restores Step 3 without being overwritten by Stage 2
  const loadedStage1 = studentStorage.loadProgress(1);
  assert.equal(loadedStage1.currentStage, 1);
  assert.equal(loadedStage1.currentStep, 3);
  assert.deepEqual(loadedStage1.completedSteps, [1, 2, 3]);
  assert.equal(loadedStage1.box.height, 4);

  // Loading Stage 2 restores Step 5 and multi-block positions
  const loadedStage2 = studentStorage.loadProgress(2);
  assert.equal(loadedStage2.currentStage, 2);
  assert.equal(loadedStage2.currentStep, 5);
  assert.deepEqual(loadedStage2.completedSteps, [1, 2, 3, 4]);
  assert.equal(loadedStage2.boxes[0].x, 54);
  assert.equal(loadedStage2.boxes[0].y, 48);

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
});
