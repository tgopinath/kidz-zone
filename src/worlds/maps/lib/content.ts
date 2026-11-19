// Content layer: joins curated learning content (src/data/*.json) with facts derived
// from verified boundary data (src/data/generated/geo-index.json).
//
// To add curated district content for another state, drop a file in
// src/data/districts/<state-id>.json (same shape as tamil-nadu.json) and register it below.

import statesJson from "@/data/states.json";
import geoIndex from "@/data/generated/geo-index.json";
import tamilNadu from "@/data/districts/tamil-nadu.json";

export type Region = "North" | "South" | "East" | "West" | "Central" | "North-East" | "Islands";
export type DataStatus = "verified" | "snapshot" | "issues";

export interface StateInfo {
  id: string;
  lgd: number;
  name: string;
  type: "state" | "ut";
  capital: string;
  region: Region;
  languages: string[];
  famousPlaces: string[];
  facts: string[];
  districtCount: number;
  neighbours: string[];
  dataStatus: DataStatus;
  issues: string[];
  /** Tamil name and capital, for reading aloud and display */
  ta?: { name: string; capital: string };
}

export interface DistrictInfo {
  id: string;
  lgd: number;
  stateId: string;
  name: string;
  lgdName: string;
  headquarters: string | null;
  fact: string | null;
  neighbours: string[];
  /** true when name/headquarters/fact come from a curated, reviewed file */
  curated: boolean;
  ta?: { name: string; headquarters: string; fact: string };
}

interface CuratedDistricts {
  districts: Record<string, { name: string; headquarters: string; fact: string; ta?: { name: string; headquarters: string; fact: string } }>;
}

const CURATED: Record<string, CuratedDistricts> = {
  "tamil-nadu": tamilNadu as CuratedDistricts,
};

type GeoState = {
  districtCount: number;
  dataStatus: DataStatus;
  issues: string[];
  neighbours: string[];
  districts: { id: string; lgd: number; lgdName: string; neighbours: string[] }[];
};
const geo = geoIndex as unknown as { source: string; builtOn: string; states: Record<string, GeoState> };

export const MAP_SOURCE = geo.source;
export const MAP_BUILT_ON = geo.builtOn;
export const PILOT_STATE = "tamil-nadu";

export const STATES: StateInfo[] = (statesJson.states as Omit<StateInfo, "districtCount" | "neighbours" | "dataStatus" | "issues">[])
  .map((s) => {
    const g = geo.states[s.id];
    return { ...s, districtCount: g.districtCount, neighbours: g.neighbours, dataStatus: g.dataStatus, issues: g.issues };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const byId = new Map(STATES.map((s) => [s.id, s]));
export const getState = (id: string) => byId.get(id);
export const stateName = (id: string) => byId.get(id)?.name ?? id;

export const STATE_COUNT = STATES.filter((s) => s.type === "state").length;
export const UT_COUNT = STATES.filter((s) => s.type === "ut").length;

/** Capital with seasonal notes stripped, e.g. "Shimla (summer), Dharamshala (winter)" -> "Shimla & Dharamshala". */
export function shortCapital(s: StateInfo) {
  return s.capital.replace(/\s*\([^)]*\)/g, "").replace(", ", " & ");
}

const districtCache = new Map<string, DistrictInfo[]>();
export function getDistricts(stateId: string): DistrictInfo[] {
  const hit = districtCache.get(stateId);
  if (hit) return hit;
  const g = geo.states[stateId];
  if (!g) return [];
  const cur = CURATED[stateId]?.districts;
  const list = g.districts
    .map((d) => {
      const c = cur?.[String(d.lgd)];
      return {
        id: d.id,
        lgd: d.lgd,
        stateId,
        name: c?.name ?? d.lgdName,
        lgdName: d.lgdName,
        headquarters: c?.headquarters ?? null,
        fact: c?.fact ?? null,
        neighbours: d.neighbours,
        curated: Boolean(c),
        ta: c?.ta,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  districtCache.set(stateId, list);
  return list;
}

export const hasCuratedDistricts = (stateId: string) => Boolean(CURATED[stateId]);

export const REGION_COLOURS: Record<Region, string> = {
  North: "#9cc3ff",
  South: "#9fddbf",
  East: "#ffd98a",
  West: "#ffb899",
  Central: "#cdb8f5",
  "North-East": "#8ed9d9",
  Islands: "#ffb3c7",
};

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = <T,>(arr: T[], n: number) => shuffle(arr).slice(0, n);

/** "1 district" / "38 districts" */
export const districtsLabel = (n: number) => `${n} ${n === 1 ? "district" : "districts"}`;
