import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorageManager, STUDENT_STORAGE_KEY } from '../src/storage.js';
import { createStepState, updateBoxInState } from '../src/model.js';

function backend() {
  const data = new Map();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
}
test('v3 migration preserves Stage 1 when Stage 2 is saved first', () => {
  const store = backend();
  const old = { ...createStepState(3, [1,2]), version: 3 };
  delete old.boxes;
  store.setItem(STUDENT_STORAGE_KEY, JSON.stringify(old));
  const manager = createStorageManager({customStorage: store});
  assert.equal(manager.loadProgress(1).currentStep, 3);
  assert.deepEqual(manager.loadProgress(2).completedSteps, []);
  manager.saveProgress(createStepState(5, [1,2,3,4], 2));
  const fresh = createStorageManager({customStorage: store});
  assert.equal(fresh.loadProgress(1).currentStep, 3);
  assert.equal(fresh.loadProgress(2).currentStep, 5);
});
test('fresh manager restores partial multi-block state and camera', () => {
  const store = backend();
  const manager = createStorageManager({customStorage: store});
  let state = createStepState(8, [1,2,3,4,5,6,7], 2);
  state = updateBoxInState(state, {boxId:'b3', x:58, y:40, rotation:90});
  state.camera = {face:'3D', yaw:12, pitch:40};
  manager.saveProgress(state);
  const restored = createStorageManager({customStorage:store}).loadProgress();
  assert.deepEqual(restored.boxes, state.boxes);
  assert.deepEqual(restored.camera, state.camera);
  assert.equal(restored.selectedBoxId, 'b3');
});
test('corrupt, unknown-version and unavailable storage recover without crashing', () => {
  for (const raw of ['{', 'null', '{"version":99}', '{"version":4,"stages":{"2":{"currentStep":999,"completedSteps":[0,1,1,99]}} ,"currentStage":2}']) {
    const store=backend(); store.setItem(STUDENT_STORAGE_KEY,raw);
    const state=createStorageManager({customStorage:store}).loadProgress();
    assert.ok(state.currentStep>=1 && state.currentStep<=8);
    assert.ok(state.completedSteps.every(n=>n>=1 && n<=8));
  }
  const bad={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
  for (const options of [{customStorage:bad},{forceDisableStorage:true}]) {
    const manager=createStorageManager(options);
    manager.saveProgress(createStepState(6,[1,2,3,4,5],2));
    assert.equal(manager.loadProgress(2).currentStep,6);
    assert.equal(manager.isStorageAvailable,false);
  }
});
