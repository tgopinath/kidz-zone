// Renders public/icons/icon.svg to the PNG icons (1024 master + 512, 192, apple-touch 180): node tools/icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(ROOT, 'public/icons/icon.svg'), 'utf8');
const c = await launch(ROOT);
try {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'data:text/html,' + encodeURIComponent(`<style>html,body{margin:0}</style>${svg.replace('<svg ', '<svg width="1024" height="1024" ')}`) });
  await sleep(800);
  const s = await c.send('Page.captureScreenshot', { format: 'png' });
  const master = path.join(ROOT, 'public/icons/icon-1024.png');
  fs.writeFileSync(master, Buffer.from(s.result.data, 'base64'));
  for (const [n, f] of [[512, 'icons/icon-512.png'], [192, 'icons/icon-192.png'], [180, 'apple-touch-icon.png']]) execFileSync('sips', ['-z', String(n), String(n), master, '--out', path.join(ROOT, 'public', f)], { stdio: 'pipe' });
  console.log('icons written');
} finally {
  await c.close();
}
