"use client";

import { useMemo } from "react";
import { geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { useDistrictMap, type RegionFeature } from "@/lib/geo";

const W = 100;
const H = 112;
const cache = new WeakMap<RegionFeature[], { outline: string; byId: Map<string, { d: string; x: number; y: number; tiny: boolean }> }>();

function project(features: RegionFeature[]) {
  const hit = cache.get(features);
  if (hit) return hit;
  const fc = { type: "FeatureCollection" as const, features };
  const projection = geoMercator().fitExtent([[3, 3], [W - 3, H - 3]], fc);
  const path = geoPath(projection);
  const byId = new Map<string, { d: string; x: number; y: number; tiny: boolean }>();
  for (const f of features) {
    const [x, y] = projection([f.properties.lx, f.properties.ly]) ?? [0, 0];
    byId.set(f.properties.id, { d: path(f) ?? "", x, y, tiny: path.area(f) < 6 });
  }
  const result = { outline: [...byId.values()].map((v) => v.d).join(""), byId };
  cache.set(features, result);
  return result;
}

/** Draw once per page; every StateLocator reuses this outline of India. */
export function IndiaOutlineDefs({ features }: { features: RegionFeature[] }) {
  const { outline } = useMemo(() => project(features), [features]);
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <path id="imx-india-outline" d={outline} />
      </defs>
    </svg>
  );
}

/** A small map of India with one state or UT highlighted, so children can see where it is. */
export function StateLocator({ id, features, colour, size = 84, also = [], alsoColour = "#36b37e", bold = false }: { id: string; features: RegionFeature[]; colour: string; size?: number; also?: string[]; alsoColour?: string; bold?: boolean }) {
  const { byId } = useMemo(() => project(features), [features]);
  const s = byId.get(id);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} aria-hidden className="shrink-0">
      <use href="#imx-india-outline" fill="#ffffff" stroke={bold ? "#8f9bb3" : "#c3cde0"} strokeWidth={bold ? 1.2 : 0.35} />
      {also.map((x) => (
        <path key={x} d={byId.get(x)?.d} fill={alsoColour} stroke="#ffffff" strokeWidth={0.4} />
      ))}
      {s && <path d={s.d} fill={colour} stroke="#1f2a44" strokeWidth={bold ? 1.4 : 0.6} strokeLinejoin="round" />}
      {s?.tiny && (
        <>
          <circle cx={s.x} cy={s.y} r={bold ? 12 : 6} fill="none" stroke={bold ? colour : "#ff8b5c"} strokeWidth={bold ? 3 : 1.6} />
          <circle cx={s.x} cy={s.y} r={bold ? 5 : 2.4} fill={bold ? colour : "#ff8b5c"} />
        </>
      )}
    </svg>
  );
}

// ---------- World ----------

const WW = 120;
const WH = 64;
const worldCache = new WeakMap<RegionFeature[], { outline: string; byContinent: Map<string, string> }>();

function projectWorld(features: RegionFeature[], continentOf: (id: string) => string | undefined) {
  const hit = worldCache.get(features);
  if (hit) return hit;
  const fc = { type: "FeatureCollection" as const, features };
  const path = geoPath(geoNaturalEarth1().fitExtent([[2, 2], [WW - 2, WH - 2]], fc));
  const byContinent = new Map<string, string>();
  let outline = "";
  for (const f of features) {
    const d = path(f) ?? "";
    outline += d;
    const c = continentOf(f.properties.id);
    if (c) byContinent.set(c, (byContinent.get(c) ?? "") + d);
  }
  const result = { outline, byContinent };
  worldCache.set(features, result);
  return result;
}

/** Draw once per page; every ContinentLocator reuses this outline of the world. */
export function WorldOutlineDefs({ features, continentOf }: { features: RegionFeature[]; continentOf: (id: string) => string | undefined }) {
  const { outline } = projectWorld(features, continentOf);
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <path id="imx-world-outline" d={outline} />
      </defs>
    </svg>
  );
}

/** A small world map with one continent highlighted. */
export function ContinentLocator({ continent, features, continentOf, colour, size = 120 }: { continent: string; features: RegionFeature[]; continentOf: (id: string) => string | undefined; colour: string; size?: number }) {
  const { byContinent } = projectWorld(features, continentOf);
  return (
    <svg viewBox={`0 0 ${WW} ${WH}`} width={size} height={(size * WH) / WW} aria-hidden className="shrink-0">
      <use href="#imx-world-outline" fill="#ffffff" stroke="#c3cde0" strokeWidth={0.25} />
      <path d={byContinent.get(continent) ?? ""} fill={colour} stroke="#1f2a44" strokeWidth={0.3} />
    </svg>
  );
}

/** All of India's states in their map colours (for "Arrange the States"). */
export function IndiaColoured({ features, fills, size = 96, blank = [] }: { features: RegionFeature[]; fills: string[]; size?: number; blank?: string[] }) {
  const { byId } = project(features);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} aria-hidden className="shrink-0">
      {features.map((f) => (
        <path key={f.properties.id} d={byId.get(f.properties.id)?.d} fill={blank.includes(f.properties.id) ? "#ffffff" : fills[f.properties.c]} stroke={blank.includes(f.properties.id) ? "#aab6cf" : "#ffffff"} strokeWidth={0.4} strokeDasharray={blank.includes(f.properties.id) ? "1.2 0.8" : undefined} />
      ))}
    </svg>
  );
}

/** The state's own district map in soft colours — a picture of "what districts look like". */
export function DistrictPreview({ stateId, fills, size = 96 }: { stateId: string; fills: string[]; size?: number }) {
  const { features } = useDistrictMap(stateId);
  const shapes = useMemo(() => {
    if (!features) return null;
    const fc = { type: "FeatureCollection" as const, features };
    const path = geoPath(geoMercator().fitExtent([[3, 3], [W - 3, H - 3]], fc));
    return features.map((f) => ({ id: f.properties.id, d: path(f) ?? "", c: f.properties.c }));
  }, [features]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} aria-hidden className="shrink-0">
      {shapes?.map((s) => <path key={s.id} d={s.d} fill={fills[s.c]} stroke="#ffffff" strokeWidth={0.5} strokeLinejoin="round" />)}
    </svg>
  );
}
