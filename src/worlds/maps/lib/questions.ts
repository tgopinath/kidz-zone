// Question generators for quizzes and mini games. Every answer is derived from the
// content layer (curated capitals) or the boundary data (neighbours, districts).

import { getDistricts, getState, sample, shortCapital, shuffle, STATES, type StateInfo } from "./content";
import { CONTINENTS, COUNTRIES, getCountry, isCountry } from "./world";
import { FOODS, gamePool, LANDMARKS, mediaFor } from "./explorer";

export type Question =
  | { kind: "mcq"; id: string; prompt: string; map: "india" | "district" | "world" | "globe" | "none"; highlight: string | null; options: string[]; answer: string; key: string; explain: string; image?: string; optionFlags?: string[] }
  | { kind: "tap"; id: string; prompt: string; map: "india" | "district" | "world" | "globe"; answer: string; key: string; explain: string };

/** Pick distractors close to the answer first (neighbours, same region) so questions make kids think. */
function nearFirst<T>(pool: T[], near: T[], n: number) {
  const a = shuffle([...new Set(near)].filter((x) => pool.includes(x))).slice(0, Math.ceil(n / 2));
  const rest = shuffle(pool.filter((x) => !a.includes(x)));
  return [...a, ...rest].slice(0, n);
}

const sameRegion = (s: StateInfo) => STATES.filter((x) => x.region === s.region && x.id !== s.id).map((x) => x.id);

export function identifyStateQs(n = 10): Question[] {
  return sample(STATES, n).map((s) => {
    const others = nearFirst(STATES.map((x) => x.id).filter((id) => id !== s.id), [...s.neighbours, ...sameRegion(s)], 3);
    return {
      kind: "mcq",
      id: `id-${s.id}`,
      prompt: "Which state or Union Territory is glowing?",
      map: "india",
      highlight: s.id,
      options: shuffle([s.id, ...others]).map((id) => getState(id)!.name),
      answer: s.name,
      key: `state:${s.id}`,
      explain: `That's ${s.name}, in ${s.region === "Islands" ? "the islands" : `${s.region} India`}.`,
    };
  });
}

// States that share a capital city are skipped so every answer is unique.
const uniqueCapital = () => {
  const counts = new Map<string, number>();
  STATES.forEach((s) => counts.set(shortCapital(s), (counts.get(shortCapital(s)) ?? 0) + 1));
  return STATES.filter((s) => counts.get(shortCapital(s)) === 1);
};

export function capitalMcqQs(n = 5): Question[] {
  const pool = uniqueCapital();
  return sample(pool, n).map((s) => {
    const others = nearFirst(pool.filter((x) => x.id !== s.id), pool.filter((x) => x.region === s.region), 3);
    return {
      kind: "mcq",
      id: `cap-${s.id}`,
      prompt: `What is the capital of ${s.name}?`,
      map: "india",
      highlight: s.id,
      options: shuffle([s, ...others]).map(shortCapital),
      answer: shortCapital(s),
      key: `capital:${s.id}`,
      explain: `${s.name}'s capital is ${s.capital}.`,
    };
  });
}

export function findCapitalQs(n = 10): Question[] {
  return sample(uniqueCapital(), n).map((s) => ({
    kind: "tap",
    id: `fc-${s.id}`,
    prompt: `${shortCapital(s)} is a capital city. Tap its ${s.type === "ut" ? "Union Territory" : "state"}!`,
    map: "india",
    answer: s.id,
    key: `capital:${s.id}`,
    explain: `${shortCapital(s)} is the capital of ${s.name}.`,
  }));
}

export function neighbourMcqQs(n = 5): Question[] {
  const pool = STATES.filter((s) => s.neighbours.length > 0 && STATES.length - s.neighbours.length > 4);
  return sample(pool, n).map((s) => {
    const right = sample(s.neighbours, 1)[0];
    const wrong = nearFirst(
      STATES.map((x) => x.id).filter((id) => id !== s.id && !s.neighbours.includes(id)),
      sameRegion(s),
      3,
    );
    return {
      kind: "mcq",
      id: `nb-${s.id}`,
      prompt: `Which of these is a neighbour of ${s.name}?`,
      map: "india",
      highlight: s.id,
      options: shuffle([right, ...wrong]).map((id) => getState(id)!.name),
      answer: getState(right)!.name,
      key: `neighbour:${s.id}`,
      explain: `${s.name} touches ${s.neighbours.map((x) => getState(x)!.name).join(", ")}.`,
    };
  });
}

