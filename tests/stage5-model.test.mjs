import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_5_STEPS, TURN_AXES, createStepState, getStepConfig, getStageStepCount,
  rotateWorld, orientationDistance, updateBoxInState, evaluateStepMatch, setCameraInState } from '../src/model.js';
import { createStorageManager, STUDENT_STORAGE_KEY } from '../src/storage.js';
const pose=solution=>solution.reduce((q,[axis,degrees])=>rotateWorld(q,axis,degrees),[1,0,0,0]);
const actionFor=axis=>Object.keys(TURN_AXES).find(action=>TURN_AXES[action].axis===axis);
const turn=(state,axis,angle)=>updateBoxInState(state,{turnAction:actionFor(axis),turnDegrees:angle});
const backing=()=>{const data=new Map();return{data,getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};

test('Stage 5 has twelve exact prompts, all three original controls, and stage-specific task counts',()=>{
 const expected=['Choose an arrow. Match the target.','Look at the top mark. Turn to match.','Match the front and top marks.','Which arrow will help?','Turn the block to match the target.','Look closely. Match the direction.','Use two turns to match.','Watch where the top mark goes.','Match all the visible marks.','Look again. The target is different.','Keep turning until the marks match.','Final challenge! Match the whole block.'];
 assert.equal(STAGE_5_STEPS.length,12);assert.equal(getStageStepCount(5),12);
 for(const stage of [1,2,3,4])assert.equal(getStageStepCount(stage),8);
 for(const [i,cfg] of STAGE_5_STEPS.entries()){
  assert.equal(cfg.stage,5);assert.equal(cfg.step,i+1);assert.equal(cfg.instruction,expected[i]);
  assert.deepEqual(cfg.allowedActions,Object.keys(TURN_AXES));
  assert.deepEqual(cfg.initialBoxes[0].orientation,[1,0,0,0]);
  for(const key of ['x','y','z','length','width','height'])assert.equal(cfg.initialBoxes[0][key],getStepConfig(1,4).initialBoxes[0][key]);
  assert.equal(evaluateStepMatch(createStepState(i+1,[],5)).matched,false);
 }
 assert.equal(getStepConfig(13,5).step,12);assert.equal(getStepConfig(12,4).step,8);
});
test('all final targets are distinct; original Q9/Q12 duplicates are minimally corrected',()=>{
 const targets=STAGE_5_STEPS.map(cfg=>cfg.targets[0].orientation);
 for(let i=0;i<targets.length;i++)for(let j=0;j<i;j++)assert.ok(orientationDistance(targets[i],targets[j])>6,`Q${i+1} vs Q${j+1}`);
 assert.ok(orientationDistance(pose([['y',90],['z',-90]]),targets[6])<1e-5,'original Q9 duplicated Q7');
 assert.ok(orientationDistance(pose([['x',90],['y',90],['z',90]]),targets[2])<1e-5,'original Q12 collapsed to Q3');
 assert.deepEqual(STAGE_5_STEPS[8].solution,[['y',90],['z',90]]);
 assert.deepEqual(STAGE_5_STEPS[11].solution,[['x',90],['y',90],['z',-90]]);
 assert.ok(orientationDistance(targets[6],targets[9])>6,'Q7 and Q10 demonstrate different order');
 // A quaternion for any single coordinate-axis rotation has at most one nonzero vector component.
 assert.ok(targets[11].slice(1).filter(n=>Math.abs(n)>1e-8).length>1);
 for(const axis of ['x','y','z'])for(const angle of [0,90,-90,180])assert.ok(orientationDistance(targets[11],pose([[axis,angle]]))>6);
});
test('reference solutions, equivalent representations and extra adjustments pass by final orientation only',()=>{
 for(const cfg of STAGE_5_STEPS){
  assert.ok(orientationDistance(pose(cfg.solution),cfg.targets[0].orientation)<1e-5);
  let state=createStepState(cfg.step,[],5);
  for(const [axis,angle] of cfg.solution){state=turn(state,axis,angle-360);}
  assert.equal(evaluateStepMatch(state).matched,true,`Q${cfg.step}`);
  const signed={...state,boxes:[{...state.boxes[0],orientation:state.boxes[0].orientation.map(n=>-n)}]};
  assert.equal(evaluateStepMatch(signed).matched,true);
  state=turn(state,'z',180);assert.equal(evaluateStepMatch(state).matched,false,'wrong marked face orientation must fail');
  assert.ok(state.completedSteps.includes(cfg.step));state=turn(state,'z',180);assert.equal(evaluateStepMatch(state).matched,true);
 }
});
test('Stage 5 shares fixed center, fixed camera and unavailable-edit blocking with Stage 4',()=>{
 let state=createStepState(12,[],5),initial=state.boxes[0];
 for(const axis of ['x','y','z'])state=turn(state,axis,37);
 for(const key of ['x','y','z','length','width','height'])assert.equal(state.boxes[0][key],initial[key]);
 assert.deepEqual(setCameraInState(state,{yaw:-80,pitch:80}),state);
 assert.deepEqual(updateBoxInState(state,{scale:3,z:0,x:0,height:99,rotation:90}),state);
});
test('Hint layers start with observation and label every reference as From the start',()=>{
 for(const cfg of STAGE_5_STEPS){
  assert.equal(cfg.hintLevels.length,3);
  assert.doesNotMatch(cfg.instruction,/\b(?:Spin|Tip|[XYZ])\b/);
  assert.doesNotMatch(cfg.hintLevels[0],/\b(?:Spin|Tip|[XYZ])\b/);
  assert.match(cfg.hintLevels[1],/Spin|Tip Forward|Tip Sideways/);
  assert.match(cfg.hintLevels[2],/^From the start:/);assert.match(cfg.hintLevels[2],/may click Reset/);
 }
});
test('all twelve task numbers/completion records restore without truncation or cross-stage contamination',()=>{
 const store=backing(),manager=createStorageManager({customStorage:store});
 for(const stage of [1,2,3,4])manager.saveProgress(createStepState(8,[1,2,3,4,5,6,7],stage));
 for(let step=1;step<=12;step++){
  const state=turn(createStepState(step,Array.from({length:step},(_,i)=>i+1),5),'x',23);
  manager.saveProgress(state);
  const fresh=createStorageManager({customStorage:store}),loaded=fresh.loadProgress(5);
  assert.equal(loaded.currentStep,step);assert.deepEqual(loaded.completedSteps,state.completedSteps);
  assert.ok(orientationDistance(loaded.boxes[0].orientation,state.boxes[0].orientation)<1e-5);
  for(const stage of [1,2,3,4])assert.equal(fresh.loadProgress(stage).currentStep,8);
 }
 const raw=JSON.parse(store.getItem(STUDENT_STORAGE_KEY));
 for(const stage of [1,2,3,4,5])raw.stages[stage]={...raw.stages[stage],currentStep:99,completedSteps:[1,8,9,11,12,13]};
 store.setItem(STUDENT_STORAGE_KEY,JSON.stringify(raw));
 assert.equal(manager.loadProgress(5).currentStep,12);assert.deepEqual(manager.loadProgress(5).completedSteps,[1,8,9,11,12]);
 for(const stage of [1,2,3,4]){assert.equal(manager.loadProgress(stage).currentStep,8);assert.deepEqual(manager.loadProgress(stage).completedSteps,[1,8]);}
});
test('v3/v4/v5 saves retain original stage meanings when Stage 5 is saved first',()=>{
 for(const version of [3,4,5]){
  const store=backing(),old=createStepState(5,[1,2],1);old.box.rotation=90;old.boxes[0].rotation=90;
  const payload=version===3?{...old,version}:{version,currentStage:1,stages:{1:old,4:createStepState(7,[1,2,3],4)}};
  store.setItem(STUDENT_STORAGE_KEY,JSON.stringify(payload));
  const manager=createStorageManager({customStorage:store});
  assert.equal(manager.loadProgress(5).currentStep,1);assert.deepEqual(manager.loadProgress(5).completedSteps,[]);
  manager.saveProgress(turn(createStepState(12,[1,2,3,10,11],5),'y',33));
  const fresh=createStorageManager({customStorage:store});
  assert.equal(fresh.loadProgress(5).currentStep,12);assert.equal(fresh.loadProgress(1).box.rotation,90);
  assert.deepEqual(fresh.loadProgress(1).completedSteps,[1,2]);
  if(version===5)assert.equal(fresh.loadProgress(4).currentStep,7);
 }
});
