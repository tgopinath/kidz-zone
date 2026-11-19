// Portfolio screenshots from the live site (or LIVE=http://localhost:5173): node tools/shots.mjs
// Phone shots: 600-wide JPEGs in prototype/shots; desktop: prototype/shots/web.jpg (1440x900) for the card's browser window.
// A demo child "Asha" with ten days of play is seeded into this headless profile only.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'prototype', 'shots');
const LIVE = process.env.LIVE || 'https://kidz-zone.vercel.app';
fs.mkdirSync(SHOTS, { recursive: true });

const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plan = [['garden', 'L', 'Word Garden level'], ['words', 'find:fruits-L', 'Fruits: find the object'], ['puzzles', 'jigsaw', 'Jigsaw puzzle'], ['brain', 'card-match', 'Card Matching'], ['money', 'challenge', 'Make ₹50'], ['maps', 'daily', 'Daily geography challenge'], ['pets', 'care', 'Fed Biscuit'], ['shop', 'quiz', 'Supermarket level 1 quiz']];
const log = [];
for (let n = 9; n >= 1; n--) for (let i = 0; i < 2 + (n % 3); i++) { const [w, id, title] = plan[(n * 3 + i) % plan.length]; const at = day(n).setHours(16 + i, 10); log.push({ world: w, id: id + (id.endsWith('L') || id.endsWith('-L') ? (10 - n) : ''), title, stars: 1 + ((n + i) % 3), xp: 20 + 5 * i, at, day: key(new Date(at)) }); }
const worlds = {};
for (const a of log) { const w = (worlds[a.world] ??= { stars: 0, xp: 0, plays: 0, level: 0, levelLabel: '', lastAt: 0 }); w.stars += a.stars; w.xp += a.xp; w.plays++; w.lastAt = a.at; }
Object.assign(worlds.garden, { level: 7, levelLabel: 'Seedling · level 7' });
Object.assign(worlds.words, { level: 4, levelLabel: '4 lessons done' });
Object.assign(worlds.puzzles, { level: 2, levelLabel: 'Jigsaw at level 2 of 5' });
Object.assign(worlds.brain, { level: 2, levelLabel: 'Player level 2' });
Object.assign(worlds.money, { level: 4, levelLabel: 'Challenge 4' });
Object.assign(worlds.maps, { levelLabel: '420 explorer points' });
Object.assign(worlds.pets, { level: 2, levelLabel: 'Biscuit is a young puppy' });
Object.assign(worlds.shop, { level: 2, levelLabel: 'Learning path level 2 of 8' });
const seed = {
  version: 1, profile: { name: 'Asha', ageBand: '7-9', avatar: 'teal', createdAt: day(10).getTime() },
  settings: { sound: false, voice: 'normal', textSize: 'normal', reducedMotion: true }, worlds, log, wallet: 60, mix: null, imported: ['__first-run'],
};
const garden = { stars: { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 1 }, avatar: '🐱', color: 'leaf' };

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
