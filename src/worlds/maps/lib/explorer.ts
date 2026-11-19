// World Explorer content: landmarks, foods, clothing, festivals, greetings, continent and
// country profiles (curated, src/data/explorer.json) joined with photos, credits and
// coordinates from Wikipedia/Commons and languages/currencies/cities per country
// (both built by scripts/build-explorer.mjs).

import explorerJson from "@/data/explorer.json";
import mediaJson from "@/data/generated/media.json";
import extraJson from "@/data/generated/countries-extra.json";
import { continentLabel, COUNTRIES, countryName, getCountry, peopleText, type Continent, type Country } from "./world";

export type LandmarkCategory = "historical" | "modern" | "natural" | "religious" | "ancient" | "famous-buildings";

export const CATEGORIES: { id: LandmarkCategory; label: string }[] = [
  { id: "historical", label: "Historical monuments" },
  { id: "modern", label: "Modern architecture" },
  { id: "natural", label: "Natural wonders" },
  { id: "religious", label: "Religious architecture" },
  { id: "ancient", label: "Ancient civilisations" },
  { id: "famous-buildings", label: "Famous buildings" },
];

export interface Media {
  article: string;
  image: string | null;
  coords: [number, number] | null;
  credit: { page: string; artist: string; license: string } | null;
}

export interface Landmark {
  id: string;
  /** Indian states it belongs to (Indian items only) */
  states?: string[];
  wiki: string;
  name: string;
  country: string;
  city: string;
  category: LandmarkCategory;
  period: string;
  style: string;
  why: string;
  facts: string[];
}
export interface Food { id: string; states?: string[]; wiki: string; name: string; country: string; ingredients: string[]; fact: string }
export interface Clothing { id: string; wiki: string; name: string; country: string; about: string }
export interface Festival { id: string; states?: string[]; wiki: string; name: string; country: string | null; when: string; about: string }
export interface Greeting { id: string; country: string; language: string; word: string; native: string; voice: string; meaning: string }
export interface Profile { languages?: string[]; animal: string | null; features: string[]; climate: string; facts: string[] }

const data = explorerJson as unknown as {
  landmarks: Landmark[];
  foods: Food[];
  clothing: Clothing[];
  festivals: Festival[];
  greetings: Greeting[];
  continents: Record<string, { facts: string[]; wildlife: string[]; people: string }>;
  profiles: Record<string, Profile>;
};
const media = mediaJson as unknown as Record<string, Media>;
const extra = extraJson as unknown as Record<string, { languages: string[]; currencies: { code: string; name: string; symbol: string }[]; latlng: [number, number] | null; cities: string[] }>;

export const LANDMARKS = data.landmarks;
export const FOODS = data.foods;
export const CLOTHING = data.clothing;
export const FESTIVALS = data.festivals;
export const GREETINGS = data.greetings;

export const mediaFor = (id: string): Media | undefined => media[id];
export const getLandmark = (id: string) => LANDMARKS.find((l) => l.id === id);
export const landmarksIn = (countryId: string) => LANDMARKS.filter((l) => l.country === countryId);
export const foodsIn = (countryId: string) => FOODS.filter((f) => f.country === countryId);
export const festivalsIn = (countryId: string) => FESTIVALS.filter((f) => f.country === countryId);
export const clothingIn = (countryId: string) => CLOTHING.filter((f) => f.country === countryId);
export const greetingsIn = (countryId: string) => GREETINGS.filter((g) => g.country === countryId);
export const continentInfo = (c: Continent) => data.continents[c];
export const landmarksOnContinent = (c: Continent) => LANDMARKS.filter((l) => getCountry(l.country)?.continent === c);

/** Everything known about a country, from data and curated profiles. Fields are empty when unknown. */
export function countryDetails(c: Country) {
  const ex = extra[c.id];
  const prof = data.profiles[c.id];
  return {
    languages: prof?.languages ?? ex?.languages ?? [],
    currencies: ex?.currencies ?? [],
    cities: ex?.cities ?? [],
    latlng: ex?.latlng ?? null,
    animal: prof?.animal ?? null,
    features: prof?.features ?? [],
    climate: prof?.climate ?? null,
    facts: prof?.facts ?? [],
    featured: Boolean(prof),
  };
}
export const FEATURED = Object.keys(data.profiles);

/** Flag image from flagcdn (falls back to the emoji flag in the UI). */
export const flagUrl = (iso2: string | null, w = 160) => (iso2 && /^[A-Za-z]{2}$/.test(iso2) ? `https://flagcdn.com/w${w}/${iso2.toLowerCase()}.png` : null);

/** Countries suitable for games at each difficulty. */
export function gamePool(level: "beginner" | "intermediate" | "advanced"): Country[] {
  const sovereign = COUNTRIES.filter((c) => /^(Sovereign country|Country|Sovereignty)$/.test(c.kind) && c.continent !== "Antarctica");
  if (level === "beginner") return sovereign.filter((c) => c.pop >= 30_000_000 || FEATURED.includes(c.id));
  if (level === "intermediate") return sovereign.filter((c) => c.pop >= 3_000_000);
  return sovereign;
}

/** Everything on a country card, as one sentence list for read-aloud. */
export const describeCountry = (id: string) => {
  const c = getCountry(id)!;
  const d = countryDetails(c);
  const parts = [`${c.name}.`];
  if (c.name !== c.continent) parts.push(`It is in ${continentLabel(c.continent)}${c.kind === "Dependency" ? `, and is part of ${c.sovereign}` : ""}.`);
  if (c.capitals.length) parts.push(`${c.capitals.length > 1 ? "Its capitals are" : "Its capital is"} ${c.capitals.join(" and ")}.`);
  parts.push(`People: ${peopleText(c)}.`);
  if (d.languages.length) parts.push(`People speak ${d.languages.slice(0, 3).join(", ")}.`);
  if (d.currencies[0]) parts.push(`Money: the ${d.currencies[0].name}.`);
  parts.push(c.neighbours.length ? `Its neighbours are ${c.neighbours.map((n) => countryName(n)).join(", ")}.` : "It has no land neighbours. There is only sea all around.");
  return parts.join(" ").replace(/\.\./g, ".");
};


/** Landmarks, foods and festivals linked to an Indian state; India-wide festivals for every state. */
export function forIndianState(stateId: string) {
  return {
    landmarks: LANDMARKS.filter((l) => l.states?.includes(stateId)),
    foods: FOODS.filter((f) => f.states?.includes(stateId)),
    festivals: [...FESTIVALS.filter((f) => f.states?.includes(stateId)), ...FESTIVALS.filter((f) => f.country === "in" && !f.states)],
  };
}
