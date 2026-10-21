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
  const tmpProfileDir = fs.mkdtempSync(path.join(PROJECT_ROOT, '.tmp-chrome-profile-'));
  let chrome = null;

  try {
    chrome = await launchChromeWithCDP(tmpProfileDir);

    await chrome.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    await chrome.send('Page.navigate', { url: `${baseUrl}/index.html?mode=test` });
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
