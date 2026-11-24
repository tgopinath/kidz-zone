// Plays every game in every world from start to finish in headless Chrome, at six screen sizes, and checks:
//   - no horizontal scroll, no console errors
//   - every visible control is at least 64 x 64 px and is the element under its own centre (not covered)
//   - rounds move on by themselves after a right answer (no Next button), the end celebration shows with Replay
// The app runs in test mode (?kztest=1, src/play/testMode.ts): right answers carry data-kz-answer (clicked with a
// real mouse event) and maps, drags and spelling expose window.__kzAnswer(); puzzle-type games that need many exact
// moves are explored with real taps first and then finished through window.__kzFinish().
//
//   npm run build && npx vite preview --port 5441 &
//   node tools/playall.mjs [baseUrl] [--only=brain,maps] [--sizes=375x667,1440x900] [--games=odd-one-out]
// Writes .playall/report.json and a screenshot of each game's end screen per size.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) || 'http://localhost:5441';
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const OUT = path.join(ROOT, '.playall');
fs.mkdirSync(OUT, { recursive: true });
const SIZES = (opt('sizes') || '375x667,414x896,768x1024,1024x768,1440x900,1920x1080').split(',').map((s) => s.split('x').map(Number));

const BRAIN = ['object-memory', 'visual-riddles', 'card-match', 'sequence-recall', 'tangram', 'maze', 'sliding-puzzle', 'kids-sudoku', 'fast-compare', 'color-word', 'word-scramble', 'quick-decision', 'symbol-spot', 'jigsaw', 'river-crossing', 'sequence-puzzle', 'reaction-test', 'odd-one-out', 'balance-challenge', 'find-different', 'logic-questions', 'quick-math', 'number-compare', 'number-patterns', 'target-finder', 'distraction-test', 'shape-assembly', 'drag-math', 'arithmetic-race', 'missing-number', 'shadow-match', 'mirror-image', 'shape-patterns', 'complete-pattern', 'rotation-patterns', 'block-build', 'shape-rotation'];
const MAPS = ['find-country', 'match-flags', 'guess-capital', 'landmark-detective', 'food-explorer', 'continent-challenge', 'identify-country', 'identify-state', 'find-capital', 'district-explorer', 'neighbours', 'daily'];
const PET_GAMES = ['Ball Catch', 'Obstacle Run', 'Hide & Seek', 'Bubble Pop', 'Memory Match', 'Treasure Hunt'];

/** A game: where it lives, how to start it, and how it ends. kind: 'rounds' (ends with the celebration),
 *  'puzzle' (explore with taps, then finish), 'endless' (check that three rounds move on by themselves). */
const GAMES = [
  ...BRAIN.map((id) => ({ world: 'brain', id, route: `/brain/play/${id}`, start: ['Start'], kind: 'rounds', exploreMs: 9000 })),
  ...MAPS.map((id) => ({ world: 'maps', id, route: `/maps/games/${id}`, start: ['Start', 'Play', 'Beginner'], kind: 'rounds' })),
  { world: 'maps', id: 'arrange-states', route: '/maps/puzzle/india', start: ['Start', 'Easy'], kind: 'puzzle', exploreMs: 3000 },
  { world: 'words', id: 'find-fruits', route: '/words/play/find/fruits-L1', start: ['Start'], kind: 'rounds' },
  { world: 'words', id: 'find-alphabets', route: '/words/play/find/alphabets-L1', start: ['Start'], kind: 'rounds' },
  { world: 'garden', id: 'level-1', route: '/garden', start: ['Play level'], kind: 'rounds', done: '.w-garden .result' },
  { world: 'puzzles', id: 'adaptive', route: '/puzzles', start: ['Start here', 'Continue playing', 'Play'], kind: 'endless' },
  { world: 'money', id: 'challenges', route: '/money', start: ['Challenge Mode'], kind: 'endless' },
  ...PET_GAMES.map((name) => ({ world: 'pets', id: name.toLowerCase().replace(/\W+/g, '-'), route: '/pets', pet: name, kind: 'puzzle', exploreMs: 4000 })),
  { world: 'shop', id: 'money-quiz', route: '/shop', start: ['Money Learning'], kind: 'rounds' },
  { world: 'shop', id: 'maths-quiz', route: '/shop', start: ['Maths Challenge'], kind: 'rounds' },
].filter((g) => (!opt('only') || opt('only').split(',').includes(g.world)) && (!opt('games') || opt('games').split(',').includes(g.id)));

