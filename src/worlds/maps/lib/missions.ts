// Explorer missions. Each mission's progress is worked out from the saved progress, so
// nothing extra has to be stored; finishing missions unlocks trophies and secret destinations.

import { getCountry, type Continent } from "./world";
import { getState } from "./content";
import { getLandmark } from "./explorer";
import type { Progress } from "./progress";

export interface Mission {
  id: string;
  title: string;
  hint: string;
  href: string;
  goal: number;
  count: (p: Progress) => number;
  trophy: string;
}

const inContinent = (p: Progress, c: Continent) => p.countriesExplored.filter((id) => getCountry(id)?.continent === c).length;
const correctWith = (p: Progress, prefix: string) => Object.keys(p.correct).filter((k) => k.startsWith(prefix)).length;
const INDIA_NEIGHBOURS = ["af", "bd", "bt", "cn", "mm", "np", "pk"];

export const MISSIONS: Mission[] = [
  { id: "asia-5", title: "Discover five Asian countries", hint: "Tap countries in Asia on the world map.", href: "/world", goal: 5, count: (p) => inContinent(p, "Asia"), trophy: "Asia Adventurer" },
  { id: "eiffel", title: "Find the Eiffel Tower", hint: "Look in Landmarks 360.", href: "/landmarks/eiffel-tower", goal: 1, count: (p) => (p.landmarksSeen.includes("eiffel-tower") ? 1 : 0), trophy: "Paris Pathfinder" },
  { id: "india-neighbours", title: "Visit India's neighbouring countries", hint: "Afghanistan, Bangladesh, Bhutan, China, Myanmar, Nepal and Pakistan.", href: "/world/in", goal: INDIA_NEIGHBOURS.length, count: (p) => INDIA_NEIGHBOURS.filter((id) => p.countriesExplored.includes(id)).length, trophy: "Good Neighbour" },
  { id: "africa-landmarks", title: "Explore three African landmarks", hint: "Pyramids, the Sphinx, Kilimanjaro…", href: "/landmarks", goal: 3, count: (p) => p.landmarksSeen.filter((id) => getCountry(getLandmark(id)?.country ?? "")?.continent === "Africa").length, trophy: "Safari Scout" },
  { id: "foods-5", title: "Discover five traditional foods", hint: "Flip food cards in Cultures & Food.", href: "/cultures", goal: 5, count: (p) => p.foodsSeen.length, trophy: "Little Chef" },
  { id: "flags-10", title: "Identify ten country flags", hint: "Play Match the Flags.", href: "/games/match-flags", goal: 10, count: (p) => correctWith(p, "flag:"), trophy: "Flag Spotter" },
  { id: "hello-5", title: "Say hello in five languages", hint: "Listen to greetings in Cultures & Food.", href: "/cultures?tab=greetings", goal: 5, count: (p) => p.greetingsHeard.length, trophy: "Friendly Voice" },
  { id: "continents", title: "Visit a country on every continent", hint: "Asia, Africa, Europe, both Americas and Oceania.", href: "/world", goal: 6, count: (p) => (["Asia", "Africa", "Europe", "North America", "South America", "Oceania"] as Continent[]).filter((c) => inContinent(p, c) > 0).length, trophy: "Globe Trotter" },
  { id: "india-states", title: "Learn about ten Indian states", hint: "Open state pages in Explore India.", href: "/states", goal: 10, count: (p) => p.statesViewed.filter((id) => getState(id)).length, trophy: "India Expert" },
  { id: "stamps-20", title: "Collect twenty passport stamps", hint: "Every country you explore gives you a stamp.", href: "/world", goal: 20, count: (p) => p.countriesExplored.length, trophy: "Super Traveller" },
];

export const missionState = (p: Progress) =>
  MISSIONS.map((m) => {
    const n = Math.min(m.goal, m.count(p));
    return { ...m, n, done: n >= m.goal };
  });

/** Secret destinations open up as missions are completed. */
export const SECRET_DESTINATIONS = [
  { landmark: "petra", needs: 2 },
  { landmark: "angkor-wat", needs: 4 },
  { landmark: "victoria-falls", needs: 6 },
];
export const isUnlocked = (p: Progress, landmarkId: string) => {
  const s = SECRET_DESTINATIONS.find((d) => d.landmark === landmarkId);
  return !s || missionState(p).filter((m) => m.done).length >= s.needs;
};
