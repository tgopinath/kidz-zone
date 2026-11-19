"use client";

import { useRef, useState } from "react";
import { useFullscreen } from "./MapView";
import { Map as MapIcon, Maximize2, Minimize2, Satellite, Shapes } from "lucide-react";

export type MapMode = "drawn" | "google";

/** Switch between the app's drawn learning map and a real Google Map. */
export function MapModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (m: MapMode) => void }) {
  return (
    <div role="group" aria-label="Map view" className="flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]">
      {(
        [
          ["drawn", "Learning map", Shapes],
          ["google", "Google Map", MapIcon],
        ] as const
      ).map(([m, label, Icon]) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-display font-semibold ${mode === m ? "bg-primary text-white" : "text-ink-soft"}`}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Google Maps embed (no API key needed) centred on a place. Only the place name is sent
 * to Google; nothing about the child.
 */
export function GoogleMapFrame({ query, zoom, title, height = "70vh" }: { query: string; zoom: number; title: string; height?: string }) {
  const [satellite, setSatellite] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const full = useFullscreen(boxRef);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=${satellite ? "k" : "m"}&z=${zoom}&hl=en&output=embed`;
  return (
    <div ref={boxRef} className={`relative overflow-hidden bg-sea ${full.on ? "fixed inset-0 z-[80]" : "rounded-[var(--radius-card)] shadow-[var(--shadow-card)]"}`}>
      <iframe key={src} src={src} title={title} className="block w-full border-0" style={{ height: full.on ? "100dvh" : height }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <button
        type="button"
        onClick={() => setSatellite(!satellite)}
        aria-pressed={satellite}
        className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display font-bold text-ink shadow-[var(--shadow-pop)]"
      >
        <Satellite className="size-4 text-primary" /> {satellite ? "Show map" : "Show satellite"}
      </button>
      <button
        type="button"
        onClick={full.toggle}
        aria-label={full.on ? "Exit full screen" : "Full screen"}
        title={full.on ? "Exit full screen" : "Full screen"}
        className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-white text-ink shadow-[var(--shadow-pop)]"
      >
        {full.on ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
      </button>
    </div>
  );
}
