/**
 * Real Browser E2E Verification across all 8 steps (Google Chrome + CDP)
 * Verifies:
 * 1. One primary action per step (Step 4 TOP view only, Step 6 FRONT view only, Height vs Lift separated)
 * 2. Relevant-only handles rendered & enabled per step
 * 3. Camera/Orbit independence from box position, size, and rotation
 * 4. Every step starts uncompleted (Next disabled) & shared coordinate basis
 * 5. Success keeps current screen (no auto-jump), shows "Nice!", enables Next, and Reset only resets current step
 */

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

export function startStaticServer() {
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

export async function launchChromeWithCDP(userDataDir) {
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
