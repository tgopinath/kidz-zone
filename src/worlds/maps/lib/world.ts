// World content: countries from Natural Earth (India point of view), with India drawn
// from the official LGD outline. Built by scripts/build-world.mjs.

import worldIndex from "@/data/generated/world-index.json";

export type Continent = "Asia" | "Africa" | "Europe" | "North America" | "South America" | "Oceania" | "Antarctica";

export interface Country {
  id: string;
  name: string;
  iso2: string | null;
  continent: Continent;
  subregion: string;
  pop: number;
  kind: string;
  sovereign: string;
  capitals: string[];
  neighbours: string[];
}

const index = worldIndex as unknown as { source: string; builtOn: string; countries: Country[] };

export const WORLD_SOURCE = index.source;
export const COUNTRIES = index.countries;
const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
export const getCountry = (id: string) => byId.get(id);
export const countryName = (id: string) => byId.get(id)?.name ?? id;

/** Independent countries (not territories), used for quizzes and counts. */
export const isCountry = (c: Country) => /^(Sovereign country|Country|Sovereignty|Disputed|Indeterminate)$/.test(c.kind) && c.continent !== "Antarctica";

export const CONTINENTS: { id: Continent; slug: string; colour: string; blurb: string }[] = [
  { id: "Asia", slug: "asia", colour: "#ffb899", blurb: "The biggest continent — India is here!" },
  { id: "Africa", slug: "africa", colour: "#ffd98a", blurb: "Home of the Sahara and the Nile" },
  { id: "Europe", slug: "europe", colour: "#9cc3ff", blurb: "Lots of countries close together" },
  { id: "North America", slug: "north-america", colour: "#9fddbf", blurb: "From icy Greenland to sunny Panama" },
  { id: "South America", slug: "south-america", colour: "#cdb8f5", blurb: "Home of the Amazon rainforest" },
  { id: "Oceania", slug: "oceania", colour: "#8ed9d9", blurb: "Australia and thousands of islands" },
  { id: "Antarctica", slug: "antarctica", colour: "#e3e8f2", blurb: "The frozen continent at the South Pole" },
];
export const continentBySlug = (slug: string) => CONTINENTS.find((c) => c.slug === slug);
export const continentColour = (c: Continent) => CONTINENTS.find((x) => x.id === c)?.colour ?? "#e3e8f2";

/** Map extents for continent puzzles, as [west, south, east, north]. Oceania crosses the date line. */
export const CONTINENT_BOX: Partial<Record<Continent, { box: [number, number, number, number]; rotate?: number }>> = {
  Asia: { box: [25, -11, 150, 56] },
  Africa: { box: [-19, -36, 53, 38] },
  Europe: { box: [-25, 34, 45, 71] },
  "North America": { box: [-170, 6, -52, 75] },
  "South America": { box: [-82, -56, -34, 13] },
  Oceania: { box: [110, -48, 230, 2], rotate: -170 },
};

export const flagOf = (c: Country) =>
  c.iso2 && /^[A-Z]{2}$/.test(c.iso2) ? String.fromCodePoint(...[...c.iso2].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : "🏳️";

/** "about 1.4 billion people" style text for children. */
export function popText(n: number) {
  if (!n) return "Almost nobody lives here";
  if (n >= 1e9) return `about ${(n / 1e9).toFixed(1)} billion people`;
  if (n >= 1e6) return `about ${n >= 1e7 ? Math.round(n / 1e6) : (n / 1e6).toFixed(1)} million people`;
  if (n >= 1e3) return `about ${Math.round(n / 1e3)} thousand people`;
  return `about ${n} people`;
}

export const countriesIn = (c: Continent) => COUNTRIES.filter((x) => x.continent === c);

/** Population line for a country card, with plain words where a number would confuse children. */
export function peopleText(c: Country) {
  if (c.name === "Antarctica")
    return "Nobody lives here all year. Only scientists visit research stations — about 4 thousand in summer, and fewer in winter.";
  if (c.pop > 0 && c.pop < 1000) return `Very few people — about ${c.pop}`;
  return popText(c.pop);
}

/** Where the globe turns to for each continent (lon, lat) and how far it zooms in. */
export const CONTINENT_FOCUS: Record<Continent, { coords: [number, number]; zoom: number }> = {
  Asia: { coords: [90, 30], zoom: 1.4 },
  Africa: { coords: [20, 3], zoom: 1.5 },
  Europe: { coords: [15, 52], zoom: 2.2 },
  "North America": { coords: [-100, 40], zoom: 1.4 },
  "South America": { coords: [-60, -18], zoom: 1.6 },
  Oceania: { coords: [145, -25], zoom: 1.6 },
  Antarctica: { coords: [0, -82], zoom: 1.3 },
};
/** Children often learn "Australia" as the continent's name. */
export const continentLabel = (c: Continent) => (c === "Oceania" ? "Australia & Oceania" : c);
