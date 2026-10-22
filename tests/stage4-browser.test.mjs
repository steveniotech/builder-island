import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startStaticServer, launchChromeWithCDP } from './browser-support.mjs';
import { STAGE_4_STEPS, TURN_AXES, rotateWorld, orientationDistance, rotateVector } from '../src/model.js';

for(const offline of [false,true])for(const mobile of [false,true]){
 test(`Stage 4 native ${mobile?'touch/mobile viewport':'mouse/desktop'} ${offline?'file://':'HTTP'}: eight tasks, fixed world axes and navigation`,async()=>{
  const {server,baseUrl}=await startStaticServer();
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'builder-stage4-'));let chrome;
  try{
   chrome=await launchChromeWithCDP(profile);const {send,evaluate}=chrome;
   await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:mobile?844:800,deviceScaleFactor:1,mobile});
   if(mobile)await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   await send('Page.navigate',{url:(offline?pathToFileURL(path.resolve('Builder-Island-Student.html')).href:`${baseUrl}/index.html`)+'?mode=test'});
   const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('#student-box-b1')`))return;await new Promise(r=>setTimeout(r,20));}throw Error('not initialized');};await ready();
   const read=()=>evaluate(`JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'))`);
   const geometry=()=>evaluate(`JSON.stringify([...document.querySelectorAll('#student-box-b1 polygon')].map(p=>p.getAttribute('points')))`);
   const click=async selector=>{
    const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    assert.ok(p.x>=0 && p.x<=(mobile?390:1280) && p.y>=0 && p.y<=(mobile?844:800),`visible button ${selector}`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
   };
   const closeIntro=()=>click('#btn-start-turn');
   const disabled=()=>evaluate(`document.querySelector('#btn-next').disabled`);
   await click('#btn-stage-4');await closeIntro();
   assert.equal(await evaluate(`document.querySelector('#btn-prev').disabled`),true);
   const turn=async(action,degrees,{cancel=false,screenshot=false}={})=>{
    const before=await read(),beforeGeometry=await geometry();
    const p=await evaluate(`(()=>{const e=document.querySelector('.turn-handle[data-action="${action}"]'),r=e.getBoundingClientRect(),m=document.querySelector('#workspace-3d').getScreenCTM();const x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,a:m.a,d:m.d,hit:document.elementFromPoint(x,y)?.closest('[data-action]')?.dataset.action};})()`);
    assert.equal(p.hit,action,'native pointer must hit selected handle');
    const frames=Math.max(12,Math.ceil(Math.abs(degrees)/10));
    const point=i=>({x:p.x+(TURN_AXES[action].drag==='horizontal'?degrees*p.a*i/frames:0),y:p.y+(TURN_AXES[action].drag==='vertical'?-degrees*p.d*i/frames:0)});
    if(mobile)await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
    else await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:p.x,y:p.y});
    assert.equal(await geometry(),beforeGeometry,'pointer-down cannot jump orientation');
    assert.equal(await evaluate(`document.querySelector('#turn-axis-guide')?.dataset.worldAxis`),TURN_AXES[action].axis);
    assert.equal(await evaluate(`document.querySelectorAll('.active-turn').length`),1);
    assert.equal(await evaluate(`[...document.querySelectorAll('.turn-handle')].filter(e=>e.dataset.action!=='${action}').every(e=>Number(e.getAttribute('opacity'))<1)`),true);
    const fixedReference=await evaluate(`document.querySelector('#turn-axis-guide').innerHTML`);
    let lastBounds=await evaluate(`(()=>{const r=document.querySelector('#student-box-b1').getBoundingClientRect();return[r.left,r.top,r.right,r.bottom];})()`);
    for(let i=1;i<=frames && degrees!==0;i++){
     if(mobile)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(i)]});
     else await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...point(i)});
     const bounds=await evaluate(`(()=>{const r=document.querySelector('#student-box-b1').getBoundingClientRect();return[r.left,r.top,r.right,r.bottom];})()`);
     assert.equal(await evaluate(`document.querySelector('#turn-axis-guide').innerHTML`),fixedReference,'axis/ring stay fixed while the block turns');
     assert.ok(bounds.every(Number.isFinite));
     assert.ok(bounds.every((n,k)=>Math.abs(n-lastBounds[k])<40),'continuous drag has no sudden flip');lastBounds=bounds;
     if(screenshot && i===Math.floor(frames/2)){
      const png=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(os.tmpdir(),`builder-stage4-q${before.currentStep}-${mobile?'mobile':'desktop'}.png`),Buffer.from(png.data,'base64'));
     }
    }
    if(mobile)await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
    else await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point(degrees===0?0:frames)});
    const after=await read();
    assert.ok(orientationDistance(after.boxes[0].orientation,rotateWorld(before.boxes[0].orientation,TURN_AXES[action].axis,degrees))<0.02,'only the selected fixed world axis changes orientation');
    for(const key of ['x','y','z','length','width','height'])assert.equal(after.boxes[0][key],before.boxes[0][key]);
    assert.deepEqual(after.camera,before.camera,'camera is not the model rotation');
    const stopped=await geometry();await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:40,y:300});assert.equal(await geometry(),stopped,'release/cancel stops rotation');
    assert.equal(await evaluate(`document.querySelector('#turn-axis-guide')===null`),true);
   };
   for(let step=1;step<=8;step++){
    const cfg=STAGE_4_STEPS[step-1];
    assert.equal((await read()).currentStep,step);
    assert.equal(await disabled(),true);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.turn-handle')].map(e=>e.dataset.action).sort()`),[...cfg.allowedActions].sort());
    assert.equal(await evaluate(`document.querySelectorAll('.active-turn').length`),0);
    assert.equal(await evaluate(`document.querySelector('[data-action="lift"]')===null && document.querySelector('[data-action="scale"]')===null`),true);
    const layout=await evaluate(`(()=>{const handles=[...document.querySelectorAll('.turn-handle')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});const nav=['#btn-prev','#btn-next','#step-progress'].map(s=>document.querySelector(s).getBoundingClientRect());const obstacles=['#student-box-b1','.target-preview-card'].map(s=>document.querySelector(s).getBoundingClientRect());return{obstacles:obstacles.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),handles,nav:nav.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),width:innerWidth,height:innerHeight};})()`);
    for(const r of [...layout.handles,...layout.nav])assert.ok(r.left>=0 && r.right<=layout.width && r.top>=0 && r.bottom<=layout.height,'controls and navigation fit viewport');
    for(const a of layout.handles)for(const b of layout.obstacles)assert.ok(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top,'handles stay outside model and target preview');
    for(let i=0;i<layout.handles.length;i++)for(let j=i+1;j<layout.handles.length;j++){
     const a=layout.handles[i],b=layout.handles[j];assert.ok(a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top,'handle hit regions do not overlap');
    }
    await turn(cfg.allowedActions[0],0);assert.equal(await disabled(),true,'single click never rotates');
    if(step===1){
     // Cross 180 and 360 in native input; match by final orientation after extra turns.
     await turn('spin',170,{screenshot:true});assert.equal(await disabled(),true);
     await turn('spin',40);await turn('spin',-120);await turn('spin',360);
    }else{
     if(step===2 && mobile){await turn('spin',-30,{cancel:true});await turn('spin',30);}
     if(step===7){
      assert.equal(await evaluate(`document.querySelector('#hint-toast').classList.contains('hidden')`),true);
      await turn('spin',30);assert.equal(await disabled(),true);await turn('spin',-30);
      await click('#btn-hint');assert.match(await evaluate(`document.querySelector('#hint-toast').textContent`),/Tip Forward/);
     }
     if(step===8){
      await click('#btn-hint');assert.match(await evaluate(`document.querySelector('#hint-toast').textContent`),/front arrow.*top star/);
      await click('#btn-hint');assert.match(await evaluate(`document.querySelector('#hint-toast').textContent`),/Spin 90/);
      await turn('spin',90);await click('#btn-reset');assert.ok(orientationDistance((await read()).boxes[0].orientation,[1,0,0,0])<1e-5);
     }
     const solution=step===8 && mobile ? [['y',90],['z',90]] : cfg.solution;
     for(const [axis,angle] of solution){
      const action=Object.keys(TURN_AXES).find(key=>TURN_AXES[key].axis===axis);
      await turn(action,angle,{screenshot:[3,5,8].includes(step)});
     }
    }
    assert.equal(await disabled(),false,`Q${step} native drag must match`);
    assert.equal((await read()).currentStep,step,'no auto advance');
    const q=(await read()).boxes[0].orientation;
    const camera=(await read()).camera,yaw=camera.yaw*Math.PI/180,pitch=camera.pitch*Math.PI/180;
    const view=[Math.sin(yaw)*Math.cos(pitch),Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch)];
    const normals={top:[0,0,1],bottom:[0,0,-1],front:[0,1,0],back:[0,-1,0],right:[1,0,0],left:[-1,0,0]};
    const expectedFaces=Object.keys(normals).filter(face=>rotateVector(q,normals[face]).reduce((sum,n,i)=>sum+n*view[i],0)>0.00001).sort();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#student-box-b1 .oriented-face')].map(e=>e.dataset.face).sort()`),expectedFaces,'back-facing marks must not be drawn on visible faces');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#target-mini-svg .oriented-face')].map(e=>e.dataset.face).sort()`),expectedFaces,'target and model use the same reference view');
    if(step===1){
     await turn('spin',20);assert.equal(await disabled(),true);await turn('spin',-20);
     const saved=(await read()).boxes;
     await click('#btn-stage-3');await click('#btn-stage-4');await closeIntro();assert.deepEqual((await read()).boxes,saved);
     await send('Page.reload');await ready();await closeIntro();assert.deepEqual((await read()).boxes,saved);assert.equal(await disabled(),false);
    }
    if(step===4){
     await click('#btn-prev');assert.equal((await read()).currentStep,3);await turn('tip-forward',-90);await click('#btn-next');await turn('tip-forward',90);
    }
    await click('#btn-next');
   }
   assert.equal(await evaluate(`!document.querySelector('#modal-complete').classList.contains('hidden')`),true);
   assert.match(await evaluate(`document.querySelector('#modal-complete-title').textContent`),/Stage 4/);
   const legacy=(await read()).stages;
   await click('#btn-stage-select');assert.equal(await evaluate(`document.querySelectorAll('.stage-select-card').length`),4);
   await click('#card-select-stage-4');await closeIntro();await click('#btn-next');await click('#btn-replay-all');
   assert.equal((await read()).currentStep,1);assert.deepEqual((await read()).completedSteps,[]);
   for(const stage of ['1','2','3'])assert.deepEqual((await read()).stages[stage],legacy[stage]);
   assert.equal(await evaluate(`window.scrollX===0 && window.scrollY===0`),true);
   assert.deepEqual(chrome.consoleErrors,[]);assert.deepEqual(chrome.pageExceptions,[]);
  }finally{
   if(chrome){chrome.ws.close();chrome.proc.kill('SIGKILL');}
   await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
 });
}
