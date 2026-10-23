import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startStaticServer, launchChromeWithCDP } from './browser-support.mjs';
import { STAGE_5_STEPS, TURN_AXES, orientationDistance, rotateWorld } from '../src/model.js';

for(const offline of [false,true])for(const mobile of [false,true]){
 test(`Stage 5 native ${mobile?'touch/mobile viewport':'mouse/desktop'} ${offline?'file://':'HTTP'}: all three controls and twelve tasks`,async()=>{
  const {server,baseUrl}=await startStaticServer();
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'builder-stage5-'));let chrome;
  try{
   chrome=await launchChromeWithCDP(profile);const {send,evaluate}=chrome;
   await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:mobile?844:800,deviceScaleFactor:1,mobile});
   if(mobile)await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   await send('Page.navigate',{url:(offline?pathToFileURL(path.resolve('Builder-Island-Student.html')).href:`${baseUrl}/index.html`)+'?mode=test'});
   const ready=async()=>{for(let i=0;i<150;i++){if(await evaluate(`!!document.querySelector('#student-box-b1')`))return;await new Promise(r=>setTimeout(r,20));}throw Error('not initialized');};await ready();
   const read=()=>evaluate(`JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'))`);
   const geometry=()=>evaluate(`JSON.stringify([...document.querySelectorAll('#student-box-b1 polygon')].map(p=>p.getAttribute('points')))`);
   const disabled=()=>evaluate(`document.querySelector('#btn-next').disabled`);
   const click=async selector=>{
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:"nearest"})`);
    const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    assert.ok(p.x>=0 && p.x<=(mobile?390:1280) && p.y>=0 && p.y<=(mobile?844:800),`visible button ${selector}`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
    assert.equal(await evaluate(`document.elementFromPoint(${p.x},${p.y})?.closest('button')?.id`),selector.slice(1),`button hit ${selector}`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
   };
   const closeIntro=()=>click('#btn-start-turn');
   const turn=async(action,degrees,{cancel=false}={})=>{
    const before=await read(),beforeGeometry=await geometry();
    const p=await evaluate(`(()=>{const e=document.querySelector('.turn-handle[data-action="${action}"]'),r=e.getBoundingClientRect(),m=document.querySelector('#workspace-3d').getScreenCTM();const x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,a:m.a,d:m.d,hit:document.elementFromPoint(x,y)?.closest('[data-action]')?.dataset.action};})()`);
    assert.equal(p.hit,action,'native hit must select the intended handle');
    const frames=Math.max(4,Math.ceil(Math.abs(degrees)/10));
    const point=i=>({x:p.x+(TURN_AXES[action].drag==='horizontal'?degrees*p.a*i/frames:0),y:p.y+(TURN_AXES[action].drag==='vertical'?-degrees*p.d*i/frames:0)});
    if(mobile)await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
    else await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:p.x,y:p.y});
    assert.equal(await geometry(),beforeGeometry,'pointer-down never jumps the model');
    assert.equal(await evaluate(`document.querySelector('#turn-axis-guide').dataset.worldAxis`),TURN_AXES[action].axis);
    assert.equal(await evaluate(`document.querySelectorAll('.active-turn').length`),1);
    assert.equal(await evaluate(`[...document.querySelectorAll('.turn-handle')].filter(e=>e.dataset.action!=='${action}').every(e=>Number(e.getAttribute('opacity'))<1)`),true);
    for(let i=1;i<=frames && degrees!==0;i++){
     if(mobile)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(i)]});
     else await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...point(i)});
    }
    if(mobile)await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
    else await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point(degrees===0?0:frames)});
    const after=await read();
    assert.ok(orientationDistance(after.boxes[0].orientation,rotateWorld(before.boxes[0].orientation,TURN_AXES[action].axis,degrees))<.02,'drag changes only the selected fixed world axis');
    for(const key of ['x','y','z','length','width','height'])assert.equal(after.boxes[0][key],before.boxes[0][key]);
    assert.deepEqual(after.camera,before.camera);
    assert.equal(await evaluate(`document.querySelector('#turn-axis-guide')===null && document.querySelectorAll('.active-turn').length===0 && [...document.querySelectorAll('.turn-handle')].every(e=>e.getAttribute('opacity')==='1')`),true);
    const stopped=await geometry();await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:30,y:300});assert.equal(await geometry(),stopped,'release/cancel stops rotation');
   };
   await click('#btn-stage-5');await closeIntro();
   assert.equal(await evaluate(`document.querySelector('#btn-prev').disabled`),true);
   for(let step=1;step<=12;step++){
    const cfg=STAGE_5_STEPS[step-1];
    assert.equal((await read()).currentStage,5);assert.equal((await read()).currentStep,step);
    assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),`${step} / 12`);
    assert.equal(await disabled(),true);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.turn-handle')].map(e=>e.dataset.action).sort()`),Object.keys(TURN_AXES).sort());
    assert.equal(await evaluate(`document.querySelectorAll('.active-turn').length`),0);
    const layout=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};};return{width:innerWidth,height:innerHeight,handles:[...document.querySelectorAll('.turn-handle')].map(rect),obstacles:[rect(document.querySelector('#student-box-b1')),rect(document.querySelector('.target-preview-card'))],nav:['#btn-prev','#btn-next','#step-progress'].map(s=>rect(document.querySelector(s)))};})()`);
    const separate=(a,b)=>a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top;
    for(const r of [...layout.handles,...layout.nav])assert.ok(r.left>=0 && r.right<=layout.width && r.top>=0 && r.bottom<=layout.height,'controls fit the viewport');
    for(const a of layout.handles)for(const b of layout.obstacles)assert.ok(separate(a,b),'handles do not overlap model/target');
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(separate(layout.handles[i],layout.handles[j]),'handle hit regions do not overlap');
    await turn(Object.keys(TURN_AXES)[(step-1)%3],0);assert.equal(await disabled(),true,'click alone does not rotate');
    // Exercise ALL THREE icons on every task, correcting attempts manually, never by state writes.
    for(const action of Object.keys(TURN_AXES)){
     await turn(action,20,{cancel:mobile && step===2 && action==='spin'});assert.equal(await disabled(),true);
     if(action==='spin'){
      const before=await geometry(),q=(await read()).boxes[0].orientation;
      for(let level=1;level<=3;level++){
       await click('#btn-hint');const hint=await evaluate(`document.querySelector('#hint-toast').textContent`);
       if(level===1)assert.doesNotMatch(hint,/\b(?:Spin|Tip|[XYZ])\b/);
       if(level===2)assert.match(hint,/Spin|Tip/);
       if(level===3)assert.match(hint,/^From the start:.*Reset/);
       assert.equal(await geometry(),before,'Hint does not reset or rotate a scrambled model');
       assert.ok(orientationDistance((await read()).boxes[0].orientation,q)<1e-5);
      }
      await click('#btn-hint');assert.equal(await evaluate(`document.querySelector('#hint-toast').classList.contains('hidden')`),true);
     }
     await turn(action,-20);
    }
    if([1,7,10,12].includes(step)){
     const png=await send('Page.captureScreenshot',{format:'png'});
     fs.writeFileSync(path.join(os.tmpdir(),`builder-stage5-q${step}-${mobile?'mobile':'desktop'}.png`),Buffer.from(png.data,'base64'));
    }
    if(step===8){
     await turn('spin',30);const old=(await read()).stages;
     await click('#btn-reset');assert.ok(orientationDistance((await read()).boxes[0].orientation,[1,0,0,0])<1e-5);
     assert.equal((await read()).currentStep,8);assert.deepEqual((await read()).completedSteps,[1,2,3,4,5,6,7]);
     for(const stage of ['1','2','3','4'])assert.deepEqual((await read()).stages[stage],old[stage]);
    }
    if(step===10){
     await click('#btn-prev');assert.equal((await read()).currentStep,9);assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),'9 / 12');
     for(const [axis,angle]of STAGE_5_STEPS[8].solution)await turn(Object.keys(TURN_AXES).find(a=>TURN_AXES[a].axis===axis),angle);
     assert.equal(await disabled(),false);await click('#btn-next');assert.equal((await read()).currentStep,10);
    }
    if(step===11){
     await turn('tip-side',20);const saved=(await read()).boxes;
     await click('#btn-stage-4');await closeIntro();assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),'1 / 8');
     await click('#btn-stage-5');await closeIntro();assert.ok(orientationDistance((await read()).boxes[0].orientation,saved[0].orientation)<1e-5,'restored equivalent orientation');
     await send('Page.reload');await ready();await closeIntro();assert.equal((await read()).currentStep,11);assert.ok(orientationDistance((await read()).boxes[0].orientation,saved[0].orientation)<1e-5,'restored equivalent orientation');
     await turn('tip-side',-20);
    }
    for(const [axis,angle]of cfg.solution){
     await turn(Object.keys(TURN_AXES).find(a=>TURN_AXES[a].axis===axis),angle);
    }
    assert.equal(await disabled(),false,`Q${step} matches after actual native dragging`);
    assert.equal((await read()).currentStep,step,'matching never auto advances');
    await turn('spin',20);assert.equal(await disabled(),true,'turning away immediately re-disables Next');await turn('spin',-20);assert.equal(await disabled(),false);
    if(step===1){await turn('spin',180);await turn('spin',180);assert.equal(await disabled(),false,'extra turns are allowed');}
    await click('#btn-next');
   }
   assert.equal(await evaluate(`!document.querySelector('#modal-complete').classList.contains('hidden')`),true);
   assert.match(await evaluate(`document.querySelector('#modal-complete-title').textContent`),/Stage 5/);
   assert.equal(await evaluate(`document.querySelector('#skills-review-grid').children.length`),12);
   assert.equal(await evaluate(`document.querySelector('#modal-complete-skills-heading').textContent`),'Review My Skills (12 / 12)');
   assert.equal(await evaluate(`document.querySelector('#btn-replay-all').textContent`),'↺ Replay 1 / 12');
   const old=(await read()).stages;
   await click('#btn-stage-select');assert.deepEqual(chrome.pageExceptions,[]);assert.equal(await evaluate(`document.querySelectorAll('.stage-select-card').length`),6);
   assert.match(await evaluate(`document.querySelector('#stage-5-progress-summary').textContent`),/Step 12 \/ 12 \(12 done\)/);
   for(const stage of [1,2,3,4])assert.match(await evaluate(`document.querySelector('#stage-${stage}-progress-summary').textContent`),/\/ 8 /);
   await click('#card-select-stage-5');await closeIntro();await click('#btn-next');await click('#btn-replay-all');
   assert.equal((await read()).currentStep,1);assert.deepEqual((await read()).completedSteps,[]);
   for(const stage of ['1','2','3','4'])assert.deepEqual((await read()).stages[stage],old[stage]);
   assert.equal(await evaluate(`window.scrollX===0 && window.scrollY===0`),true);
   assert.deepEqual(chrome.consoleErrors,[]);assert.deepEqual(chrome.pageExceptions,[]);
  }finally{
   if(chrome){chrome.ws.close();chrome.proc.kill('SIGKILL');}
   await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
 });
}
