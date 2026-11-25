// Makes WebP copies of the money pictures (coins and notes) with headless Chrome's own encoder (no npm packages).
// The originals stay for credits; the app loads the .webp files. node tools/webp.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'public/money/currency');
const files = fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/.test(f));
const c = await launch(ROOT);
try {
  await c.send('Page.navigate', { url: 'about:blank' });
  await sleep(500);
  for (const f of files) {
    const mime = f.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const b64 = fs.readFileSync(path.join(DIR, f)).toString('base64');
    const out = await c.evaluate(`new Promise((res) => { const i = new Image(); i.onload = () => { const cv = document.createElement('canvas'); cv.width = i.naturalWidth; cv.height = i.naturalHeight; cv.getContext('2d').drawImage(i, 0, 0); res(cv.toDataURL('image/webp', 0.82).split(',')[1]); }; i.src = 'data:${mime};base64,${b64}'; })`);
    const dest = path.join(DIR, f.replace(/\.(png|jpe?g)$/, '.webp'));
    fs.writeFileSync(dest, Buffer.from(out, 'base64'));
    console.log(f, fs.statSync(path.join(DIR, f)).size, '->', fs.statSync(dest).size);
  }
} finally {
  await c.close();
}