const profile = { name: 'Asha', ageBand: '7-9', avatar: 'teal', createdAt: Date.now() };
const SEED = `localStorage.setItem('kidzzone:v1', JSON.stringify({ version: 1, profile: ${JSON.stringify(profile)}, settings: { sound: false, voice: 'normal', textSize: 'normal', reducedMotion: false }, worlds: {}, log: [], wallet: 40, mix: null, imported: ['__first-run'] }))`;

// ---------- in-page helpers ----------
const PAGE = String.raw`
window.__pa = {
  shown(el) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; },
  vis(el) { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; },
  name(el) { return (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40); },
  controls() {
    return [...document.querySelectorAll('#main :is(button, a[href], [role=button], [role=tab], [role=radio], select, input:not([type=hidden]):not([type=range]))')]
      .filter((el) => !el.closest('svg, [data-board], [data-small-ok], [aria-hidden=true], .sr-only') && !el.matches('.sr-only, [tabindex="-1"]:not(button)') && !(el.matches('a') && el.closest('p, li') && !el.className) && this.vis(el) && !el.disabled);
  },
  check() {
    const out = { small: [], covered: [], scroll: document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth : 0 };
    const header = [...document.querySelectorAll('header.sticky, .kz-chrome, .md-top-app-bar, .ios-navbar')].reduce((m, h) => Math.max(m, h.getBoundingClientRect().bottom), 0);
    const bottomBar = [...document.querySelectorAll('nav.fixed.bottom-0, .md-navigation-bar, .ios-tabbar')].reduce((m, h) => { const r = h.getBoundingClientRect(); return r.height ? Math.min(m, r.top) : m; }, innerHeight);
    for (const el of this.controls()) {
      const r = el.getBoundingClientRect();
      if (r.width < 63.5 || r.height < 63.5) out.small.push(this.name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cy <= header + 2 || cy >= bottomBar - 2 || cx < 0 || cx > innerWidth || cy < 0 || cy > innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && hit !== el && !el.contains(hit) && !(hit.closest('[role=dialog], .modal, [aria-modal=true]') && !el.closest('[role=dialog], .modal, [aria-modal=true]')) && !(hit.closest('.kz-cheer-wrap, [data-kz-complete]') && el.closest('[data-kz-complete]'))) out.covered.push(this.name(el) + ' <- ' + (hit.closest('button,a,[role=button]') ? this.name(hit.closest('button,a,[role=button]')) : hit.className?.toString().slice(0, 30) || hit.tagName));
    }
    return out;
  },
  sig() {
    const r = document.querySelector('.kz-rounds');
    const k = [...document.querySelectorAll('[data-kz-round]')].map((e) => e.getAttribute('data-kz-round')).join(',');
    const q = document.querySelector('#main h1, #main h2, .w-garden .ask, .play-instruction');
    const ans = [...document.querySelectorAll('[data-kz-answer]')].map((e) => e.innerText || e.getAttribute('aria-label')).join(',');
    return k + '|' + (r ? r.getAttribute('aria-valuenow') : '') + '|' + (q ? q.innerText.slice(0, 80) : '') + '|' + ans.slice(0, 80) + '|' + (document.querySelector('.mm-main [aria-live]')?.innerText || '').slice(0, 40);
  },
  target() {
    const el = [...document.querySelectorAll('[data-kz-answer]')].find((e) => !e.disabled && this.vis(e));
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, ok: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) && (el === document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))) };
  },
  byText(words, scope) {
    const all = [...document.querySelectorAll('#main button, #main a[href], #main [role=button]')].filter((e) => this.shown(e) && !e.disabled && !e.closest(scope || 'nothing-excluded'));
    const lab = (e) => ((e.innerText || '') + ' | ' + (e.getAttribute('aria-label') || '')).trim().toLowerCase();
    for (const w of words) { const el = all.find((e) => lab(e).startsWith(w.toLowerCase()) || (e.getAttribute('aria-label') || '').toLowerCase().startsWith(w.toLowerCase())) || all.find((e) => lab(e).includes(w.toLowerCase())); if (el) { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, name: this.name(el) }; } }
    return null;
  },
  explore() {
    const bad = /exit|quit|pause|back|hint|home|menu|map|settings|restart|reset|undo|close|leave|stop|sound|parent|progress|learn|play$|explore|rewards|skip|different|choose|world|india|today|landmarks|cultures|games|passport/i;
    const all = this.controls().filter((e) => !bad.test(this.name(e)) && !e.closest('.kz-bar-inner, header'));
    if (!all.length) return null;
    const el = all[Math.floor(Math.random() * all.length)];
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, name: this.name(el) };
  },
  done(sel) { const c = document.querySelector(sel || '[data-kz-complete]'); return c && this.shown(c) ? { replay: [...c.querySelectorAll('button, a')].some((b) => /replay/i.test(b.innerText)) } : null; },
};`;

