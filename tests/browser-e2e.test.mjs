/**
 * Real Browser E2E Verification across all 8 steps (Google Chrome + CDP)
 * Verifies:
 * 1. One primary action per step (Step 4 TOP view only, Step 6 FRONT view only, Height vs Lift separated)
 * 2. Relevant-only handles rendered & enabled per step
 * 3. Camera/Orbit independence from box position, size, and rotation
 * 4. Every step starts uncompleted (Next disabled) & shared coordinate basis
 * 5. Success keeps current screen (no auto-jump), shows "Nice!", enables Next, and Reset only resets current step
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROJECT_ROOT = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlObj = new URL(req.url, 'http://127.0.0.1');
      const cleanPath = urlObj.pathname === '/' ? '/index.html' : urlObj.pathname;
      const filePath = path.join(PROJECT_ROOT, cleanPath);

      if (!filePath.startsWith(PROJECT_ROOT) || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function launchChromeWithCDP(userDataDir) {
  const proc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank'
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  const wsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for Chrome DevTools WS URL')), 10000);
    let stderrText = '';
    proc.stderr.on('data', (chunk) => {
      stderrText += chunk.toString();
      const match = stderrText.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited early with code ${code}`));
    });
  });

  const parsedWs = new URL(wsUrl);
  const targetsRes = await fetch(`http://127.0.0.1:${parsedWs.port}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let msgId = 1;
  const pending = new Map();
  const consoleErrors = [];
  const pageExceptions = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      if (data.params.type === 'error') {
        consoleErrors.push(data.params.args.map((a) => a.value || a.description).join(' '));
      }
    } else if (data.method === 'Runtime.exceptionThrown') {
      pageExceptions.push(data.params.exceptionDetails?.text || 'Uncaught exception');
    } else if (data.method === 'Log.entryAdded') {
      if (data.params.entry?.level === 'error') {
        consoleErrors.push(data.params.entry.text);
      }
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result.value;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  return { proc, ws, send, evaluate, consoleErrors, pageExceptions };
}

test('Real Chrome Browser E2E: all 8 steps single-action handles, camera independence, Nice! feedback, and Reset', async () => {
  const { server, baseUrl } = await startStaticServer();
  const tmpProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), '.tmp-chrome-profile-'));
  let chrome = null;

  try {
    chrome = await launchChromeWithCDP(tmpProfileDir);

    await chrome.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    await chrome.send('Page.navigate', { url: (process.env.OFFLINE === '1' ? pathToFileURL(path.join(PROJECT_ROOT, 'Builder-Island-Student.html')).href + '?mode=test' : `${baseUrl}/index.html?mode=test`) });
    await new Promise((r) => setTimeout(r, 350));

    // --- STEP 1: MOVE ONLY ---
    const step1Check = await chrome.evaluate(`(() => {
      const progress = document.getElementById('step-progress').textContent.trim();
      const nextDisabled = document.getElementById('btn-next').disabled;
      const handleCount = document.querySelectorAll('.handle-node').length;

      // Verify switching camera views & orbiting does NOT alter box
      document.getElementById('view-btn-top').click();
      document.getElementById('view-btn-front').click();
      document.getElementById('view-btn-side').click();
      document.getElementById('view-btn-iso').click();

      const svg = document.getElementById('workspace-3d');
      const orbitBg = document.getElementById('orbit-bg');
      orbitBg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 160, clientY: 130, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      document.getElementById('view-btn-iso').click();

      const afterCamBox = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).box;

      // Drag box to target outline
      const boxEl = document.getElementById('student-box-group');
      const targetEl = document.getElementById('target-ghost-group');
      const bRect = boxEl.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();

      boxEl.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: bRect.left + bRect.width / 2,
        clientY: bRect.top + bRect.height / 2,
        pointerId: 1
      }));
      svg.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: tRect.left + tRect.width / 2,
        clientY: tRect.top + tRect.height / 2,
        pointerId: 1
      }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

      const afterMoveInstruction = document.getElementById('step-instruction').textContent.trim();
      const afterMoveProgress = document.getElementById('step-progress').textContent.trim();
      const nextEnabled = !document.getElementById('btn-next').disabled;

      return {
        progress,
        nextDisabled,
        handleCount,
        afterCamBox,
        afterMoveInstruction,
        afterMoveProgress,
        nextEnabled
      };
    })()`);

    assert.equal(step1Check.progress, '1 / 8');
    assert.equal(step1Check.nextDisabled, true, 'Step 1 must start uncompleted');
    assert.equal(step1Check.handleCount, 0, 'Step 1 (move) must not show resize/rotate/lift handles');
    assert.deepEqual(step1Check.afterCamBox, {
      x: 14,
      y: 46,
      z: 0,
      length: 20,
      width: 20,
      height: 20,
      rotation: 0
    });
    assert.equal(step1Check.afterMoveInstruction, 'Nice!');
    assert.equal(step1Check.afterMoveProgress, '1 / 8', 'Must not auto-jump to Step 2');
    assert.equal(step1Check.nextEnabled, true);

    // --- STEP 2: LENGTH RESIZE ONLY + RESET CURRENT STEP ONLY ---
    const step2Check = await chrome.evaluate(`(() => {
      document.getElementById('btn-next').click();
      const progress = document.getElementById('step-progress').textContent.trim();
      const nextDisabled = document.getElementById('btn-next').disabled;
      const handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);

      const stretchToTarget = () => {
        const svg = document.getElementById('workspace-3d');
        const handle = document.querySelector('[data-action="length"]');
        const hRect = handle.getBoundingClientRect();
        const boxRect = document.getElementById('student-box-group').getBoundingClientRect();
        const targetRect = document.getElementById('target-ghost-group').getBoundingClientRect();
        const dx = targetRect.right - boxRect.right;
        const dy = targetRect.bottom - boxRect.bottom;

        handle.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: hRect.left + 5,
          clientY: hRect.top + 5,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX: hRect.left + 5 + dx,
          clientY: hRect.top + 5 + dy,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      };

      stretchToTarget();
      const instructionAfterStretch = document.getElementById('step-instruction').textContent.trim();

      // Click Reset on Step 2 -> must stay on 2 / 8 and reset Step 2
      document.getElementById('btn-reset').click();
      const progressAfterReset = document.getElementById('step-progress').textContent.trim();
      const nextDisabledAfterReset = document.getElementById('btn-next').disabled;

      // Stretch again to complete Step 2
      stretchToTarget();

      return {
        progress,
        nextDisabled,
        handles,
        instructionAfterStretch,
        progressAfterReset,
        nextDisabledAfterReset
      };
    })()`);

    assert.equal(step2Check.progress, '2 / 8');
    assert.equal(step2Check.nextDisabled, true);
    assert.deepEqual(step2Check.handles, ['length']);
    assert.equal(step2Check.instructionAfterStretch, 'Nice!');
    assert.equal(step2Check.progressAfterReset, '2 / 8', 'Reset must only reset current step');
    assert.equal(step2Check.nextDisabledAfterReset, true);

    // --- STEPS 3 TO 8 ---
    const steps3To8Check = await chrome.evaluate(`(() => {
      const svg = document.getElementById('workspace-3d');

      // Enter Step 3 (Height Only)
      document.getElementById('btn-next').click();
      const s3InitialNextDisabled = document.getElementById('btn-next').disabled;
      const s3Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      const hHandle = document.querySelector('[data-action="height"]');
      const hRect = hHandle.getBoundingClientRect();
      const s3BoxRect = document.getElementById('student-box-group').getBoundingClientRect();
      const s3TargetRect = document.getElementById('target-ghost-group').getBoundingClientRect();
      const dyHeight = s3TargetRect.top - s3BoxRect.top;

      hHandle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: hRect.left, clientY: hRect.top, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: hRect.left, clientY: hRect.top + dyHeight, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      const s3Nice = document.getElementById('step-instruction').textContent.trim();

      // Enter Step 4 (TOP View Only — no movement required!)
      document.getElementById('btn-next').click();
      const s4InitialNextDisabled = document.getElementById('btn-next').disabled;
      const s4Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      document.getElementById('view-btn-top').click();
      const s4Nice = document.getElementById('step-instruction').textContent.trim();

      // Test going back from completed Step 4 to Step 3 via ← Back (#btn-prev)
      document.getElementById('btn-prev').click();
      const progressAfterBackFrom4 = document.getElementById('step-progress').textContent.trim();
      // Re-complete Step 3 and Step 4 to proceed to Step 5
      const hHandleAgain = document.querySelector('[data-action="height"]');
      const hRectAgain = hHandleAgain.getBoundingClientRect();
      hHandleAgain.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: hRectAgain.left, clientY: hRectAgain.top, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: hRectAgain.left, clientY: hRectAgain.top + dyHeight, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      document.getElementById('btn-next').click();
      document.getElementById('view-btn-top').click();

      // Enter Step 5 (Rotate Only — requires click and hold then turn, NOT single click!)
      document.getElementById('btn-next').click();
      const s5InitialNextDisabled = document.getElementById('btn-next').disabled;
      const s5Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      const rotHandle = document.querySelector('[data-action="rotate"]');
      const rRect = rotHandle.getBoundingClientRect();

      // 1) Single click without dragging must NOT rotate the box
      rotHandle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rRect.left + 10, clientY: rRect.top + 10, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: rRect.left + 10, clientY: rRect.top + 10, pointerId: 1 }));
      const s5AfterSingleClickDisabled = document.getElementById('btn-next').disabled;

      // 2) Click and hold then turn (drag) rotates the box to 90 deg
      const rotHandleDrag = document.querySelector('[data-action="rotate"]');
      const rRectDrag = rotHandleDrag.getBoundingClientRect();
      rotHandleDrag.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rRectDrag.left + 10, clientY: rRectDrag.top + 10, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: rRectDrag.left - 110, clientY: rRectDrag.top + 30, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      const s5Nice = document.getElementById('step-instruction').textContent.trim();

      // Enter Step 6 (FRONT View Only — no height pulling required!)
      document.getElementById('btn-next').click();
      const s6InitialNextDisabled = document.getElementById('btn-next').disabled;
      const s6Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      document.getElementById('view-btn-front').click();
      const s6Nice = document.getElementById('step-instruction').textContent.trim();

      // Enter Step 7 (Lift Cone Only — separate from height!)
      document.getElementById('btn-next').click();
      const s7InitialNextDisabled = document.getElementById('btn-next').disabled;
      const s7Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      const liftHandle = document.querySelector('[data-action="lift"]');
      const lRect = liftHandle.getBoundingClientRect();
      const s7BoxRect = document.getElementById('student-box-group').getBoundingClientRect();
      const s7TargetRect = document.getElementById('target-ghost-group').getBoundingClientRect();
      const dyLift = s7TargetRect.top - s7BoxRect.top;

      liftHandle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: lRect.left, clientY: lRect.top, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: lRect.left, clientY: lRect.top + dyLift, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      const s7Nice = document.getElementById('step-instruction').textContent.trim();
      const s7HeightUnchanged = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).box.height === 10;

      // Enter Step 8 (Width Only)
      document.getElementById('btn-next').click();
      const s8InitialNextDisabled = document.getElementById('btn-next').disabled;
      const s8Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      const wHandle = document.querySelector('[data-action="width"]');
      const wRect = wHandle.getBoundingClientRect();
      const s8BoxRect = document.getElementById('student-box-group').getBoundingClientRect();
      const s8TargetRect = document.getElementById('target-ghost-group').getBoundingClientRect();
      const dxWid = s8TargetRect.left - s8BoxRect.left;
      const dyWid = s8TargetRect.bottom - s8BoxRect.bottom;

      wHandle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: wRect.left, clientY: wRect.top, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: wRect.left + dxWid, clientY: wRect.top + dyWid, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      const s8Nice = document.getElementById('step-instruction').textContent.trim();
      const s8MascotRendered = Boolean(document.getElementById('little-bot-mascot'));

      // Click Finish 🎉 on Step 8 -> opens Completion Modal (#modal-complete)
      document.getElementById('btn-next').click();
      const completeModalOpen = !document.getElementById('modal-complete').classList.contains('hidden');
      const skillsCount = document.querySelectorAll('#skills-review-grid .skill-chip').length;

      // Click Change My Design -> unlocks Free Play mode with all 5 handles
      document.getElementById('btn-change-design').click();
      const freePlayHandles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);

      // Re-open Completion Modal and click Replay 1 / 8 -> resets to Step 1
      document.getElementById('btn-next').click();
      document.getElementById('btn-replay-all').click();
      const progressAfterReplay = document.getElementById('step-progress').textContent.trim();

      return {
        s3InitialNextDisabled, s3Handles, s3Nice,
        s4InitialNextDisabled, s4Handles, s4Nice, progressAfterBackFrom4,
        s5InitialNextDisabled, s5Handles, s5AfterSingleClickDisabled, s5Nice,
        s6InitialNextDisabled, s6Handles, s6Nice,
        s7InitialNextDisabled, s7Handles, s7Nice, s7HeightUnchanged,
        s8InitialNextDisabled, s8Handles, s8Nice, s8MascotRendered,
        completeModalOpen, skillsCount, freePlayHandles, progressAfterReplay
      };
    })()`);

    assert.equal(steps3To8Check.s3InitialNextDisabled, true);
    assert.deepEqual(steps3To8Check.s3Handles, ['height']);
    assert.equal(steps3To8Check.s3Nice, 'Nice!');

    assert.equal(steps3To8Check.s4InitialNextDisabled, true);
    assert.deepEqual(steps3To8Check.s4Handles, [], 'Step 4 (TOP view) must not show model handles');
    assert.equal(steps3To8Check.s4Nice, 'Nice!');
    assert.equal(steps3To8Check.progressAfterBackFrom4, '3 / 8', 'Clicking ← Back from Step 4 returns to Step 3');

    assert.equal(steps3To8Check.s5InitialNextDisabled, true);
    assert.deepEqual(steps3To8Check.s5Handles, ['rotate']);
    assert.equal(steps3To8Check.s5AfterSingleClickDisabled, true, 'Single click on rotate handle must NOT rotate box');
    assert.equal(steps3To8Check.s5Nice, 'Nice!');

    assert.equal(steps3To8Check.s6InitialNextDisabled, true);
    assert.deepEqual(steps3To8Check.s6Handles, [], 'Step 6 (FRONT view) must not show model handles');
    assert.equal(steps3To8Check.s6Nice, 'Nice!');

    assert.equal(steps3To8Check.s7InitialNextDisabled, true);
    assert.deepEqual(steps3To8Check.s7Handles, ['lift']);
    assert.equal(steps3To8Check.s7Nice, 'Nice!');
    assert.equal(steps3To8Check.s7HeightUnchanged, true, 'Step 7 lift must not alter object height');

    assert.equal(steps3To8Check.s8InitialNextDisabled, true);
    assert.deepEqual(steps3To8Check.s8Handles, ['width']);
    assert.equal(steps3To8Check.s8Nice, 'Nice!');
    assert.equal(steps3To8Check.s8MascotRendered, true, 'Little Bot mascot appears on completed 40x30x4 base');
    assert.equal(steps3To8Check.completeModalOpen, true, 'Clicking Finish on Step 8 opens Completion Modal');
    assert.equal(steps3To8Check.skillsCount, 8, 'Completion modal reviews all 8 skills');
    assert.deepEqual(steps3To8Check.freePlayHandles, ['length', 'width', 'height', 'lift', 'rotate']);
    assert.equal(steps3To8Check.progressAfterReplay, '1 / 8');

    assert.deepEqual(chrome.consoleErrors, []);
    assert.deepEqual(chrome.pageExceptions, []);
  } finally {
    if (chrome) {
      chrome.ws.close();
      chrome.proc.kill('SIGKILL');
    }
    server.close();
    fs.rmSync(tmpProfileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('Real Chrome Browser E2E: Stage 2 — Challenge (all 8 tasks, stage switching, hold-to-turn 90/180/270/-90, directional markers, multi-block selection, and Next re-disable)', async () => {
  const { server, baseUrl } = await startStaticServer();
  const tmpProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), '.tmp-chrome-stage2-'));
  let chrome = null;

  try {
    chrome = await launchChromeWithCDP(tmpProfileDir);

    await chrome.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    await chrome.send('Page.navigate', { url: (process.env.OFFLINE === '1' ? pathToFileURL(path.join(PROJECT_ROOT, 'Builder-Island-Student.html')).href + '?mode=test' : `${baseUrl}/index.html?mode=test`) });
    await new Promise((r) => setTimeout(r, 350));

    // 1. Complete Step 1 of Stage 1, advance to Step 2 of Stage 1, then switch to Stage 2 and verify independent state
    const stageSwitchAndQ1ToQ4 = await chrome.evaluate(`(() => {
      const svg = document.getElementById('workspace-3d');

      const dragBoxToTarget = (boxId, targetId) => {
        const boxEl = document.getElementById('student-box-' + boxId);
        const targetEl = document.getElementById('target-ghost-' + targetId);
        const bRect = boxEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        boxEl.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: bRect.left + bRect.width / 2,
          clientY: bRect.top + bRect.height / 2,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX: tRect.left + tRect.width / 2,
          clientY: tRect.top + tRect.height / 2,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      };

      const holdTurnSelected = (degrees) => {
        const rotHandle = document.querySelector('[data-action="rotate"]');
        const rRect = rotHandle.getBoundingClientRect();
        // A tangential drag expressed in SVG units survives responsive header changes.
        const saved = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'));
        const box = saved.boxes.find(b => b.id === saved.selectedBoxId) || saved.boxes[0];
        const matrix = svg.getScreenCTM();
        const yaw = saved.camera.yaw * Math.PI / 180;
        const pitch = saved.camera.pitch * Math.PI / 180;
        const wx = box.x + box.length / 2 - 50, wy = box.y + box.width / 2 - 40;
        const centerX = 500 + (wx * Math.cos(yaw) - wy * Math.sin(yaw)) * 5.6;
        const centerY = 345 + (wx * Math.sin(yaw) + wy * Math.cos(yaw)) * Math.sin(pitch) * 5.6 - box.z * Math.cos(pitch) * 5.6;
        const rx = (rRect.left + 10 - matrix.e) / matrix.a - centerX;
        const ry = (rRect.top + 10 - matrix.f) / matrix.d - centerY;
        const radius = Math.hypot(rx, ry) || 1;
        const distance = degrees / 0.85;
        const dx = -ry / radius * distance * matrix.a;
        const dy = rx / radius * distance * matrix.d;
        rotHandle.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: rRect.left + 10,
          clientY: rRect.top + 10,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX: rRect.left + 10 + dx,
          clientY: rRect.top + 10 + dy,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      };

      // Complete Stage 1 Step 1 and go to Stage 1 Step 2
      dragBoxToTarget('b1', 'b1');
      document.getElementById('btn-next').click();
      const stage1StepBeforeSwitch = document.getElementById('step-progress').textContent.trim();

      // Switch directly to Stage 2 — Challenge
      document.getElementById('btn-stage-2').click();
      const stage2Label = document.getElementById('current-stage-name').textContent.trim();
      const stage2Step1Progress = document.getElementById('step-progress').textContent.trim();
      const stage2Step1BackDisabled = document.getElementById('btn-prev').disabled;
      const stage2Step1NextDisabled = document.getElementById('btn-next').disabled;
      const q1Instruction = document.getElementById('step-instruction').textContent.trim();

      // Switch back to Stage 1 -> must still be on Step 2 / 8!
      document.getElementById('btn-stage-1').click();
      const stage1RestoredProgress = document.getElementById('step-progress').textContent.trim();

      // Switch back to Stage 2 to complete Q1..Q4
      document.getElementById('btn-stage-2').click();

      // --- Stage 2 Q1: Turn and Move ---
      // Single click on rotate handle must NOT rotate
      const rotH = document.querySelector('[data-action="rotate"]');
      const rhRect = rotH.getBoundingClientRect();
      rotH.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rhRect.left + 8, clientY: rhRect.top + 8, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: rhRect.left + 8, clientY: rhRect.top + 8, pointerId: 1 }));
      const q1RotAfterSingleClick = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).boxes[0].rotation;

      // Move first, then hold-and-turn 90°
      dragBoxToTarget('b1', 'b1');
      const q1NextAfterMoveOnly = document.getElementById('btn-next').disabled;
      holdTurnSelected(90);
      const q1Matched = !document.getElementById('btn-next').disabled;

      // Move the matched block away -> Next must immediately become disabled again!
      const b1El = document.getElementById('student-box-b1');
      const b1Rect = b1El.getBoundingClientRect();
      b1El.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: b1Rect.left + 20, clientY: b1Rect.top + 20, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: b1Rect.left - 180, clientY: b1Rect.top, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      const q1NextDisabledWhenMovedAway = document.getElementById('btn-next').disabled;

      // Move back to target to complete Q1
      dragBoxToTarget('b1', 'b1');
      const q1MatchedAgain = !document.getElementById('btn-next').disabled;

      // --- Stage 2 Q2: Match the Direction (180° with visible direction markers on block & target) ---
      document.getElementById('btn-next').click();
      const q2Instruction = document.getElementById('step-instruction').textContent.trim();
      const q2HasBoxArrow = Boolean(document.querySelector('.box-dir-arrow'));
      const q2HasTargetArrow = Boolean(document.querySelector('.target-dir-arrow'));
      dragBoxToTarget('b1', 'b1');
      const q2NextDisabledAt0Deg = document.getElementById('btn-next').disabled;
      // Hold and turn 180°
      holdTurnSelected(180);
      const q2MatchedAt180 = !document.getElementById('btn-next').disabled;

      // --- Stage 2 Q3: Find the Turn (270° === -90° counter-clockwise or clockwise) ---
      document.getElementById('btn-next').click();
      const q3Instruction = document.getElementById('step-instruction').textContent.trim();
      dragBoxToTarget('b1', 'b1');
      // Drag counter-clockwise (+120, -20) to -90° (which equals 270°)
      holdTurnSelected(-90);
      const q3RotAfterCCW = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).boxes[0].rotation;
      const q3MatchedCCW = !document.getElementById('btn-next').disabled;

      // --- Stage 2 Q4: Look and Match (Hint available on click) ---
      document.getElementById('btn-next').click();
      const q4Instruction = document.getElementById('step-instruction').textContent.trim();
      const q4HintHiddenInitially = document.getElementById('hint-toast').classList.contains('hidden');
      document.getElementById('btn-hint').click();
      const q4HintVisibleAfterClick = !document.getElementById('hint-toast').classList.contains('hidden');
      dragBoxToTarget('b1', 'b1');
      holdTurnSelected(90);
      const q4Matched = !document.getElementById('btn-next').disabled;

      return {
        stage1StepBeforeSwitch,
        stage2Label,
        stage2Step1Progress,
        stage2Step1BackDisabled,
        stage2Step1NextDisabled,
        q1Instruction,
        stage1RestoredProgress,
        q1RotAfterSingleClick,
        q1NextAfterMoveOnly,
        q1Matched,
        q1NextDisabledWhenMovedAway,
        q1MatchedAgain,
        q2Instruction,
        q2HasBoxArrow,
        q2HasTargetArrow,
        q2NextDisabledAt0Deg,
        q2MatchedAt180,
        q3Instruction,
        q3RotAfterCCW,
        q3MatchedCCW,
        q4Instruction,
        q4HintHiddenInitially,
        q4HintVisibleAfterClick,
        q4Matched
      };
    })()`);

    assert.equal(stageSwitchAndQ1ToQ4.stage1StepBeforeSwitch, '2 / 8');
    assert.equal(stageSwitchAndQ1ToQ4.stage2Label, 'Stage 2 — Challenge');
    assert.equal(stageSwitchAndQ1ToQ4.stage2Step1Progress, '1 / 8');
    assert.equal(stageSwitchAndQ1ToQ4.stage2Step1BackDisabled, true);
    assert.equal(stageSwitchAndQ1ToQ4.stage2Step1NextDisabled, true);
    assert.equal(stageSwitchAndQ1ToQ4.q1Instruction, 'Turn and move the block to match the target.');
    assert.equal(stageSwitchAndQ1ToQ4.stage1RestoredProgress, '2 / 8', 'Switching stages must preserve Stage 1 step');
    assert.equal(stageSwitchAndQ1ToQ4.q1RotAfterSingleClick, 0, 'Single click on rotate handle must never rotate');
    assert.equal(stageSwitchAndQ1ToQ4.q1NextAfterMoveOnly, true, 'Move alone must not pass Q1');
    assert.equal(stageSwitchAndQ1ToQ4.q1Matched, true);
    assert.equal(stageSwitchAndQ1ToQ4.q1NextDisabledWhenMovedAway, true, 'Moving matched block away must re-disable Next');
    assert.equal(stageSwitchAndQ1ToQ4.q1MatchedAgain, true);

    assert.equal(stageSwitchAndQ1ToQ4.q2Instruction, 'Match the direction, then move to the target.');
    assert.equal(stageSwitchAndQ1ToQ4.q2HasBoxArrow, true, 'Q2 block must display directional arrow');
    assert.equal(stageSwitchAndQ1ToQ4.q2HasTargetArrow, true, 'Q2 target must display directional arrow');
    assert.equal(stageSwitchAndQ1ToQ4.q2NextDisabledAt0Deg, true, 'Q2 must not pass at 0° when target is 180°');
    assert.equal(stageSwitchAndQ1ToQ4.q2MatchedAt180, true);

    assert.equal(stageSwitchAndQ1ToQ4.q3Instruction, 'Turn the block to match the target.');
    assert.equal(stageSwitchAndQ1ToQ4.q3RotAfterCCW, 270, 'Counter-clockwise -90° turn must normalize to 270°');
    assert.equal(stageSwitchAndQ1ToQ4.q3MatchedCCW, true);

    assert.equal(stageSwitchAndQ1ToQ4.q4Instruction, 'Look closely. Match the position and direction.');
    assert.equal(stageSwitchAndQ1ToQ4.q4HintHiddenInitially, true);
    assert.equal(stageSwitchAndQ1ToQ4.q4HintVisibleAfterClick, true);
    assert.equal(stageSwitchAndQ1ToQ4.q4Matched, true);

    // 2. Complete Stage 2 Multi-Block tasks Q5..Q8 and verify Completion Modal & Stage Selection entry
    const q5ToQ8 = await chrome.evaluate(`(() => {
      const svg = document.getElementById('workspace-3d');

      const dragBoxToTarget = (boxId, targetId) => {
        const boxEl = document.getElementById('student-box-' + boxId);
        const targetEl = document.getElementById('target-ghost-' + targetId);
        const bRect = boxEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        boxEl.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: bRect.left + bRect.width / 2,
          clientY: bRect.top + bRect.height / 2,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX: tRect.left + tRect.width / 2,
          clientY: tRect.top + tRect.height / 2,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      };

      const holdTurnSelected = (degrees) => {
        const rotHandle = document.querySelector('[data-action="rotate"]');
        const rRect = rotHandle.getBoundingClientRect();
        // A tangential drag expressed in SVG units survives responsive header changes.
        const saved = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1'));
        const box = saved.boxes.find(b => b.id === saved.selectedBoxId) || saved.boxes[0];
        const matrix = svg.getScreenCTM();
        const yaw = saved.camera.yaw * Math.PI / 180;
        const pitch = saved.camera.pitch * Math.PI / 180;
        const wx = box.x + box.length / 2 - 50, wy = box.y + box.width / 2 - 40;
        const centerX = 500 + (wx * Math.cos(yaw) - wy * Math.sin(yaw)) * 5.6;
        const centerY = 345 + (wx * Math.sin(yaw) + wy * Math.cos(yaw)) * Math.sin(pitch) * 5.6 - box.z * Math.cos(pitch) * 5.6;
        const rx = (rRect.left + 10 - matrix.e) / matrix.a - centerX;
        const ry = (rRect.top + 10 - matrix.f) / matrix.d - centerY;
        const radius = Math.hypot(rx, ry) || 1;
        const distance = degrees / 0.85;
        const dx = -ry / radius * distance * matrix.a;
        const dy = rx / radius * distance * matrix.d;
        rotHandle.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: rRect.left + 10,
          clientY: rRect.top + 10,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          clientX: rRect.left + 10 + dx,
          clientY: rRect.top + 10 + dy,
          pointerId: 1
        }));
        svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      };

      // --- Stage 2 Q5: Two Blocks (move only, no rotate handle) ---
      document.getElementById('btn-next').click();
      const q5Instruction = document.getElementById('step-instruction').textContent.trim();
      const q5Handles = [...document.querySelectorAll('.handle-node')].map((h) => h.dataset.action);
      const b2Before = { ...JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).boxes[1] };
      dragBoxToTarget('b1', 'b1');
      const b2AfterB1Move = { ...JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).boxes[1] };
      const q5NextAfterOneBlock = document.getElementById('btn-next').disabled;
      dragBoxToTarget('b2', 'b2');
      const q5Matched = !document.getElementById('btn-next').disabled;

      // --- Stage 2 Q6: One Needs a Turn ---
      document.getElementById('btn-next').click();
      const q6Instruction = document.getElementById('step-instruction').textContent.trim();
      dragBoxToTarget('b1', 'b1');
      holdTurnSelected(90);
      dragBoxToTarget('b2', 'b2');
      const q6Matched = !document.getElementById('btn-next').disabled;

      // --- Stage 2 Q7: Turn Both (b1 turns 90°, b2 turns 180° with directional arrow) ---
      document.getElementById('btn-next').click();
      const q7Instruction = document.getElementById('step-instruction').textContent.trim();
      dragBoxToTarget('b1', 'b1');
      holdTurnSelected(90);
      dragBoxToTarget('b2', 'b2');
      const q7NextBeforeB2Turn = document.getElementById('btn-next').disabled;
      holdTurnSelected(180);
      const q7Matched = !document.getElementById('btn-next').disabled;

      // --- Stage 2 Q8: Build the Shape (3 blocks: b1 turns 90°, b2 moves, b3 turns 90°) ---
      document.getElementById('btn-next').click();
      const q8Instruction = document.getElementById('step-instruction').textContent.trim();
      dragBoxToTarget('b1', 'b1');
      holdTurnSelected(90);
      dragBoxToTarget('b2', 'b2');
      // Even after b1 and b2 are matched, b3 can be clearly selected, moved, and rotated via its handle
      dragBoxToTarget('b3', 'b3');
      const q8SelectedAfterB3Click = JSON.parse(localStorage.getItem('builder-island.isolated-test.v1')).selectedBoxId;
      holdTurnSelected(90);
      const q8Matched = !document.getElementById('btn-next').disabled;

      // Click Finish 🎉 -> opens Stage 2 Completion Modal, then click Choose Stage -> opens Stage Selection Modal
      document.getElementById('btn-next').click();
      const completeOpen = !document.getElementById('modal-complete').classList.contains('hidden');
      const completeTitle = document.getElementById('modal-complete-title').textContent.trim();
      document.getElementById('btn-stage-select').click();
      const stagesModalOpen = !document.getElementById('modal-stages').classList.contains('hidden');

      return {
        q5Instruction,
        q5Handles,
        b2UnchangedWhileMovingB1: b2Before.x === b2AfterB1Move.x && b2Before.y === b2AfterB1Move.y,
        q5NextAfterOneBlock,
        q5Matched,
        q6Instruction,
        q6Matched,
        q7Instruction,
        q7NextBeforeB2Turn,
        q7Matched,
        q8Instruction,
        q8SelectedAfterB3Click,
        q8Matched,
        completeOpen,
        completeTitle,
        stagesModalOpen
      };
    })()`);

    assert.equal(q5ToQ8.q5Instruction, 'Move both blocks to their matching targets.');
    assert.deepEqual(q5ToQ8.q5Handles, [], 'Q5 (move only) must not show rotation handle');
    assert.equal(q5ToQ8.b2UnchangedWhileMovingB1, true, 'Moving b1 must not move b2');
    assert.equal(q5ToQ8.q5NextAfterOneBlock, true);
    assert.equal(q5ToQ8.q5Matched, true);

    assert.equal(q5ToQ8.q6Instruction, 'One block needs a turn. Match both targets.');
    assert.equal(q5ToQ8.q6Matched, true);

    assert.equal(q5ToQ8.q7Instruction, 'Turn and move both blocks to match.');
    assert.equal(q5ToQ8.q7NextBeforeB2Turn, true);
    assert.equal(q5ToQ8.q7Matched, true);

    assert.equal(q5ToQ8.q8Instruction, 'Build the whole shape. Match all three blocks.');
    assert.equal(q5ToQ8.q8SelectedAfterB3Click, 'b3');
    assert.equal(q5ToQ8.q8Matched, true);

    assert.equal(q5ToQ8.completeOpen, true);
    assert.equal(q5ToQ8.completeTitle, '🏆 Stage 2 — Challenge Complete!');
    assert.equal(q5ToQ8.stagesModalOpen, true, 'Completion modal Choose Stage button opens Stage Selection modal');

    assert.deepEqual(chrome.consoleErrors, []);
    assert.deepEqual(chrome.pageExceptions, []);
  } finally {
    if (chrome) {
      chrome.ws.close();
      chrome.proc.kill('SIGKILL');
    }
    server.close();
    fs.rmSync(tmpProfileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
