import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startStaticServer,launchChromeWithCDP} from './browser-support.mjs';
import {createStepState} from '../src/model.js';
for(const offline of [false,true])test(`Removed Align save/deep-link recovery ${offline?'file://':'local HTTP'}`,async()=>{
 const {server,baseUrl}=await startStaticServer(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'builder-align-migration-'));let chrome,script;
 try{
  chrome=await launchChromeWithCDP(profile);const {send,evaluate}=chrome;
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  const base=offline?pathToFileURL(path.resolve('Builder-Island-Student.html')).href:`${baseUrl}/index.html`;
  const others=Object.fromEntries([1,2,3,4,5].map(id=>[id,createStepState(2,[1],id)]));
  for(const cancelled of [10,11,12])for(const deepLink of [false,true]){
   const old={...createStepState(9,[],6),currentStep:deepLink?5:cancelled,completedSteps:[1,4,9,10,11,12],boxes:[{id:'b1',x:99,y:99,z:99},{id:'b2',x:1,y:1,z:1},{id:'b3',x:2,y:2,z:2}],align:{version:1,selectedIds:['b3'],referenceId:'b3',active:true,multiple:true,operations:['x:center'],undo:null}};
   if(script)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script});
   // Fixture injection creates a legacy save only; no task is claimed solved by this setup.
   ({identifier:script}=await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('builder-island.isolated-test.v1',${JSON.stringify(JSON.stringify({version:5,currentStage:6,stages:{...others,6:old}}))});`}));
   await send('Page.navigate',{url:base+`?mode=test&stage=6${deepLink?'&step='+cancelled:''}`});
   for(let n=0;n<100;n++){if(await evaluate(`document.querySelector('#step-progress')?.textContent==='9 / 9'`))break;await new Promise(r=>setTimeout(r,20));}
   assert.equal(await evaluate(`document.querySelector('#step-progress').textContent`),'9 / 9');assert.equal(await evaluate(`document.querySelector('#btn-next').disabled`),true);assert.equal(await evaluate(`document.querySelectorAll('.student-box-item').length`),2);assert.equal(await evaluate(`document.querySelectorAll('.align-dot').length`),0);
   const svg=await evaluate(`document.querySelector('#workspace-3d').innerHTML`);
   const click=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);assert.equal(await evaluate(`!!document.elementFromPoint(${p.x},${p.y})?.closest(${JSON.stringify(selector)})`),true);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});};
   await click('#btn-close-align-intro');await click('#btn-reset');assert.equal(await evaluate(`document.querySelector('#workspace-3d').innerHTML`),svg,'migration already rendered normal Q9 geometry');
   const raw=await evaluate(`JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'))`),expected=createStepState(9,[1,4],6); // Reset removes current Q9 history only.
   assert.deepEqual(raw.boxes,expected.boxes);assert.deepEqual(raw.align,expected.align);assert.deepEqual(raw.completedSteps,[1,4]);for(const id of [1,2,3,4,5])assert.deepEqual(raw.stages[id],others[id]);
  }
  assert.deepEqual(chrome.consoleErrors,[]);assert.deepEqual(chrome.pageExceptions,[]);
 }finally{if(chrome){if(chrome.ws.readyState!==3)await new Promise(resolve=>{const done=()=>{clearTimeout(timer);resolve();},timer=setTimeout(done,1500);chrome.ws.addEventListener('close',done,{once:true});chrome.ws.close();});chrome.proc.kill('SIGKILL');chrome.proc.stdout?.destroy();chrome.proc.stderr?.destroy();chrome.proc.unref();}await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
});