async function click(c, x, y) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'mouse' });
}
const ev = (c, js) => c.evaluate(`(()=>{ ${PAGE}; return (${js}); })()`);

async function playOne(c, g, w, h) {
  const res = { world: g.world, id: g.id, size: `${w}x${h}`, ok: false, rounds: 0, autoAdvance: 0, autoFail: 0, forced: false, small: new Set(), covered: new Set(), scroll: 0, errors: [], note: '' };
  c.events.length = 0;
  await c.send('Page.navigate', { url: `${BASE}/?app=web&kztest=1#${g.route}` });
  await sleep(2600);
  const record = async () => {
    const k = await ev(c, '__pa.check()');
    if (!k) return;
    k.small.forEach((s) => res.small.add(s));
    k.covered.forEach((s) => res.covered.add(s));
    if (k.scroll) res.scroll = Math.max(res.scroll, k.scroll);
  };
  // start
  if (g.pet) {
    for (const step of [['Enter Adoption Center'], null, ['Adopt', 'Choose', 'Take'], ['Adopt']]) {
      if (step === null) { const p = await ev(c, `(()=>{const b=[...document.querySelectorAll('.w-pets button')].filter(e=>__pa.vis(e)&&/puppy|kitten|bunny|panda|fox|dog|cat/i.test(e.innerText+e.getAttribute('aria-label')))[0]; if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()`); if (p) await click(c, p.x, p.y); await sleep(1200); continue; }
      const t = await ev(c, `__pa.byText(${JSON.stringify(step)}, '.kz-bar-inner')`);
      if (t) { await click(c, t.x, t.y); await sleep(1400); }
    }
    for (const step of [['🎮 Play', 'Play'], [g.pet], ['Start']]) {
      const t = await ev(c, `(()=>{ const all=[...document.querySelectorAll('.w-pets button, .w-pets a')].filter(e=>__pa.shown(e)&&!e.closest('.kz-bar-inner')); const w=${JSON.stringify(step)}; const t=(e)=>(e.innerText||e.getAttribute('aria-label')||'').trim().toLowerCase(); const ws=w.map(x=>x.toLowerCase().replace('🎮 ','')); const el=all.find(e=>ws.includes(t(e)))||all.find(e=>ws.some(x=>t(e).startsWith(x)))||all.find(e=>ws.some(x=>t(e).includes(x))); if(!el) return null; el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,name:el.innerText.slice(0,20)} })()`);
      if (t) { await click(c, t.x, t.y); await sleep(1400); }
    }
  } else if (g.start) {
    for (let i = 0; i < 2; i++) {
      const t = await ev(c, `__pa.byText(${JSON.stringify(g.start)})`);
      if (!t) break;
      await click(c, t.x, t.y);
      await sleep(g.world === 'brain' ? 3200 : 1800);
      if (g.world !== 'maps') break;
    }
  }
  await record();
  const t0 = Date.now();
  const limit = g.kind === 'endless' ? 60000 : 150000;
  let explored = 0;
  while (Date.now() - t0 < limit) {
    const d = await ev(c, `__pa.done(${JSON.stringify(g.done || '')})`);
    if (d) { res.ok = g.done ? true : d.replay; if (!d.replay && !g.done) res.note = 'end screen without Replay'; await sleep(900); await record(); break; }
    if (g.kind === 'endless' && res.autoAdvance >= 3) { res.ok = true; res.note = 'endless: 3 rounds moved on by themselves'; break; }
    const before = await ev(c, '__pa.sig()');
    const tgt = await ev(c, '__pa.target()');
    let answered = false;
    if (tgt) {
      if (!tgt.ok) res.covered.add('right answer covered at its centre');
      await click(c, tgt.x, tgt.y);
      answered = true;
    } else if (await c.evaluate('typeof window.__kzAnswer === "function"')) {
      await c.evaluate('window.__kzAnswer()');
      answered = true;
    } else if (await c.evaluate('typeof window.__kzFinish === "function"') && (g.kind === 'puzzle' || g.kind === 'rounds') && explored * 700 >= (g.exploreMs ?? 0)) {
      await c.evaluate('window.__kzFinish()');
      res.forced = true;
      await sleep(1500);
      continue;
    } else {
      const e = await ev(c, '__pa.explore()');
      if (e) await click(c, e.x, e.y);
      explored++;
      await sleep(700);
      if (explored % 6 === 0) await record();
      continue;
    }
    if (answered) {
      res.rounds++;
      await sleep(700);
      if (res.rounds <= 2) await record(); // mid-round, with the cheer up
      // no more input: the round must move on (or the game end) by itself
      let moved = false;
      for (let i = 0; i < 14 && !moved; i++) {
        await sleep(350);
        const now = await ev(c, '__pa.sig()');
        if (now !== before || (await ev(c, `__pa.done(${JSON.stringify(g.done || '')})`))) moved = true;
      }
      if (moved) res.autoAdvance++;
      else res.autoFail++;
    }
  }
  if (!res.ok && !res.note) res.note = 'did not reach the end screen in time';
  const errs = c.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
  res.errors = errs.map((e) => JSON.stringify(e.params.exceptionDetails?.exception?.description || e.params.args?.map((a) => a.value || a.description)).slice(0, 220));
  const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
  fs.writeFileSync(path.join(OUT, `${g.world}-${g.id}-${w}x${h}.jpg`), Buffer.from(shot.result.data, 'base64'));
  return { ...res, small: [...res.small].slice(0, 12), covered: [...res.covered].slice(0, 12) };
}

