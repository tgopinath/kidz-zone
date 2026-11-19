"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import { Flag, Photo } from "@/components/Media";
import { Chip, PageHeader, SpeakButton } from "@/components/ui";
import { CATEGORIES, LANDMARKS, type LandmarkCategory } from "@/lib/explorer";
import { isUnlocked, SECRET_DESTINATIONS } from "@/lib/missions";
import { actions, useProgress } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { countryName } from "@/lib/world";

export default function LandmarksPage() {
  const p = useProgress();
  const [cat, setCat] = useState<LandmarkCategory | "all">("all");
  const [country, setCountry] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => actions.visit("/landmarks", "Landmarks 360"), []);

  const countries = useMemo(() => [...new Set(LANDMARKS.map((l) => l.country))].sort((a, b) => countryName(a).localeCompare(countryName(b))), []);
  const list = LANDMARKS.filter(
    (l) =>
      (cat === "all" || l.category === cat) &&
      (country === "all" || l.country === country) &&
      (!q || `${l.name} ${l.city} ${countryName(l.country)}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader back="/" title="Landmarks 360" subtitle={`${p.landmarksSeen.length} of ${LANDMARKS.length} visited. Tap a place to explore it — some have a 360° view!`}>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search landmarks…"
            aria-label="Search landmarks"
            className="w-full rounded-2xl border-2 border-line bg-white py-3 pl-11 pr-4 text-lg outline-none focus:border-primary"
          />
        </div>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {([{ id: "all", label: "All" }, ...CATEGORIES] as const).map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-full px-4 py-2 font-display font-semibold ${cat === c.id ? "bg-primary text-white" : "bg-white text-ink-soft hover:bg-primary-soft"}`}
          >
            {c.label}
          </button>
        ))}
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label="Filter by country"
          className="rounded-full border-2 border-line bg-white px-4 py-2 font-display font-semibold"
        >
          <option value="all">Every country</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <p className="rounded-3xl bg-white p-8 text-center text-lg text-ink-soft shadow-[var(--shadow-card)]">No landmarks match. Try another category or country.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((l) => {
            const open = isUnlocked(p, l.id);
            const seen = p.landmarksSeen.includes(l.id);
            const needs = SECRET_DESTINATIONS.find((d) => d.landmark === l.id)?.needs;
            return (
              <div key={l.id} className="relative transition hover:z-10 hover:-translate-y-1">
                <Link
                  href={open ? `/landmarks/${l.id}` : "/progress#missions"}
                  aria-label={open ? `${l.name}, ${countryName(l.country)}` : `Secret destination. Finish ${needs} missions to unlock.`}
                  className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)]"
                >
                  <div className="relative">
                    <Photo id={l.id} alt={l.name} credit={false} className={open ? "" : "blur-md grayscale"} />
                    {!open && (
                      <div className="absolute inset-0 grid place-items-center rounded-2xl bg-ink/40 text-center text-white">
                        <span className="flex flex-col items-center gap-1 font-display text-lg font-bold">
                          <Lock className="size-7" /> Secret destination
                          <span className="text-sm font-semibold">Finish {needs} missions to unlock</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-1 pt-3">
                    <h2 className="font-display text-xl font-extrabold leading-tight">{open ? l.name : "???"}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-ink-soft">
                      <Flag id={l.country} size={20} /> {l.city}, {countryName(l.country)}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      <Chip className="bg-bg text-ink-soft">{CATEGORIES.find((c) => c.id === l.category)?.label}</Chip>
                      {seen && <Chip className="bg-success-soft text-[#1d7a52]">Visited</Chip>}
                    </div>
                  </div>
                </Link>
                {open && <SpeakButton label={`Hear ${l.name}`} onSpeak={() => speak(`${l.name}, in ${countryName(l.country)}. ${l.why}`, { force: true })} className="absolute right-5 top-5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
