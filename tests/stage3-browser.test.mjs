import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startStaticServer, launchChromeWithCDP } from './browser-support.mjs';
import { STAGE_3_STEPS } from '../src/model.js';

for (const offline of [false,true]) for (const mobile of [false,true]) {
 test(`Stage 3 native ${mobile?'touch / mobile viewport':'mouse / desktop'}: ${offline?'file:// offline':'HTTP online'}, 8 tasks and saved progress`, async()=>{
  const {server,baseUrl}=await startStaticServer();
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'builder-stage3-'));
  let chrome;
  try {
   chrome=await launchChromeWithCDP(profile);
   const {send,evaluate}=chrome;
   await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:mobile?844:800,deviceScaleFactor:1,mobile});
   if(mobile)await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   const url=(offline?pathToFileURL(path.resolve('Builder-Island-Student.html')).href:`${baseUrl}/index.html`)+'?mode=test';
   await send('Page.navigate',{url});
   const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('#student-box-b1')`))return; await new Promise(r=>setTimeout(r,20));}throw Error('Page did not initialize');};
   await ready();
   const read=()=>evaluate(`JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'))`);
   const click=async selector=>{
    const pt=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pt});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pt});
   };
   const drag=async(action,dx,dy,{cancel=false,clickOnly=false}={})=>{
    const pt=await evaluate(`(()=>{const e=document.querySelector('.handle-node[data-action="${action}"]');if(!e)throw Error('Missing ${action} handle');const r=e.getBoundingClientRect();const m=document.querySelector('#workspace-3d').getScreenCTM();const x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,a:m.a,d:m.d,hit:document.elementFromPoint(x,y)?.closest('[data-action]')?.dataset.action};})()`);
    assert.equal(pt.hit,action,`handle ${action} must be hit-testable`);
    const before = (await read()).boxes[0];
    const beforeCam = (await read()).camera;
    const beforeText=await evaluate(`document.querySelector('#workspace-3d').textContent`);
    const point=(i)=>({x:pt.x+dx*pt.a*i/12,y:pt.y+dy*pt.d*i/12});
    const checkCorner=async()=>{
      const geometry=await evaluate(`(()=>{
        const handle=document.querySelector('[data-action="scale"]');if(!handle)return null;
        const r=handle.getBoundingClientRect(), x=r.x+r.width/2,y=r.y+r.height/2;
        const polygons=[...document.querySelectorAll('#student-box-b1 polygon')];
        const vertices=polygons.flatMap(p=>{const m=p.getScreenCTM();return [...p.points].map(v=>({x:m.a*v.x+m.c*v.y+m.e,y:m.b*v.x+m.d*v.y+m.f}));});
        return {distance:Math.min(...vertices.map(v=>Math.hypot(v.x-x,v.y-y))),y,maxY:Math.max(...vertices.map(v=>v.y))};
      })()`);
      if(geometry){assert.ok(geometry.distance<0.2,'scale handle stays on an actual projected vertex');assert.ok(Math.abs(geometry.y-geometry.maxY)<0.2,'scale handle is on the visible bottom corner');}
    };
    await checkCorner();
    if(mobile){
     await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pt.x,y:pt.y}]});
     assert.equal(await evaluate(`document.querySelector('#workspace-3d').textContent`),beforeText,'press does not jump');
     if(!clickOnly)for(let i=1;i<=12;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(i)]});await checkCorner();}
     await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
    }else{
     await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:pt.x,y:pt.y});
     assert.equal(await evaluate(`document.querySelector('#workspace-3d').textContent`),beforeText,'press does not jump');
     if(!clickOnly)for(let i=1;i<=12;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...point(i)});await checkCorner();}
     if(cancel)await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point(12)});
     else await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point(clickOnly?0:12)});
    }
    const after = (await read()).boxes[0];
    assert.deepEqual((await read()).camera,beforeCam,'control drag never orbits');
    assert.equal(after.rotation,before.rotation);
    assert.ok(Math.abs((after.x+after.length/2)-(before.x+before.length/2))<1e-9);
    assert.ok(Math.abs((after.y+after.width/2)-(before.y+before.width/2))<1e-9);
    if(action==='scale'){
      assert.ok(Math.abs(after.length/after.width-before.length/before.width)<1e-9);
      assert.ok(Math.abs(after.length/after.height-before.length/before.height)<1e-9);
      assert.equal(after.z,before.z);
    }
    if(action==='length'){assert.equal(after.width,before.width);assert.equal(after.height,before.height);assert.equal(after.z,before.z);}
    if(action==='width'){assert.equal(after.length,before.length);assert.equal(after.height,before.height);assert.equal(after.z,before.z);}
    if(action==='lift')for(const k of ['length','width','height'])assert.equal(after[k],before[k]);
   };
   const scaleDrag=async delta=>{
     const state=await read(), initial=STAGE_3_STEPS[state.currentStep-1].initialBoxes[0];
     const yaw=state.camera.yaw*Math.PI/180, pitch=state.camera.pitch*Math.PI/180;
     const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({
       x:(x*initial.length/2*Math.cos(yaw)-y*initial.width/2*Math.sin(yaw))*5.6,
       y:(x*initial.length/2*Math.sin(yaw)+y*initial.width/2*Math.cos(yaw))*Math.sin(pitch)*5.6
     })).sort((a,b)=>b.y-a.y || b.x-a.x);
     await drag('scale',corners[0].x*delta,corners[0].y*delta);
   };
   const disabled=()=>evaluate(`document.querySelector('#btn-next').disabled`);
   await click('#btn-stage-3');
   assert.equal(await evaluate(`['#current-stage-name','#step-progress','#btn-prev','#btn-reset','#btn-hint','#btn-next'].every(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight;})`),true,'stage labels and navigation fit viewport');
   assert.equal((await read()).currentStage,3);
   assert.equal(await evaluate(`document.querySelector('#btn-prev').disabled`),true);
   await click('#btn-hint');
   assert.equal(await evaluate(`document.querySelector('#hint-toast').textContent.trim()`),'Make the whole block bigger.');
   for(let step=1;step<=8;step++){
    const cfg=STAGE_3_STEPS[step-1];
    assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),`${step} / 8`);
    assert.equal(await disabled(),true);
    assert.deepEqual(await evaluate(`[...new Set([...document.querySelectorAll('.handle-node')].map(e=>e.dataset.action))].sort()`),[...cfg.allowedActions].sort());
    if(step===7 || step===8){
      const screenshot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(os.tmpdir(),`builder-stage3-q${step}-${mobile?'mobile':'desktop'}.png`),Buffer.from(screenshot.data,'base64'));
    }
    assert.equal(await evaluate(`['length','width'].every(action=>{const h=document.querySelector('.handle-node[data-action="'+action+'"]');return !h || h.getAttribute('fill')==='#0f172a';})`),true,'Stage 3 axis handles are black');
    const handles = await evaluate(`[...document.querySelectorAll('.handle-node')].filter(e=>!e.parentElement.closest('.handle-node')).map(e=>{const r=e.getBoundingClientRect();return {action:e.dataset.action,x:r.x,y:r.y,w:r.width,h:r.height};})`);
    for(const h of handles){assert.ok(h.w>=43.9 && h.h>=43.9,`${h.action} touch target >=44px`);}
    for(let i=0;i<handles.length;i++)for(let j=i+1;j<handles.length;j++){
      const a=handles[i],b=handles[j];
      assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y,'permitted control hit regions do not overlap');
    }
    const snapshot=(await read()).boxes;
    await drag(cfg.allowedActions[0],0,0,{clickOnly:true});
    assert.deepEqual((await read()).boxes,snapshot,'single click must not resize/lift');
    if(step===1){
      await scaleDrag(3);
      assert.equal((await read()).boxes[0].height,30,'uniform scale upper bound');
      await scaleDrag(-4);
      assert.equal((await read()).boxes[0].height,6,'uniform scale lower bound');
      await click('#btn-reset');
    }
    const solve=async(reverse=false)=>{
     const state=await read(), b=state.boxes[0],t=cfg.targets[0];
     const yaw=state.camera.yaw*Math.PI/180,pitch=state.camera.pitch*Math.PI/180;
     for(const action of reverse?[...cfg.allowedActions].reverse():cfg.allowedActions){
      if(action==='scale') await scaleDrag(t.length/cfg.initialBoxes[0].length-b.length/cfg.initialBoxes[0].length);
      if(action==='length'){const delta=(t.length-b.length)/2;await drag(action,delta*Math.cos(yaw)*5.6,delta*Math.sin(yaw)*Math.sin(pitch)*5.6);}
      if(action==='width'){const delta=(t.width-b.width)/2;await drag(action,-delta*Math.sin(yaw)*5.6,delta*Math.cos(yaw)*Math.sin(pitch)*5.6);}
      if(action==='lift')await drag(action,0,-(t.z-b.z)*5.6*Math.max(0.25,Math.cos(pitch)));
     }
    };
    if(step===7 || step===8){
     // A correct lift alone must not pass while the dimensions remain wrong.
     await drag('lift',0,-cfg.targets[0].z*5.6*Math.cos(28*Math.PI/180));
     assert.equal(await disabled(),true);
     if(step===8)await click('#btn-reset');
    }
    await solve(step%2===1);
    assert.equal(await disabled(),false,`step ${step} must complete through native drag`);
    const solved=await read();
    assert.equal(solved.currentStep,step,'no automatic advance');
    for(const key of ['length','width','height','z'])assert.ok(Math.abs(solved.boxes[0][key]-cfg.targets[0][key])<=2.5,`${step} ${key}`);
    if(step===1){
     await scaleDrag(-0.5);
     assert.equal(await disabled(),true,'moving away re-disables Next');
     await solve();
     await click('#btn-stage-2'); await click('#btn-stage-3');
     assert.equal(await disabled(),false);
     await send('Page.reload');await ready();
     assert.equal((await read()).currentStage,3); assert.equal(await disabled(),false);
    }
    if(step===5){
     await click('#btn-reset');assert.equal(await disabled(),true);assert.deepEqual((await read()).boxes,cfg.initialBoxes);
     await solve();
     await click('#btn-prev');assert.equal((await read()).currentStep,4);
     // Back resets the previous task; solve it through its width handle again.
     await drag('width',-(-18/2)*Math.sin(38*Math.PI/180)*5.6,(-18/2)*Math.cos(38*Math.PI/180)*Math.sin(28*Math.PI/180)*5.6);
     await click('#btn-next'); await solve();
    }
    if(step===6){
     const dims=(await read()).boxes[0];
     await drag('lift',0,1000,{cancel:mobile});
     assert.equal((await read()).boxes[0].z,0,'cannot lower below ground');
     assert.equal((await read()).boxes[0].height,dims.height);
     const stopped=(await read()).boxes;
     await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:200,y:300});
     assert.deepEqual((await read()).boxes,stopped,'release/cancel ends drag');
     assert.equal(await disabled(),true);await solve();
    }
    await click('#btn-next');
   }
   assert.equal(await evaluate(`!document.querySelector('#modal-complete').classList.contains('hidden')`),true);
   assert.match(await evaluate(`document.querySelector('#modal-complete-title').textContent`),/Stage 3/);
   await click('#btn-stage-select');
   assert.equal(await evaluate(`!document.querySelector('#modal-stages').classList.contains('hidden')`),true);
   assert.equal(await evaluate(`document.querySelectorAll('.stage-select-card').length`),4);
   await click('#card-select-stage-1');
   const beforeReplay=(await read()).stages;
   assert.equal((await read()).currentStage,1);
   await click('#btn-stage-3');
   assert.equal((await read()).currentStep,8);
   assert.equal(await disabled(),false);
   await click('#btn-next');await click('#btn-replay-all');
   assert.equal((await read()).currentStep,1);
   assert.deepEqual((await read()).completedSteps,[]);
   for(const stage of ['1','2'])assert.deepEqual((await read()).stages[stage],beforeReplay[stage]);
   assert.equal(await evaluate('window.scrollX'),0);
   assert.deepEqual(chrome.consoleErrors,[]); assert.deepEqual(chrome.pageExceptions,[]);
  } finally {
   if(chrome){chrome.ws.close();chrome.proc.kill('SIGKILL');}
   await new Promise(resolve=>server.close(resolve));
   fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
 });
}