export function districtMcqQs(stateId: string, n = 10): Question[] {
  const ds = getDistricts(stateId);
  return sample(ds, Math.min(n, ds.length)).map((d) => {
    const others = nearFirst(ds.filter((x) => x.id !== d.id).map((x) => x.id), d.neighbours, 3);
    const nameOf = (id: string) => ds.find((x) => x.id === id)!.name;
    return {
      kind: "mcq",
      id: `dm-${d.id}`,
      prompt: "Which district is glowing?",
      map: "district",
      highlight: d.id,
      options: shuffle([d.id, ...others]).map(nameOf),
      answer: d.name,
      key: `district:${stateId}:${d.id}`,
      explain: d.headquarters ? `That's ${d.name}. Its headquarters is ${d.headquarters}.` : `That's ${d.name}.`,
    };
  });
}

export function districtTapQs(stateId: string, n = 10): Question[] {
  return sample(getDistricts(stateId), n).map((d) => ({
    kind: "tap",
    id: `dt-${d.id}`,
    prompt: `Where is ${d.name}? Tap it on the map!`,
    map: "district",
    answer: d.id,
    key: `district:${stateId}:${d.id}`,
    explain: d.fact ?? `${d.name} is a district of ${getState(stateId)!.name}.`,
  }));
}

// Countries big enough (or populous enough) to be a fair question for children.
const QUIZ_COUNTRIES = () => COUNTRIES.filter((c) => isCountry(c) && c.pop >= 2_000_000);

export function identifyCountryQs(n = 10): Question[] {
  const pool = QUIZ_COUNTRIES();
  return sample(pool, n).map((c) => {
    const others = nearFirst(
      pool.filter((x) => x.id !== c.id).map((x) => x.id),
      [...c.neighbours, ...pool.filter((x) => x.continent === c.continent).map((x) => x.id)],
      3,
    );
    return {
      kind: "mcq",
      id: `ic-${c.id}`,
      prompt: "Which country is glowing?",
      map: "world",
      highlight: c.id,
      options: shuffle([c.id, ...others]).map((id) => getCountry(id)!.name),
      answer: c.name,
      key: `country:${c.id}`,
      explain: `That's ${c.name}, in ${c.continent}.${c.capitals.length ? ` Its capital is ${c.capitals[0]}.` : ""}`,
    };
  });
}

export function continentQs(n = 5): Question[] {
  const names = CONTINENTS.filter((k) => k.id !== "Antarctica").map((k) => k.id);
  return sample(QUIZ_COUNTRIES(), n).map((c) => ({
    kind: "mcq",
    id: `ct-${c.id}`,
    prompt: `${c.name} is glowing. Which continent is it in?`,
    map: "world",
    highlight: c.id,
    options: shuffle([c.continent, ...sample(names.filter((x) => x !== c.continent), 3)]),
    answer: c.continent,
    key: `continent:${c.id}`,
    explain: `${c.name} is in ${c.continent}.`,
  }));
}

// ---------- World Explorer games ----------


export type Level = "beginner" | "intermediate" | "advanced";
const optionCount = (level: Level) => (level === "beginner" ? 3 : 4);

/** Pick wrong answers that are believable: same continent first. */
function countryOptions(answerId: string, level: Level, extraPool?: string[]) {
  const pool = extraPool ?? gamePool(level).map((c) => c.id);
  const a = getCountry(answerId)!;
  const near = pool.filter((id) => id !== answerId && getCountry(id)?.continent === a.continent);
  const others = nearFirst(pool.filter((id) => id !== answerId), near, optionCount(level) - 1);
  return shuffle([answerId, ...others]);
}

