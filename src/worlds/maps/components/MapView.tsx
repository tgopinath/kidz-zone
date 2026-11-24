"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { RegionFeature } from "@/lib/geo";

export type RegionMark = "correct" | "wrong" | "hint" | "target" | "dim" | "found" | "blank" | "selected";

interface Props {
  features: RegionFeature[];
  /** Base fill per feature; marks below override it. */
  fillFor: (f: RegionFeature) => string;
  marks?: Record<string, RegionMark | undefined>;
  labelFor?: (f: RegionFeature) => string | null;
  /** auto: show labels that fit at the current zoom (plus the selected one) */
  labelMode?: "auto" | "all" | "none" | "selected";
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  zoomable?: boolean;
  /** Zoom smoothly to this region whenever it changes. */
  focusId?: string | null;
  ariaLabel: string;
  nameFor: (f: RegionFeature) => string;
  className?: string;
  overlay?: ReactNode;
  maxHeight?: string;
  /** "world" uses a rounded world projection; box fits [west, south, east, north] (degrees). */
  projection?: "mercator" | "world";
  box?: [number, number, number, number];
  rotate?: number;
  /** regions smaller than this (viewBox units², at normal zoom) also get a tap dot */
  tinyArea?: number;
}

const W = 800;
const PAD = 12;
const TINY_AREA = 90; // viewBox units² below which a region also gets a tap dot

const MARK_FILL: Partial<Record<RegionMark, string>> = {
  correct: "#36b37e",
  wrong: "#fbc4c4",
  target: "#ff8b5c",
  dim: "#e8ecf4",
  found: "#9fe0c2",
  blank: "#ffffff",
};

