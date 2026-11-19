// Demo data for screenshots (a child 'Asha' with ten days of play), shared by shots.mjs and ios-shots.sh.
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

export { seed, garden };
