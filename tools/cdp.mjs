// Tiny Chrome DevTools Protocol helper for the tools in this folder (system Chrome, headless, no npm packages).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(root) {
  // outside the project, so a running Vite dev server does not reload pages when Chrome writes its profile
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kz-shots-'));
  void root;
  const port = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, `--user-data-dir=${tmp}/profile`, 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 160 && !ws; i++) {
    try {
      const p = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
      if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
    } catch {}
    if (!ws) await sleep(250);
  }
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = {};
  const events = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; } else if (m.method) events.push(m);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const close = async () => { try { ws.close(); } catch {} proc.kill(); await sleep(600); try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5 }); } catch {} };
  return { send, evaluate, close, events, tmp };
}
