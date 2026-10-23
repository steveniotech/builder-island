import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startStaticServer,launchChromeWithCDP} from './browser-support.mjs';
import {STAGE_6_STEPS,ALIGN_AXES} from '../src/model.js';
const layoutRegression=process.env.ALIGN_LAYOUT_REGRESSION==='1';
const profiles=layoutRegression?
 [{width:636,height:580,mobile:false,dpr:2},{width:390,height:844,mobile:true},{width:1024,height:600,mobile:false},{width:844,height:390,mobile:true}]:
 [{width:1280,height:900,mobile:false},{width:390,height:844,mobile:true}];
for(const offline of [false,true])for(const {width,height,mobile,dpr=1} of profiles)test(`Stage 6 native ${mobile?'touch/mobile viewport':'mouse/desktop'} ${width}x${height} ${offline?'file://':'HTTP'}: 9 Align tasks`,async()=>{
 const {server,baseUrl}=await startStaticServer(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'builder-stage6-'));let chrome;
 try{
  chrome=await launchChromeWithCDP(profile);const {send,evaluate}=chrome;
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile});
  if(mobile)await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await send('Page.navigate',{url:(offline?pathToFileURL(path.resolve('Builder-Island-Student.html')).href:`${baseUrl}/index.html`)+'?mode=test'});
  const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('#student-box-b1')`))return;await new Promise(r=>setTimeout(r,20));}throw Error('not initialized');};await ready();
  const read=()=>evaluate(`JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'))`);
  const disabled=()=>evaluate(`document.querySelector('#btn-next').disabled`);
  const click=async selector=>{
   // Wait for the actual target bounds to settle after responsive/header transitions.
   // Native input still performs the action; this never writes app state.
   let p,previous,stable=0;
   for(let n=0;n<30;n++){
    p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing target '+${JSON.stringify(selector)});e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})()`);
    stable=previous&&['x','y','w','h'].every(k=>Math.abs(p[k]-previous[k])<.05)?stable+1:0;
    if(stable>=2)break;previous=p;await new Promise(r=>setTimeout(r,20));
   }
   p={x:p.x,y:p.y};
   assert.ok(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height,`visible ${selector}`);
   assert.equal(await evaluate(`!!document.elementFromPoint(${p.x},${p.y})?.closest(${JSON.stringify(selector)})`),true,`hit ${selector}`);
   if(mobile){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await new Promise(r=>setTimeout(r,30));}
   else {await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
  };
  const dot=(a,m)=>`.align-dot[data-axis="${a}"][data-mode="${m}"] .align-hit`;
  const choose=id=>click(`[data-align-box="${id}"]`);
  const prepare=async step=>{
   if(step>=4){await click('#btn-align');const b=(await read()).boxes;
    await choose('b2');assert.match((await read()).align.feedback,/Use A/);assert.deepEqual((await read()).boxes,b);assert.equal(await disabled(),true);
    await choose('b1');assert.deepEqual((await read()).boxes,b);
   }
  };
  const solve=async step=>{for(const [a,m]of STAGE_6_STEPS[step-1].requirements)await click(dot(a,m));};
  await click('#btn-stage-6');await click('#btn-close-align-intro');assert.equal(await evaluate(`document.querySelector('#btn-prev').disabled`),true);
  for(let step=1;step<=STAGE_6_STEPS.length;step++){
   const cfg=STAGE_6_STEPS[step-1],presentedAxes=cfg.axes;assert.equal((await read()).currentStep,step);assert.equal((await read()).currentStage,6);assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),`${step} / 9`);assert.equal(await disabled(),true);
   await prepare(step);
   assert.equal(await evaluate(`document.querySelectorAll('.align-dot').length`),presentedAxes.length*3);
   assert.equal(await evaluate(`document.querySelectorAll('.handle-node,.turn-handle').length`),0);
   const rects=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return{dots:[...document.querySelectorAll('.align-hit')].map(rect),nav:['#btn-prev','#btn-next'].map(s=>rect(document.querySelector(s))),boxes:[...document.querySelectorAll('.student-box-item')].map(rect),target:rect(document.querySelector('.target-preview-card'))};})()`);
   const apart=(a,b)=>a.right<=b.left+.1||b.right<=a.left+.1||a.bottom<=b.top+.1||b.bottom<=a.top+.1;
   for(let i=0;i<rects.dots.length;i++){const r=rects.dots[i];assert.ok(r.width>=43.9&&r.height>=43.9,'44px touch hit area');assert.ok(r.left>=0&&r.right<=width&&r.top>=0&&r.bottom<=height,`Q${step} dot ${i} stays visible ${JSON.stringify(r)}`);for(const other of [...rects.dots.slice(i+1),...rects.boxes,rects.target])assert.ok(apart(r,other),`Q${step} dot ${i} overlap ${JSON.stringify({r,other})}`);}
   for(const r of rects.nav)assert.ok(r.top>=0&&r.bottom<=height);
   if(layoutRegression&&!offline&&width===636&&step===9){
    const saved=await read();
    for(const [w,h,compact] of [[390,844,false],[636,580,true]]){
     await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:dpr,mobile});
     for(let n=0;n<100;n++){if(await evaluate(`document.body.classList.contains('align-compact')===${compact}`))break;await new Promise(r=>setTimeout(r,10));}
     assert.equal(await evaluate(`document.querySelectorAll('.align-dot').length`),3,'one live three-option group after resize');
     const hits=await evaluate(`Array.from(document.querySelectorAll('.align-hit'),e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};})`);
     for(let i=0;i<hits.length;i++){const r=hits[i];assert.ok(r.width>=43.9&&r.height>=43.9&&r.left>=0&&r.right<=w&&r.top>=0&&r.bottom<=h);for(const b of hits.slice(i+1))assert.ok(apart(r,b));}
     assert.deepEqual((await read()).boxes,saved.boxes);assert.equal((await read()).align.referenceId,saved.align.referenceId);
    }
    await click(dot('z','max'));assert.deepEqual((await read()).boxes,cfg.targets);await click('#btn-undo-align');assert.deepEqual((await read()).boxes,saved.boxes);
   }
   const start=await read();
   // Hover preview is read-only: no geometry, storage, or Next mutation.
   if(!mobile){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(dot(...cfg.requirements[0]))});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);const raw=await evaluate(`localStorage.getItem('builder-island.isolated-test.v1')`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});assert.equal(await evaluate(`localStorage.getItem('builder-island.isolated-test.v1')`),raw);assert.deepEqual((await read()).boxes,start.boxes);assert.equal(await disabled(),true);assert.ok(await evaluate(`document.querySelector('#align-preview').children.length>0`));await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:10});}
   // Every visible option is physically tapped/clicked, then locally undone.
   for(const a of presentedAxes)for(const m of ['min','center','max']){
    await click(dot(a,m));const s=await read();assert.deepEqual(s.boxes[0],start.boxes[0],'reference never moves');
    for(let i=1;i<s.boxes.length;i++){
     for(const k of ['x','y','z','length','width','height','rotation'].filter(k=>k!==a))assert.equal(s.boxes[i][k],start.boxes[i][k]);
     const fraction=m==='min'?0:m==='center'?.5:1,size=ALIGN_AXES[a].size;
     assert.equal(s.boxes[i][a],start.boxes[0][a]+fraction*(start.boxes[0][size]-start.boxes[i][size]),`native hit selects ${a}:${m}`);
    }
    assert.ok(s.align.operations.includes(`${a}:${m}`));
    if(!cfg.requirements.some(([axis,mode])=>axis===a&&mode===m))assert.equal(await disabled(),true,'wrong point cannot pass');
    await click('#btn-undo-align');assert.deepEqual((await read()).boxes,start.boxes);assert.equal(await disabled(),true);
   }
   const [hintAxis,hintMode]=cfg.requirements[0];
   await click(dot(hintAxis,['min','center','max'].find(m=>m!==hintMode)));
   const hintStart=(await read()).boxes;
   for(let n=0;n<4;n++){await click('#btn-hint');if(n<3)assert.equal(await evaluate(`document.querySelector('#hint-toast').textContent`),cfg.hintLevels[n]);assert.deepEqual((await read()).boxes,hintStart);}
   await click('#btn-undo-align');
   if(step===5){const saved=(await read()).align;await send('Page.reload');await ready();await click('#btn-close-align-intro');assert.deepEqual((await read()).align.selectedIds,saved.selectedIds);assert.equal((await read()).align.referenceId,saved.referenceId);}
   if(step===7){await click(dot('z','center'));await click('#btn-reset');assert.deepEqual((await read()).boxes,cfg.initialBoxes);assert.deepEqual((await read()).align.selectedIds,['b1','b2']);assert.equal((await read()).align.referenceId,null);await prepare(step);}
   await solve(step);assert.equal(await disabled(),false,`Q${step} solved by native clicks`);assert.deepEqual((await read()).boxes,cfg.targets);assert.equal((await read()).currentStep,step);
   const completed=(await read()).completedSteps;await click('#btn-undo-align');assert.equal(await disabled(),true,'Undo updates live Next despite history');assert.deepEqual((await read()).completedSteps,completed);await click(dot(...cfg.requirements.at(-1)));assert.equal(await disabled(),false);
   // Re-clicking a point is stable; preview cannot change the saved orientation/positions.
   const stable=(await read()).boxes;await click(dot(...cfg.requirements.at(-1)));assert.deepEqual((await read()).boxes,stable);
   if([1,2,9].includes(step)){const png=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),`builder-stage6-q${step}-${mobile?'mobile':'desktop'}.png`),Buffer.from(png.data,'base64'));}
   if(step===8){const saved=(await read()).boxes,others=(await read()).stages;await click('#btn-stage-5');await click('#btn-start-turn');assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),'1 / 12');await click('#btn-stage-6');await click('#btn-close-align-intro');assert.deepEqual((await read()).boxes,saved);assert.deepEqual((await read()).stages['1'],others['1']);}
   if(step===9){await click('#btn-prev');assert.equal((await read()).currentStep,8);await prepare(8);await solve(8);await click('#btn-next');assert.equal((await read()).currentStep,9);await prepare(9);await solve(9);}
   await click('#btn-next');
  }
  assert.match(await evaluate(`document.querySelector('#modal-complete-title').textContent`),/Stage 6/);assert.equal(await evaluate(`document.querySelector('#skills-review-grid').children.length`),9);
  const old=(await read()).stages;
  await click('#btn-stage-select');assert.match(await evaluate(`document.querySelector('#stage-6-progress-summary').textContent`),/9 \/ 9 \(9 done\)/);assert.equal(await evaluate(`document.querySelectorAll('.stage-select-card').length`),6);
  await click('#card-select-stage-6');await click('#btn-close-align-intro');await click('#btn-next');await click('#btn-replay-all');assert.equal((await read()).currentStep,1);assert.deepEqual((await read()).align.selectedIds,['b1','b2']);
  for(const stage of ['1','2','3','4','5'])assert.deepEqual((await read()).stages[stage],old[stage]);
  assert.deepEqual(chrome.consoleErrors,[]);assert.deepEqual(chrome.pageExceptions,[]);
 }catch(err){if(chrome){const png=await chrome.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),`builder-stage6-failure-${mobile?'mobile':'desktop'}.png`),Buffer.from(png.data,'base64'));}throw err;}finally{if(chrome){
  // Let the CDP close handshake finish before killing Chrome. Killing first
  // can leave Node's WebSocket close timer alive after every test has passed.
  if(chrome.ws.readyState!==3)await new Promise(resolve=>{
   const done=()=>{clearTimeout(timer);resolve();};
   const timer=setTimeout(done,1500);
   chrome.ws.addEventListener('close',done,{once:true});chrome.ws.close();
  });
  chrome.proc.kill('SIGKILL');chrome.proc.stdout?.destroy();chrome.proc.stderr?.destroy();chrome.proc.unref();
 }await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
});