export function findCountryQs(level: Level, n = 8): Question[] {
  return sample(gamePool(level), n).map((c) => ({
    kind: "tap",
    id: `find-${c.id}`,
    prompt: `Find ${c.name} on the globe!`,
    map: "globe",
    answer: c.id,
    key: `country:${c.id}`,
    explain: `${c.name} is in ${c.continent}.`,
  }));
}

export function worldCapitalQs(level: Level, n = 10): Question[] {
  const pool = gamePool(level).filter((c) => c.capitals.length === 1);
  return sample(pool, n).map((c) => {
    const others = nearFirst(pool.filter((x) => x.id !== c.id), pool.filter((x) => x.continent === c.continent), optionCount(level) - 1);
    return {
      kind: "mcq",
      id: `wcap-${c.id}`,
      prompt: `What is the capital of ${c.name}?`,
      map: "globe",
      highlight: c.id,
      options: shuffle([c, ...others]).map((x) => x.capitals[0]),
      answer: c.capitals[0],
      key: `wcapital:${c.id}`,
      explain: `The capital of ${c.name} is ${c.capitals[0]}.`,
    };
  });
}

export function landmarkDetectiveQs(level: Level, n = 8): Question[] {
  const withPhotos = LANDMARKS.filter((l) => mediaFor(l.id)?.image);
  const ids = [...new Set([...gamePool(level).map((c) => c.id), ...withPhotos.map((l) => l.country)])];
  return sample(withPhotos, n).map((l) => {
    const opts = countryOptions(l.country, level, ids);
    return {
      kind: "mcq",
      id: `ld-${l.id}`,
      prompt: "Landmark detective: which country is this place in?",
      map: "none",
      image: l.id,
      highlight: null,
      options: opts.map((id) => getCountry(id)!.name),
      optionFlags: opts,
      answer: getCountry(l.country)!.name,
      key: `landmark:${l.id}`,
      explain: `That's ${l.name}, in ${l.city}, ${getCountry(l.country)!.name}.`,
    };
  });
}

export function foodExplorerQs(level: Level, n = 8): Question[] {
  const withPhotos = FOODS.filter((f) => mediaFor(f.id)?.image);
  const ids = [...new Set([...gamePool(level).map((c) => c.id), ...withPhotos.map((f) => f.country)])];
  return sample(withPhotos, n).map((f) => {
    const opts = countryOptions(f.country, level, ids);
    return {
      kind: "mcq",
      id: `fe-${f.id}`,
      prompt: "Food explorer: which country does this dish come from?",
      map: "none",
      image: f.id,
      highlight: null,
      options: opts.map((id) => getCountry(id)!.name),
      optionFlags: opts,
      answer: getCountry(f.country)!.name,
      key: `food:${f.id}`,
      explain: `That's ${f.name}, from ${getCountry(f.country)!.name}.`,
    };
  });
}

export function flagQuizQs(level: Level, n = 8): Question[] {
  return sample(gamePool(level).filter((c) => c.iso2), n).map((c) => {
    const opts = countryOptions(c.id, level);
    return {
      kind: "mcq",
      id: `flag-${c.id}`,
      prompt: "Whose flag is this? The country is glowing on the globe.",
      map: "globe",
      highlight: c.id,
      options: opts.map((id) => getCountry(id)!.name),
      optionFlags: opts,
      answer: c.name,
      key: `flag:${c.id}`,
      explain: `That is the flag of ${c.name}.`,
    };
  });
}

/** The same five questions for everyone on a given day. */
export function dailyQs(day: string): Question[] {
  let seed = [...day].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  // Run the normal generators with a day-seeded random so the set is reproducible.
  const real = Math.random;
  Math.random = rand;
  try {
    const qs = [worldCapitalQs("beginner", 1)[0], landmarkDetectiveQs("beginner", 1)[0], identifyStateQs(1)[0], foodExplorerQs("beginner", 1)[0], identifyCountryQs(1)[0]];
    return qs.map((q, i) => ({ ...q, id: `daily-${day}-${i}` }));
  } finally {
    Math.random = real;
  }
}
