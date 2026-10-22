import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_4_STEPS, TURN_AXES, createStepState, updateBoxInState, evaluateStepMatch,
  rotateWorld, rotateVector, orientationDistance, getBoxVertices, setCameraInState } from '../src/model.js';
import { createStorageManager, STUDENT_STORAGE_KEY } from '../src/storage.js';
const identity=[1,0,0,0];
const close=(a,b)=>a.every((n,i)=>Math.abs(n-b[i])<1e-8);
const turn=(state,action,degrees)=>updateBoxInState(state,{turnAction:action,turnDegrees:degrees});

test('Stage 4 world-axis conventions: each ±90 turn and forward/side mappings',()=>{
 for(const axis of ['x','y','z'])for(const angle of [-90,90]){
  const q=rotateWorld(identity,axis,angle);
  assert.ok(orientationDistance(rotateWorld(q,axis,-angle),identity)<1e-5);
  assert.ok(orientationDistance(q,rotateWorld(identity,axis,angle+360))<1e-5);
 }
 assert.ok(close(rotateVector(rotateWorld(identity,'x',-90),[0,0,1]),[0,1,0]),'top goes toward FRONT +Y');
 assert.ok(close(rotateVector(rotateWorld(identity,'y',90),[0,0,1]),[1,0,0]),'top goes toward RIGHT +X');
 assert.ok(close(rotateVector(rotateWorld(identity,'z',90),[1,0,0]),[0,1,0]));
});
test('world-axis composition is ordered; equivalent paths and q / -q compare by final orientation',()=>{
 const q=rotateWorld(rotateWorld(identity,'z',90),'x',-90);
 assert.ok(close(rotateVector(q,[0,1,0]),[-1,0,0]));
 assert.ok(close(rotateVector(q,[0,0,1]),[0,1,0]));
 const reversed=rotateWorld(rotateWorld(identity,'x',-90),'z',90);
 assert.ok(orientationDistance(q,reversed)>90);
 const otherPath=rotateWorld(rotateWorld(identity,'y',90),'z',90);
 assert.ok(orientationDistance(q,otherPath)<1e-5);
 assert.ok(orientationDistance(q,q.map(n=>-n))<1e-5);
 let many=identity;
 for(let i=0;i<40;i++)many=rotateWorld(many,'x',9);
 assert.ok(orientationDistance(many,identity)<1e-5);
});
test('all eight tasks solve through allowed world turns, not action count or Euler fields',()=>{
 for(const cfg of STAGE_4_STEPS){
  let state=createStepState(cfg.step,[],4);
  assert.equal(evaluateStepMatch(state).matched,false);
  for(const [axis,angle] of cfg.solution){
   const action=Object.keys(TURN_AXES).find(key=>TURN_AXES[key].axis===axis);
   state=turn(state,action,angle+360);
  }
  assert.equal(evaluateStepMatch(state).matched,true,`Q${cfg.step}`);
  state=turn(state,cfg.allowedActions[0],30);
  assert.equal(evaluateStepMatch(state).matched,false);
  assert.ok(state.completedSteps.includes(cfg.step),'history never overrides current match');
 }
 let alternative=createStepState(8,[],4);
 alternative=turn(alternative,'tip-side',90);alternative=turn(alternative,'spin',90);
 assert.equal(evaluateStepMatch(alternative).matched,true,'different valid world-axis path accepted');
});
test('same bounds but different face orientation fails; angular tolerance is 6 degrees',()=>{
 const cfg=STAGE_4_STEPS[0];
 const target=cfg.targets[0], wrong={...target,orientation:rotateWorld(target.orientation,'z',180)};
 const bounds=b=>{const v=getBoxVertices(b);return[v.x0,v.x1,v.y0,v.y1,v.z0,v.z1];};
 assert.ok(close(bounds(target),bounds(wrong)));
 const state=createStepState(1,[],4);state.boxes=[wrong];
 assert.equal(evaluateStepMatch(state).matched,false);
 assert.equal(evaluateStepMatch(turn(createStepState(1,[],4),'spin',95)).matched,true);
 assert.equal(evaluateStepMatch(turn(createStepState(1,[],4),'spin',98)).matched,false);
});
test('center, dimensions, clearance, camera and disabled edits remain invariant through arbitrary rotation',()=>{
 let state=createStepState(8,[],4);const before=state.boxes[0];
 for(let n=0;n<100;n++){
  state=turn(state,['spin','tip-forward','tip-side'][n%3],17.3);
  const b=state.boxes[0];
  for(const key of ['x','y','z','length','width','height'])assert.equal(b[key],before[key]);
  assert.ok(getBoxVertices(b).z0>12,'fixed-center clearance, no automatic lift');
 }
 assert.deepEqual(updateBoxInState(state,{x:0,y:0,z:0,length:90,width:90,scale:9,rotation:90,orientation:identity}),state);
 assert.deepEqual(setCameraInState(state,{yaw:0,pitch:88}),state);
 assert.deepEqual(turn(createStepState(1,[],4),'tip-side',90),createStepState(1,[],4));
 for(const value of [NaN,Infinity])assert.deepEqual(turn(state,'spin',value),state);
});
test('v5 restores orientation only for Stage 4 and preserves earlier stages and old scalar rotation',()=>{
 const data=new Map(), backend={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const manager=createStorageManager({customStorage:backend});
 const earlier=[];
 for(const stage of [1,2,3]){
  const state=createStepState(stage===1?5:2,[1],stage);
  const updated=stage===1?updateBoxInState(state,{rotation:90}):stage===2?updateBoxInState(state,{rotation:180}):updateBoxInState(state,{scale:.73},false);
  earlier.push(updated);manager.saveProgress(updated);
 }
 let state=turn(turn(createStepState(8,[1,2,3],4),'spin',42),'tip-forward',-77);
 manager.saveProgress(state);
 assert.equal(JSON.parse(data.get(STUDENT_STORAGE_KEY)).version,5);
 const fresh=createStorageManager({customStorage:backend});
 assert.ok(orientationDistance(fresh.loadProgress(4).boxes[0].orientation,state.boxes[0].orientation)<1e-5);
 assert.deepEqual(fresh.loadProgress(4).completedSteps,[1,2,3]);
 for(const stage of [1,2,3])assert.deepEqual(fresh.loadProgress(stage).boxes,earlier[stage-1].boxes);
 for(const version of [3,4]){
  data.set(STUDENT_STORAGE_KEY,JSON.stringify({version,currentStage:1,currentStep:5,completedSteps:[1,2],box:{...createStepState(5).box,rotation:90}}));
  assert.equal(fresh.loadProgress(1).box.rotation,90);
  assert.deepEqual(fresh.loadProgress(4).completedSteps,[]);
 }
});
test('invalid or missing orientation schema restores safely, never reinterprets old scalar angles',()=>{
 const data=new Map(), backend={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const manager=createStorageManager({customStorage:backend});
 for(const saved of [{rotation:90},{orientationVersion:1,orientation:[0,0,0,0]},{orientationVersion:1,orientation:[1,2,'bad',4]},{orientationVersion:99,orientation:[0,1,0,0]}]){
  data.set(STUDENT_STORAGE_KEY,JSON.stringify({version:5,currentStage:4,stages:{4:{currentStep:1,boxes:[saved]}}}));
  assert.deepEqual(manager.loadProgress(4).boxes[0].orientation,identity);
 }
});

test('saving Stage 4 first migrates legacy v3/v4 snapshots without overwriting earlier progress',()=>{
 for(const version of [3,4]){
  const old=createStepState(5,[1,2,3,4],1);old.box.rotation=90;old.boxes[0].rotation=90;
  const payload=version===3?{...old,version:3}:{version:4,currentStage:1,stages:{1:old,2:createStepState(6,[1,2],2),3:createStepState(7,[1],3)}};
  const data=new Map([[STUDENT_STORAGE_KEY,JSON.stringify(payload)]]);
  const backend={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const manager=createStorageManager({customStorage:backend});
  manager.saveProgress(turn(createStepState(3,[],4),'tip-forward',-45));
  assert.equal(manager.loadProgress(1).box.rotation,90);
  assert.deepEqual(manager.loadProgress(1).completedSteps,[1,2,3,4]);
  if(version===4){assert.equal(manager.loadProgress(2).currentStep,6);assert.equal(manager.loadProgress(3).currentStep,7);}
  assert.ok(orientationDistance(manager.loadProgress(4).boxes[0].orientation,rotateWorld(identity,'x',-45))<1e-5);
 }
});
