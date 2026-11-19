"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoCentroid, geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { Maximize2, Minimize2, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import type { RegionFeature } from "@/lib/geo";
import type { RegionMark } from "./MapView";
import { useFullscreen } from "./MapView";

export interface GlobeMarker {
  id: string;
  coords: [number, number];
  label: string;
  colour?: string;
}

interface Props {
  features: RegionFeature[];
  fillFor: (f: RegionFeature) => string;
  nameFor: (id: string) => string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  marks?: Record<string, RegionMark | undefined>;
  markers?: GlobeMarker[];
  onMarker?: (id: string) => void;
  /** Turn the globe to face this point (lon, lat), optionally zooming. */
  focus?: { coords: [number, number]; zoom?: number } | null;
  /** Spin slowly until the child touches the globe. */
  autoRotate?: boolean;
  height?: number | string;
  ariaLabel: string;
  showControls?: boolean;
}

const MARK_FILL: Partial<Record<RegionMark, string>> = { correct: "#36b37e", wrong: "#f28b8b", target: "#ff8b5c", dim: "#dfe5ef", found: "#9fe0c2", blank: "#ffffff" };

export default function GlobeView({
  features,
  fillFor,
  nameFor,
  selectedId,
  onSelect,
  marks = {},
  markers = [],
  onMarker,
  focus,
  autoRotate = false,
  height = "min(70vh, 620px)",
  ariaLabel,
  showControls = true,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const full = useFullscreen(boxRef);
  const [size, setSize] = useState({ w: 600, h: 600 });
  const rot = useRef<[number, number]>([-78, -18]); // start facing India
  const zoom = useRef(1);
  const spinning = useRef(autoRotate);
  const [spin, setSpin] = useState(autoRotate);
  const anim = useRef<{ from: [number, number]; to: [number, number]; z0: number; z1: number; t0: number } | null>(null);
  const markerHits = useRef<{ id: string; x: number; y: number }[]>([]);
  const [hoverName, setHoverName] = useState<string | null>(null);
  const props = useRef({ fillFor, marks, selectedId, markers, nameFor });
  useEffect(() => {
    props.current = { fillFor, marks, selectedId, markers, nameFor };
  });

  const byId = useMemo(() => new Map(features.map((f) => [f.properties.id, f])), [features]);
  const graticule = useMemo(() => geoGraticule10(), []);

  // Keep the canvas sharp and sized to its box.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projection = useCallback(() => {
    const r = (Math.min(size.w, size.h) / 2 - 8) * zoom.current;
    return geoOrthographic().rotate([rot.current[0], rot.current[1]]).scale(r).translate([size.w / 2, size.h / 2]).clipAngle(90).precision(0.6);
  }, [size]);

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(size.w * dpr) || canvas.height !== Math.round(size.h * dpr)) {
        canvas.width = Math.round(size.w * dpr);
        canvas.height = Math.round(size.h * dpr);
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      const proj = projection();
      const path = geoPath(proj, ctx);
      const r = proj.scale();
      const { fillFor: fill, marks: mk, selectedId: sel, markers: mks } = props.current;

      // Soft halo + ocean
      const halo = ctx.createRadialGradient(size.w / 2, size.h / 2, r * 0.9, size.w / 2, size.h / 2, r * 1.12);
      halo.addColorStop(0, "rgba(53,106,230,0.25)");
      halo.addColorStop(1, "rgba(53,106,230,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size.w, size.h);
      const sea = ctx.createRadialGradient(size.w / 2 - r * 0.35, size.h / 2 - r * 0.35, r * 0.1, size.w / 2, size.h / 2, r);
      sea.addColorStop(0, "#bfe3ff");
      sea.addColorStop(1, "#6fb3ee");
      ctx.beginPath();
      path({ type: "Sphere" } as GeoPermissibleObjects);
      ctx.fillStyle = sea;
      ctx.fill();

      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      for (const f of features) {
        const m = mk[f.properties.id];
        ctx.beginPath();
        path(f);
        ctx.fillStyle = (m && MARK_FILL[m]) || fill(f);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Highlights: hint (pulsing) and selected (glowing outline)
      const pulse = 0.5 + 0.5 * Math.sin(time / 300);
      for (const [id, m] of Object.entries(mk)) {
        if (m !== "hint" && m !== "target") continue;
        const f = byId.get(id);
        if (!f) continue;
        ctx.save();
        ctx.beginPath();
        path(f);
        ctx.shadowColor = "#ffb000";
        ctx.shadowBlur = 10 + 14 * pulse;
        ctx.strokeStyle = "#ffb000";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
      const sf = sel ? byId.get(sel) : undefined;
      if (sf) {
        ctx.save();
        ctx.beginPath();
        path(sf);
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#1f2a44";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        // Name label if the country faces us
        const c = geoCentroid(sf);
        if (geoDistance(c, [-rot.current[0], -rot.current[1]]) < Math.PI / 2 - 0.1) {
          const [x, y] = proj(c) ?? [0, 0];
          const name = props.current.nameFor(sel!);
          ctx.font = `700 15px ${getComputedStyle(document.documentElement).getPropertyValue("--font-display") || "system-ui"}, system-ui`;
          const w = ctx.measureText(name).width + 18;
          ctx.fillStyle = "rgba(31,42,68,0.88)";
          ctx.beginPath();
          ctx.roundRect(x - w / 2, y - 34, w, 26, 13);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(name, x, y - 21);
        }
      }

      // Animated destination markers (only on the side facing us)
      const hits: { id: string; x: number; y: number }[] = [];
      for (const mkr of mks) {
        if (geoDistance(mkr.coords, [-rot.current[0], -rot.current[1]]) > Math.PI / 2 - 0.05) continue;
        const [x, y] = proj(mkr.coords) ?? [0, 0];
        const col = mkr.colour ?? "#ff6a33";
        const ring = ((time / 1200 + (mkr.id.length % 5) / 5) % 1);
        ctx.beginPath();
        ctx.arc(x, y, 5 + ring * 12, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.globalAlpha = 1 - ring;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        hits.push({ id: mkr.id, x, y });
      }
      markerHits.current = hits;

      // Glossy shine
      const shine = ctx.createRadialGradient(size.w / 2 - r * 0.45, size.h / 2 - r * 0.5, 0, size.w / 2 - r * 0.45, size.h / 2 - r * 0.5, r * 0.9);
      shine.addColorStop(0, "rgba(255,255,255,0.35)");
      shine.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      path({ type: "Sphere" } as GeoPermissibleObjects);
      ctx.fillStyle = shine;
      ctx.fill();
    },
    [features, byId, graticule, projection, size],
  );

  // Render loop: spins, animates turning to a focus point and pulses markers.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return; // ~30 fps is plenty
      const dt = last ? t - last : 16;
      last = t;
      const a = anim.current;
      if (a) {
        const k = Math.min(1, (t - a.t0) / 800);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        let dl = a.to[0] - a.from[0];
        if (dl > 180) dl -= 360;
        if (dl < -180) dl += 360;
        rot.current = [a.from[0] + dl * e, a.from[1] + (a.to[1] - a.from[1]) * e];
        zoom.current = a.z0 + (a.z1 - a.z0) * e;
        if (k >= 1) anim.current = null;
      } else if (spinning.current) {
        rot.current = [rot.current[0] + dt * 0.006, rot.current[1]];
      }
      draw(t);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const turnTo = useCallback((coords: [number, number], z?: number) => {
    anim.current = { from: [...rot.current], to: [-coords[0], Math.max(-70, Math.min(70, -coords[1]))], z0: zoom.current, z1: z ?? zoom.current, t0: performance.now() };
  }, []);

  useEffect(() => {
    if (!focus) return;
    spinning.current = false;
    // a new focus point always stops the idle spin
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpin(false);
    turnTo(focus.coords, focus.zoom);
  }, [focus, turnTo]);

  const stopSpin = () => {
    spinning.current = false;
    setSpin(false);
  };

  // Pointer: drag to rotate, pinch to zoom, tap to select.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; dist: number; zoom: number } | null>(null);

  const local = (e: React.PointerEvent | PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const countryAt = (x: number, y: number) => {
    const p = projection().invert?.([x, y]);
    if (!p) return null;
    if (geoDistance(p, [-rot.current[0], -rot.current[1]]) > Math.PI / 2) return null;
    for (const f of features) if (geoContains(f, p)) return f.properties.id;
    return null;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
    stopSpin();
    anim.current = null;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) gesture.current = { ...p, moved: false, dist: 0, zoom: zoom.current };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { x: p.x, y: p.y, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoom.current };
    }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === "mouse") {
        const id = countryAt(p.x, p.y);
        setHoverName(id ? props.current.nameFor(id) : null);
      }
      return;
    }
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.dist > 0) zoom.current = Math.min(8, Math.max(0.8, g.zoom * (d / g.dist)));
      return;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (Math.hypot(p.x - g.x, p.y - g.y) > 6) g.moved = true;
    const k = 0.35 / zoom.current;
    rot.current = [rot.current[0] + dx * k, Math.max(-85, Math.min(85, rot.current[1] - dy * k))];
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (!g || g.moved) return;
    const hit = markerHits.current.find((m) => Math.hypot(m.x - p.x, m.y - p.y) < 14);
    if (hit && onMarker) {
      onMarker(hit.id);
      return;
    }
    const id = countryAt(p.x, p.y);
    if (id && onSelect) onSelect(id);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    stopSpin();
    zoom.current = Math.min(8, Math.max(0.8, zoom.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = 10 / zoom.current;
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Enter", " "].includes(k)) e.preventDefault();
    stopSpin();
    if (k === "ArrowLeft") rot.current = [rot.current[0] + step, rot.current[1]];
    if (k === "ArrowRight") rot.current = [rot.current[0] - step, rot.current[1]];
    if (k === "ArrowUp") rot.current = [rot.current[0], Math.max(-85, rot.current[1] - step)];
    if (k === "ArrowDown") rot.current = [rot.current[0], Math.min(85, rot.current[1] + step)];
    if (k === "+" || k === "=") zoom.current = Math.min(8, zoom.current * 1.25);
    if (k === "-") zoom.current = Math.max(0.8, zoom.current / 1.25);
    if ((k === "Enter" || k === " ") && onSelect) {
      const id = countryAt(size.w / 2, size.h / 2);
      if (id) onSelect(id);
    }
  };

  const zoomBy = (f: number) => {
    stopSpin();
    anim.current = { from: [...rot.current], to: [...rot.current], z0: zoom.current, z1: Math.min(8, Math.max(0.8, zoom.current * f)), t0: performance.now() };
  };

  return (
    <div
      ref={boxRef}
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#eaf3ff,#dbe8fb)] ${full.on ? "fixed inset-0 z-[80]" : "rounded-[var(--radius-card)]"}`}
      style={{ height: full.on ? "100dvh" : height }}
    >
      <canvas
        ref={canvasRef}
        role="application"
        aria-label={`${ariaLabel}. Drag to spin, pinch or use plus and minus to zoom, arrow keys to turn, Enter to pick the country in the middle.`}
        tabIndex={0}
        className="block size-full cursor-grab touch-none outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:cursor-grabbing"
        style={{ width: size.w, height: size.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          gesture.current = null;
        }}
        onPointerLeave={() => setHoverName(null)}
        onWheel={onWheel}
        onKeyDown={onKey}
      />
      {hoverName && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-2 font-display text-lg font-bold shadow-[var(--shadow-card)]">
          {hoverName}
        </div>
      )}
      {showControls && (
        <>
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <GlobeButton label="Zoom in" onClick={() => zoomBy(1.5)}>
              <Plus className="size-5" />
            </GlobeButton>
            <GlobeButton label="Zoom out" onClick={() => zoomBy(1 / 1.5)}>
              <Minus className="size-5" />
            </GlobeButton>
            <GlobeButton
              label="Reset globe"
              onClick={() => {
                stopSpin();
                anim.current = { from: [...rot.current], to: [-78, -18], z0: zoom.current, z1: 1, t0: performance.now() };
              }}
            >
              <RotateCcw className="size-5" />
            </GlobeButton>
          </div>
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <GlobeButton label={full.on ? "Exit full screen" : "Full screen"} onClick={full.toggle}>
              {full.on ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </GlobeButton>
            <GlobeButton
              label={spin ? "Stop spinning" : "Spin the globe"}
              onClick={() => {
                spinning.current = !spin;
                setSpin(!spin);
              }}
            >
              {spin ? <Pause className="size-5" /> : <Play className="size-5" />}
            </GlobeButton>
          </div>
        </>
      )}
    </div>
  );
}

function GlobeButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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
