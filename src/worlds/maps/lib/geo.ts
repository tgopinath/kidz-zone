"use client";

import { useEffect, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export interface RegionProps {
  id: string;
  lgd: number;
  name?: string;
  lgdName?: string;
  /** colour index from build-time graph colouring (neighbours never share one) */
  c: number;
  /** label point inside the shape (lon, lat) */
  lx: number;
  ly: number;
}
export type RegionFeature = Feature<Geometry, RegionProps>;

const cache = new Map<string, Promise<RegionFeature[]>>();

function load(url: string, object: string) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load map ${url}`);
        return r.json();
      })
      .then((topo: Topology) => {
        const fc = feature(topo, topo.objects[object] as GeometryCollection<RegionProps>) as FeatureCollection<Geometry, RegionProps>;
        return fc.features;
      });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export const indiaUrl = "/maps/data/india.topo.json";
export const districtsUrl = (stateId: string) => `/maps/data/districts/${stateId}.topo.json`;

function useFeatures(url: string | null, object: string) {
  const [state, setState] = useState<{ url: string | null; data: RegionFeature[] | null; error: string | null }>({
    url: null,
    data: null,
    error: null,
  });
  useEffect(() => {
    if (!url) return;
    let live = true;
    load(url, object).then(
      (data) => live && setState({ url, data, error: null }),
      (e: Error) => live && setState({ url, data: null, error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [url, object]);
  const fresh = state.url === url;
  return { features: fresh ? state.data : null, error: fresh ? state.error : null };
}

export const useIndiaMap = () => useFeatures(indiaUrl, "states");
export const useDistrictMap = (stateId: string | null) => useFeatures(stateId ? districtsUrl(stateId) : null, "districts");
export const worldUrl = "/maps/data/world.topo.json";
export const useWorldMap = (on = true) => useFeatures(on ? worldUrl : null, "countries");

/** Soft, kid-friendly fills. Index comes from the build-time colouring. */
export const STATE_FILLS = ["#9cc3ff", "#ffd98a", "#9fddbf", "#ffb899", "#cdb8f5", "#ffb3c7", "#8ed9d9", "#cfe89a"];
export const DISTRICT_FILLS = ["#a9cbff", "#ffe09c", "#a8e3c6", "#ffc2a6", "#d6c4f7", "#ffc1d2"];
