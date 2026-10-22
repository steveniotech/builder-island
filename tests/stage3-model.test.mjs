import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_3_STEPS, SIZE_LIMITS, createStepState, updateBoxInState, evaluateStepMatch, setCameraInState } from '../src/model.js';
import { createStorageManager, STUDENT_STORAGE_KEY } from '../src/storage.js';
const dims = b => [b.length,b.width,b.height];
const center = b => [b.x+b.length/2,b.y+b.width/2];
const solve = (step, reverse=false) => {
  let state=createStepState(step,[],3);
  const cfg=STAGE_3_STEPS[step-1], target=cfg.targets[0];
  const changes={scale:target.length/cfg.initialBoxes[0].length,length:target.length,width:target.width,z:target.z};
  for(const action of reverse ? [...cfg.allowedActions].reverse() : cfg.allowedActions) state=updateBoxInState(state,{[action==='lift'?'z':action]:changes[action==='lift'?'z':action]});
  return state;
};
test('Stage 3: all 8 start unmatched, finish in either operation order, reject wrong dimensions/lift and invalidate historical matches',()=>{
  assert.equal(STAGE_3_STEPS.length,8);
  for(let step=1;step<=8;step++){
    assert.equal(evaluateStepMatch(createStepState(step,[],3)).matched,false);
    for(const reverse of [false,true]){
      const state=solve(step,reverse);
      assert.equal(evaluateStepMatch(state).matched,true,`step ${step}`);
      assert.ok(state.completedSteps.includes(step));
      for(const key of ['length','width','height','z']){
        const box={...state.boxes[0],[key]:state.boxes[0][key]+10};
        assert.equal(evaluateStepMatch({...state,boxes:[box]}).matched,false,`${step}: wrong ${key}`);
      }
      const action=STAGE_3_STEPS[step-1].allowedActions[0];
      const away=updateBoxInState(state,action==='scale'?{scale:0.7}:action==='lift'?{z:0}:{[action]:12},false);
      assert.equal(evaluateStepMatch(away).matched,false);
      assert.ok(away.completedSteps.includes(step));
    }
  }
});
test('proportional scale keeps exact ratios, bottom center and lift at arbitrary scales and limits',()=>{
  let state=updateBoxInState(createStepState(7,[],3),{z:13},false);
  const original=state.boxes[0];
  for(const factor of [1.2345,0,-3,100]){
    const b=updateBoxInState(state,{scale:factor},false).boxes[0];
    assert.ok(Math.abs(b.length/b.width-original.length/original.width)<1e-10);
    assert.ok(Math.abs(b.length/b.height-original.length/original.height)<1e-10);
    assert.deepEqual(center(b),center(original)); assert.equal(b.z,13);
    assert.ok(Math.min(...dims(b))>=SIZE_LIMITS.min);
    assert.ok(b.length<=80 && b.width<=60 && b.height<=SIZE_LIMITS.maxHeight);
  }
});
test('single-axis/lift edits, bounds and prohibited move/rotate/height/scale edits',()=>{
  let state=createStepState(8,[],3); const initial=state.boxes[0];
  state=updateBoxInState(state,{length:1000},false);
  assert.equal(state.box.length,80); assert.equal(state.box.width,initial.width); assert.equal(state.box.height,initial.height); assert.equal(state.box.z,0);
  state=updateBoxInState(state,{width:-100},false); assert.equal(state.box.width,6); assert.equal(state.box.length,80);
  const before=dims(state.box);
  state=updateBoxInState(state,{z:1000},false); assert.equal(state.box.z,SIZE_LIMITS.maxLift); assert.deepEqual(dims(state.box),before);
  state=updateBoxInState(state,{z:-100},false); assert.equal(state.box.z,0);
  const snapshot=state.box;
  state=updateBoxInState(state,{scale:3,height:99,rotation:90,x:0,y:0},false);
  assert.deepEqual(state.box,snapshot);
  for(const updates of [{length:NaN,width:Infinity,z:NaN},{scale:NaN}]) assert.deepEqual(updateBoxInState(state,updates,false).box,snapshot);
  assert.deepEqual(center(state.box),center(initial));
  const cam=setCameraInState(state,{yaw:0,pitch:45}); assert.deepEqual(cam.boxes,state.boxes);
});
test('v3/v4 existing saves cannot become Stage 3 completion; all stages persist independently and partial scale restores exactly',()=>{
  const data=new Map(); const backend={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  for(const version of [3,4]){
    data.set(STUDENT_STORAGE_KEY,JSON.stringify({...createStepState(8,[1,2,3,4,5,6,7,8],2),version}));
    const manager=createStorageManager({customStorage:backend});
    assert.deepEqual(manager.loadProgress(3).completedSteps,[]);
    for(const stage of [1,2])manager.saveProgress(createStepState(stage+1,[1],stage));
    const partial=updateBoxInState(updateBoxInState(createStepState(7,[1,2],3),{scale:1.2345},false),{z:13},false);
    manager.saveProgress(partial);
    const fresh=createStorageManager({customStorage:backend});
    assert.deepEqual(fresh.loadProgress(3).boxes,partial.boxes);
    assert.equal(fresh.loadProgress(1).currentStep,2); assert.equal(fresh.loadProgress(2).currentStep,3);
  }
});