async function worker([w, h]) {
  const c = await launch(ROOT);
  const results = [];
  try {
    await c.send('Runtime.enable');
    await c.send('Page.enable');
    await c.send('Page.navigate', { url: BASE + '/favicon.svg' });
    await sleep(800);
    await c.evaluate(SEED);
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    if (w < 768) await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    for (const g of GAMES) {
      let r;
      try { r = await playOne(c, g, w, h); } catch (e) { r = { world: g.world, id: g.id, size: `${w}x${h}`, ok: false, note: 'harness error: ' + e.message, errors: [], small: [], covered: [] }; }
      results.push(r);
      console.log(`${r.size} ${g.world}/${g.id}: ${r.ok ? 'OK' : 'FAIL'} rounds=${r.rounds} auto=${r.autoAdvance}/${r.autoAdvance + r.autoFail}${r.forced ? ' (finished via test hook)' : ''}${r.scroll ? ' HSCROLL=' + r.scroll : ''} small=${r.small.length} covered=${r.covered.length} errors=${r.errors.length} ${r.note}`);
    }
  } finally {
    await c.close();
  }
  return results;
}

const all = (await Promise.all(SIZES.map(worker))).flat();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(all, null, 1));
const fails = all.filter((r) => !r.ok || r.errors.length || r.scroll || r.autoFail);
console.log(`\n${all.length} runs, ${all.filter((r) => r.ok).length} reached the end, ${fails.length} with problems. Report: .playall/report.json`);
if (fails.length) process.exitCode = 1;
