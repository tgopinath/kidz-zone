// Quick look at one screen: node tools/peek.mjs <W>x<H> '<#/route>' <out.jpg> [js step]...
// Each step is evaluated in the page (helpers: $(sel), clickText(text)) with a pause after it. BASE env = app URL.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const [size, route, out, ...steps] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const BASE = process.env.BASE || 'http://localhost:5440';
const MODE = process.env.MODE || 'web';
const ROOT = path.resolve(import.meta.dirname, '..');
const profile = { name: 'Asha', ageBand: process.env.AGE || '7-9', avatar: 'teal', createdAt: Date.now() };
const c = await launch(ROOT);
try {
  await c.send('Runtime.enable');
  await c.send('Page.navigate', { url: BASE + '/favicon.svg' });
  await sleep(700);
  await c.evaluate(`localStorage.setItem('kidzzone:v1', JSON.stringify({ version: 1, profile: ${JSON.stringify(profile)}, settings: { sound: false, voice: 'normal', textSize: 'normal', reducedMotion: true }, worlds: {}, log: [], wallet: 40, mix: null, imported: ['__first-run'] }))`);
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await c.send('Page.navigate', { url: `${BASE}/?app=${MODE}&kztest=1${route}` });
  await sleep(Number(process.env.WAIT || 3000));
  const helpers = `const $=(s)=>document.querySelector(s); const clickText=(t)=>{const el=[...document.querySelectorAll('button,a,[role=button]')].find(e=>e.innerText.trim().toLowerCase().includes(t.toLowerCase())); el?.click(); return !!el};`;
  for (const s of steps) { console.log(s.slice(0, 60), '->', await c.evaluate(`(async()=>{${helpers} return (${s})})()`)); await sleep(Number(process.env.STEP || 1600)); }
  const errs = c.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
  for (const e of errs) console.log('ERROR', JSON.stringify(e.params).slice(0, 400));
  const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('scrollWidth', await c.evaluate('document.documentElement.scrollWidth'), 'of', w);
} finally { await c.close(); }
