// Visits every world in a headless Chrome (web, ?app=android, ?app=ios), saves screenshots and fails on console errors.
// node tools/check.mjs [baseUrl] [outDir]   (default http://localhost:5440, .check/)
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.argv[2] || 'http://localhost:5440';
const OUT = path.resolve(process.argv[3] || path.join(ROOT, '.check'));
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = (process.env.ROUTES || '/,/learn,/play,/explore,/progress,/settings,/words,/garden,/money,/puzzles,/brain,/pets,/maps,/shop').split(',');
const MODES = (process.env.MODES || 'web,android,ios').split(',');
const SIZES = (process.env.SIZES || '390x844').split(',').map((s) => s.split('x').map(Number));
const profile = { name: 'Asha', ageBand: '7-9', avatar: 'teal', createdAt: Date.now() };

const c = await launch(ROOT);
const errors = [];
try {
  await c.send('Runtime.enable');
  await c.send('Log.enable');
  await c.send('Page.enable');
  // seed on a same-origin page that does not run the app, so the app cannot overwrite the seed
  await c.send('Page.navigate', { url: BASE + '/favicon.svg' });
  await sleep(800);
  await c.evaluate(`localStorage.setItem('kidzzone:v1', JSON.stringify({ version: 1, profile: ${JSON.stringify(profile)}, settings: { sound: false, voice: 'normal', textSize: 'normal', reducedMotion: true }, worlds: {}, log: [], wallet: 40, mix: null, imported: ['__first-run'] }))`);
  for (const [w, h] of SIZES) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 768 });
    for (const mode of MODES) {
      await c.send('Page.navigate', { url: `${BASE}/?app=${mode}#/` });
      await sleep(2500);
      for (const r of ROUTES) {
        c.events.length = 0;
        await c.evaluate(`location.hash = '#${r}'`);
        await sleep(Number(process.env.WAIT || 2600));
        const s = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
        const file = path.join(OUT, `${mode}-${w}-${r.replace(/\//g, '_') || 'home'}.jpg`);
        fs.writeFileSync(file, Buffer.from(s.result.data, 'base64'));
        const sw = await c.evaluate('document.documentElement.scrollWidth');
        const errs = c.events.filter((e) => (e.method === 'Runtime.exceptionThrown') || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'));
        for (const e of errs) errors.push(`${mode} ${w} ${r}: ${JSON.stringify(e.params).slice(0, 300)}`);
        console.log(`${mode} ${w} ${r} scrollWidth=${sw}${sw > w ? ' OVERFLOW' : ''} errors=${errs.length}`);
      }
    }
  }
} finally {
  await c.close();
}
if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