export default function MapView({
  features,
  fillFor,
  marks = {},
  labelFor,
  labelMode = "auto",
  selectedId,
  onSelect,
  onHover,
  zoomable = true,
  focusId,
  ariaLabel,
  nameFor,
  className = "",
  overlay,
  maxHeight = "70vh",
  projection: projKind = "mercator",
  box,
  rotate = 0,
  tinyArea = TINY_AREA,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [animate, setAnimate] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [unitsPerPx, setUnitsPerPx] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);
  const full = useFullscreen(boxRef);

  const boxKey = box?.join();
  const geo = useMemo(() => {
    const fc = { type: "FeatureCollection" as const, features };
    // Fit to the features, or to a lon/lat box (a few points along its edges) for continent views.
    const target = box
      ? {
          type: "MultiPoint" as const,
          coordinates: [0, 0.25, 0.5, 0.75, 1].flatMap((t) => [
            [box[0] + (box[2] - box[0]) * t, box[1]],
            [box[0] + (box[2] - box[0]) * t, box[3]],
          ]),
        }
      : fc;
    const projection = (projKind === "world" ? geoNaturalEarth1() : geoMercator()).rotate([rotate, 0]).fitWidth(W - PAD * 2, target);
    const path = geoPath(projection);
    const [[, y0], [, y1]] = path.bounds(target);
    const H = Math.ceil(y1 - y0 + PAD * 2);
    projection.fitExtent([[PAD, PAD], [W - PAD, H - PAD]], target);
    const items = features.map((f) => {
      const area = path.area(f);
      const [lx, ly] = projection([f.properties.lx, f.properties.ly]) ?? [0, 0];
      // Zoom to the main landmass, so e.g. France isn't framed together with French Guiana.
      let focus = path.bounds(f);
      if (f.geometry.type === "MultiPolygon") {
        let best = -1;
        for (const coordinates of f.geometry.coordinates) {
          const part = { type: "Polygon" as const, coordinates };
          const a = path.area(part);
          if (a > best) {
            best = a;
            focus = path.bounds(part);
          }
        }
      }
      return { f, id: f.properties.id, d: path(f) ?? "", area, lx, ly, bounds: path.bounds(f), focus, tiny: area < tinyArea };
    });
    return { H, items };
    // box is a stable tuple per continent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, projKind, rotate, boxKey, tinyArea]);

  // Track rendered size so labels and dots stay a readable size on any screen.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setUnitsPerPx(W / w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !zoomable) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .translateExtent([[0, 0], [W, geo.H]])
      .clickDistance(8)
      // At normal zoom, one finger scrolls the page; two fingers zoom the map.
      .filter((e: Event) => {
        if (e.type.startsWith("touch")) {
          const te = e as TouchEvent;
          return te.touches.length > 1 || select(el).property("__zoom").k > 1.01;
        }
        // Plain wheel scrolls the page; ctrl/⌘ + wheel (and trackpad pinch) zooms.
        if (e.type === "wheel") return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey;
        return !(e as MouseEvent).button;
      })
      .on("zoom", (e) => setT(e.transform));
    zoomRef.current = z;
    const sel = select(el).call(z);
    el.style.touchAction = "pan-y";
    return () => {
      sel.on(".zoom", null);
    };
  }, [zoomable, geo.H]);

  useEffect(() => {
    const el = svgRef.current;
    if (el) el.style.touchAction = t.k > 1.01 ? "none" : "pan-y";
  }, [t.k]);

  const zoomTo = (next: ZoomTransform) => {
    const el = svgRef.current;
    if (!el || !zoomRef.current) return;
    setAnimate(true);
    zoomRef.current.transform(select(el), next);
    window.setTimeout(() => setAnimate(false), 320);
  };
  const zoomBy = (factor: number) => {
    const k = Math.min(14, Math.max(1, t.k * factor));
    const cx = W / 2, cy = geo.H / 2;
    const x = cx - ((cx - t.x) / t.k) * k;
    const y = cy - ((cy - t.y) / t.k) * k;
    zoomTo(zoomIdentity.translate(x, y).scale(k));
  };

  useEffect(() => {
    if (!focusId || !zoomable) return;
    const it = geo.items.find((i) => i.id === focusId);
    if (!it) return;
    const [[x0, y0], [x1, y1]] = it.focus;
    const k = Math.min(6, Math.max(1, 0.55 / Math.max((x1 - x0) / W, (y1 - y0) / geo.H)));
    const x = W / 2 - k * (x0 + x1) / 2;
    const y = geo.H / 2 - k * (y0 + y1) / 2;
    zoomTo(zoomIdentity.translate(x, y).scale(k));
    // zoomTo is stable enough for this effect; re-run only when the target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, geo]);

  const font = (13 * unitsPerPx) / t.k;
  const screenScale = t.k / unitsPerPx; // viewBox unit -> screen px
  const strokeW = 1;

  const setHoverId = (id: string | null) => {
    setHover(id);
    onHover?.(id);
  };

  const showLabel = (it: (typeof geo.items)[number]) => {
    if (!labelFor || labelMode === "none") return false;
    if (it.id === selectedId || it.id === hover) return true;
    if (labelMode === "selected") return false;
    if (labelMode === "all") return true;
    const text = labelFor(it.f) ?? "";
    // fits if the region is comfortably wider than the text on screen
    const wPx = (it.bounds[1][0] - it.bounds[0][0]) * screenScale;
    const hPx = (it.bounds[1][1] - it.bounds[0][1]) * screenScale;
    return wPx > text.length * 7.5 && hPx > 16;
  };

  return (
    <div
      ref={boxRef}
      className={`relative overflow-hidden bg-sea ${full.on ? "fixed inset-0 z-[80] flex items-center justify-center rounded-none" : `rounded-[var(--radius-card)] ${className}`}`}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${geo.H}`}
        role="group"
        aria-label={ariaLabel}
        className="block h-auto w-full select-none"
        style={full.on ? { maxHeight: "100dvh", height: "100%" } : { maxHeight }}
      >
        <g
          transform={`translate(${t.x},${t.y}) scale(${t.k})`}
          style={animate ? { transition: "transform 0.3s ease" } : undefined}
        >
          {geo.items.map((it) => {
            const mark = marks[it.id];
            const fill = (mark && MARK_FILL[mark]) || fillFor(it.f);
            const isSel = it.id === selectedId || mark === "selected";
            const isHover = it.id === hover;
            return (
              <path
                key={it.id}
                d={it.d}
                data-fid={it.id}
                className="map-region"
                fill={fill}
                stroke={mark === "wrong" ? "#e5484d" : isSel ? "#356ae6" : mark === "blank" ? "#aab6cf" : "#ffffff"}
                strokeWidth={(isSel || mark === "wrong" ? 3 : isHover ? 2 : strokeW) / t.k}
                strokeLinejoin="round"
                style={{ filter: isHover && onSelect ? "brightness(1.07) saturate(1.1)" : undefined }}
                tabIndex={onSelect ? 0 : -1}
                role={onSelect ? "button" : undefined}
                aria-label={nameFor(it.f)}
                onClick={onSelect ? () => onSelect(it.id) : undefined}
                onKeyDown={
                  onSelect
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(it.id);
                        }
                      }
                    : undefined
                }
                onPointerEnter={(e) => e.pointerType === "mouse" && setHoverId(it.id)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setHoverId(null)}
              />
            );
          })}
          {/* Outline again on top so selected/hint borders aren't hidden by neighbours */}
          {geo.items
            .filter((it) => it.id === selectedId || marks[it.id] === "hint" || marks[it.id] === "selected")
            .map((it) => (
              <path
                key={`o-${it.id}`}
                d={it.d}
                fill="none"
                pointerEvents="none"
                stroke={marks[it.id] === "hint" ? "#ffb000" : "#356ae6"}
                strokeWidth={(marks[it.id] === "hint" ? 5 : 3) / t.k}
                className={marks[it.id] === "hint" ? "animate-pulse" : undefined}
              />
            ))}
          {/* Tap dots for regions too small to hit with a finger */}
          {geo.items
            .filter((it) => it.tiny)
            .map((it) => {
              const mark = marks[it.id];
              const r = ((tinyArea < TINY_AREA ? 6 : 9) * unitsPerPx) / t.k;
              if (it.area * screenScale * screenScale > 900) return null;
              return (
                <circle
                  key={`dot-${it.id}`}
                  data-fid={it.id}
                  cx={it.lx}
                  cy={it.ly}
                  r={r}
                  className="map-region"
                  fill={(mark && MARK_FILL[mark]) || fillFor(it.f)}
                  stroke={mark === "hint" ? "#ffb000" : it.id === selectedId ? "#356ae6" : "#1f2a44"}
                  strokeOpacity={0.6}
                  strokeWidth={(mark === "hint" || it.id === selectedId ? 3 : 1.2) / t.k}
                  aria-hidden
                  onClick={onSelect ? () => onSelect(it.id) : undefined}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setHoverId(it.id)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setHoverId(null)}
                />
              );
            })}
          {geo.items.filter(showLabel).map((it) => (
            <text
              key={`l-${it.id}`}
              x={it.lx}
              y={it.ly + (it.tiny ? -(13 * unitsPerPx) / t.k : 0)}
              className="map-label"
              fontSize={font}
              strokeWidth={(3 * unitsPerPx) / t.k}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {labelFor!(it.f)}
            </text>
          ))}
        </g>
      </svg>
      <div className="absolute left-3 top-3 z-10">
        <ZoomButton label={full.on ? "Exit full screen" : "Full screen"} onClick={full.toggle}>
          {full.on ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </ZoomButton>
      </div>
      {zoomable && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <ZoomButton label="Zoom in" onClick={() => zoomBy(1.6)}>
            <Plus className="size-5" />
          </ZoomButton>
          <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
            <Minus className="size-5" />
          </ZoomButton>
          <ZoomButton label="Reset map" onClick={() => zoomTo(zoomIdentity)}>
            <RotateCcw className="size-5" />
          </ZoomButton>
        </div>
      )}
      {overlay}
    </div>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full bg-white text-ink shadow-[var(--shadow-pop)] transition hover:bg-primary-soft active:translate-y-px"
    >
      {children}
    </button>
  );
}

/**
 * Full screen for a map card. Uses the browser's Fullscreen API where it exists, and a
 * fixed full-window layer otherwise (iPhone Safari can't make a div full screen).
 */
export function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setOn(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOn(false);
    document.addEventListener("fullscreenchange", sync);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.removeEventListener("keydown", esc);
    };
  }, []);
  const toggle = () => {
    const el = ref.current;
    if (on) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setOn(false);
      return;
    }
    setOn(true);
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  return { on, toggle };
}
