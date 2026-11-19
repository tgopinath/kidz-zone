// Portfolio screenshots from the live site (or LIVE=http://localhost:5173): node tools/shots.mjs
// Phone shots: 600-wide JPEGs in prototype/shots; desktop: prototype/shots/web.jpg (1440x900) for the card's browser window.
// A demo child "Asha" with ten days of play is seeded into this headless profile only.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';
import { seed, garden } from './demo-seed.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'prototype', 'shots');
const LIVE = process.env.LIVE || 'https://kidz-zone-mu.vercel.app';
fs.mkdirSync(SHOTS, { recursive: true });

const c = await launch(ROOT);
try {
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await c.send('Page.navigate', { url: `${LIVE}/favicon.svg` });
  await sleep(1200);
  await c.evaluate(`localStorage.setItem('kidzzone:v1', ${JSON.stringify(JSON.stringify(seed))}); localStorage.setItem('word-garden-v2', ${JSON.stringify(JSON.stringify(garden))}); localStorage.setItem('money-master:stars', '["c0","c1","c2"]'); localStorage.setItem('money-master:level', '3')`);
  const capture = async (file, width) => {
    const s = await c.send('Page.captureScreenshot', { format: 'png' });
    const png = path.join(c.tmp, 'shot.png');
    fs.writeFileSync(png, Buffer.from(s.result.data, 'base64'));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', '--resampleWidth', String(width), png, '--out', path.join(SHOTS, file + '.jpg')], { stdio: 'pipe' });
    console.log('saved', file);
  };
  const go = async (route, wait = 3200, js) => {
    await c.evaluate(`location.hash = '#${route}'`);
    await sleep(wait);
    if (js) { await c.evaluate(js); await sleep(1500); }
    await c.evaluate('window.scrollTo(0, 0)');
  };

  // Desktop window for the card
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: `${LIVE}/?app=web#/` });
  await sleep(4000);
  await capture('web', 1440);

  // Phone
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await c.send('Page.navigate', { url: `${LIVE}/?app=web#/` });
  await sleep(4000);
  await capture('home', 600);
  await go('/learn'); await capture('learn', 600);
  await go('/words'); await capture('words', 600);
  await go('/garden'); await capture('garden', 600);
  await go('/maps', 5000); await capture('maps', 600);
  await go('/brain'); await capture('brain', 600);
  await go('/progress'); await capture('progress', 600);

  // Android app look (Material 3) for the README / card notes
  await c.send('Page.navigate', { url: `${LIVE}/?app=android#/` });
  await sleep(4000);
  await capture('android-home', 600);
  await c.send('Page.navigate', { url: `${LIVE}/?app=web#/` });
  await sleep(1500);
} finally {
  await c.close();
}
