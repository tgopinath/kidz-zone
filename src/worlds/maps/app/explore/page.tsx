"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, Landmark, Languages, Map as MapIcon, Search, Users } from "lucide-react";
import MapView from "@/components/MapView";
import { GoogleMapFrame, MapModeSwitch, type MapMode } from "@/components/RealMap";
import { MascotSays } from "@/components/Mascot";
import { Card, Chip, LinkButton, Loading, PageHeader, TamilName } from "@/components/ui";
import { districtsLabel, getState, REGION_COLOURS, STATES, stateName } from "@/lib/content";
import { STATE_FILLS, useIndiaMap, type RegionFeature } from "@/lib/geo";
import { actions } from "@/lib/progress";
import { speakLocal } from "@/lib/speech";
import { forIndianState } from "@/lib/explorer";

export default function ExplorePage() {
  const { features, error } = useIndiaMap();
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [colourBy, setColourBy] = useState<"state" | "region">("state");
  const [mapMode, setMapMode] = useState<MapMode>("drawn");
  const panelRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return STATES.filter((s) => s.name.toLowerCase().includes(q) || s.capital.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const select = (id: string) => {
    setSelected(id);
    actions.exploreState(id);
    const st = getState(id)!;
    speakLocal(
      [
        `${st.name}.`,
        `It is a ${st.type === "ut" ? "Union Territory" : "state"} in ${st.region === "Islands" ? "the islands" : `${st.region} India`}.`,
        `Its capital is ${st.capital.replace(/\(([^)]*)\)/g, "in $1")}.`,
        `It has ${districtsLabel(st.districtCount)}.`,
        st.neighbours.length ? `Its neighbours are ${st.neighbours.map(stateName).join(", ")}.` : "It has no land neighbours. There is only sea all around.",
      ].join(" "),
      st.ta && `${st.ta.name}. இதன் தலைநகரம் ${st.ta.capital}. ${st.districtCount} மாவட்டங்கள்.`,
    );
    setQuery("");
    if (window.innerWidth < 1024) window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const s = selected ? getState(selected) : null;
  const fill = (f: RegionFeature) =>
    colourBy === "region" ? REGION_COLOURS[getState(f.properties.id)!.region] : STATE_FILLS[f.properties.c];

  return (
    <div>
      <PageHeader back="/"  title="Explore India" subtitle="Tap a state to learn about it. Pinch or use + to zoom in.">
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:flex-nowrap xl:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a state or capital…"
              aria-label="Search states"
              className="w-full rounded-2xl border-2 border-line bg-white py-3 pl-11 pr-4 text-lg outline-none focus:border-primary"
            />
            {matches.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => select(m.id)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-primary-soft">
                      <span className="font-display text-lg font-semibold">{m.name}</span>
                      <span className="text-sm text-ink-soft">{m.capital}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <MapModeSwitch mode={mapMode} onChange={setMapMode} />
          {mapMode === "drawn" && (
            <div className="flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]">
              {(["state", "region"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setColourBy(k)}
                  className={`rounded-xl px-4 py-2 font-display font-semibold ${colourBy === k ? "bg-primary text-white" : "text-ink-soft"}`}
                >
                  {k === "state" ? "Colourful" : "By region"}
                </button>
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div>
          {mapMode === "google" ? (
            <GoogleMapFrame query={s ? `${s.name}, India` : "India"} zoom={s ? (s.districtCount <= 3 ? 9 : 6) : 4} title="Google Map of India" />
          ) : error ? (
            <Card>Couldn&apos;t load the map. Please check your connection and try again.</Card>
          ) : !features ? (
            <Loading />
          ) : (
            <MapView
              features={features}
              fillFor={fill}
              selectedId={selected}
              onSelect={select}
              onHover={setHover}
              focusId={selected}
              labelFor={(f) => getState(f.properties.id)!.name}
              nameFor={(f) => getState(f.properties.id)!.name}
              ariaLabel="Map of India's states and Union Territories"
              maxHeight="78vh"
              overlay={
                hover && hover !== selected ? (
                  <div className="pointer-events-none absolute bottom-3 left-3 rounded-2xl bg-white/95 px-4 py-2 font-display text-lg font-bold shadow-[var(--shadow-card)]">
                    {stateName(hover)}
                  </div>
                ) : null
              }
            />
          )}
          {colourBy === "region" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(REGION_COLOURS).map(([r, c]) => (
                <Chip key={r} className="bg-white">
                  <span className="size-3 rounded-full" style={{ background: c }} /> {r}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div ref={panelRef} className="scroll-mt-20">
          {s ? (
            <Card className="animate-pop space-y-4" key={s.id}>
              <div>
                <Chip className={s.type === "ut" ? "bg-accent-soft text-[#b4471c]" : "bg-primary-soft text-primary"}>
                  {s.type === "ut" ? "Union Territory" : "State"} · {s.region}
                </Chip>
                <h2 className="mt-2 text-3xl font-extrabold">{s.name}</h2>
                <TamilName text={s.ta?.name} className="font-display text-lg font-bold text-primary" />
              </div>
              <dl className="space-y-3 text-lg">
                <div className="flex gap-3">
                  <Landmark className="mt-1 size-5 shrink-0 text-primary" />
                  <div>
                    <dt className="text-sm font-bold text-ink-soft">Capital</dt>
                    <dd className="font-semibold">{s.capital}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapIcon className="mt-1 size-5 shrink-0 text-success" />
                  <div>
                    <dt className="text-sm font-bold text-ink-soft">Districts</dt>
                    <dd className="font-semibold">{s.districtCount}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Languages className="mt-1 size-5 shrink-0 text-[#7b55e0]" />
                  <div>
                    <dt className="text-sm font-bold text-ink-soft">Languages</dt>
                    <dd className="font-semibold">{s.languages.join(", ")}</dd>
                  </div>
                </div>
                <StateCulture id={s.id} famous={s.famousPlaces} />
                <div className="flex gap-3">
                  <Users className="mt-1 size-5 shrink-0 text-accent" />
                  <div>
                    <dt className="text-sm font-bold text-ink-soft">Neighbours</dt>
                    <dd className="flex flex-wrap gap-1.5 pt-1">
                      {s.neighbours.length ? (
                        s.neighbours.map((n) => (
                          <button key={n} type="button" onClick={() => select(n)} className="rounded-full bg-bg px-3 py-1 text-sm font-bold hover:bg-primary-soft">
                            {stateName(n)}
                          </button>
                        ))
                      ) : (
                        <span className="text-base text-ink-soft">None — it&apos;s surrounded by sea!</span>
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <LinkButton href={`/states/${s.id}`}>
                  Learn about {s.name.length > 18 ? "it" : s.name} <ArrowRight className="size-5" />
                </LinkButton>
                <LinkButton href={`/districts/${s.id}`} tone="white">
                  Explore districts
                </LinkButton>
              </div>
            </Card>
          ) : (
            <Card className="space-y-4">
              <MascotSays say>Tap any state on the map, or search for one!</MascotSays>
              <p className="text-ink-soft">
                India has <b>28 states</b> and <b>8 Union Territories</b>. Small places like Chandigarh and Lakshadweep have a dot so you can tap them easily.
              </p>
              <Link href="/states" className="font-display font-bold text-primary">
                See all states as a list →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Famous places, food and festivals for a state (from the curated content). */
function StateCulture({ id, famous }: { id: string; famous: string[] }) {
  const { landmarks, foods, festivals } = forIndianState(id);
  return (
    <div className="flex gap-3">
      <Camera className="mt-1 size-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <dt className="text-sm font-bold text-ink-soft">Famous places, food & festivals</dt>
        <dd className="flex flex-wrap gap-1.5 pt-1">
          {landmarks.map((l) => (
            <Link key={l.id} href={`/landmarks/${l.id}`} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-[#b4471c]">
              🏛 {l.name}
            </Link>
          ))}
          {famous.slice(0, landmarks.length ? 2 : 3).map((f) => (
            <span key={f} className="rounded-full bg-bg px-3 py-1 text-sm font-bold">
              {f}
            </span>
          ))}
          {foods.map((f) => (
            <Link key={f.id} href={`/cultures?tab=food#${f.id}`} className="rounded-full bg-secondary-soft px-3 py-1 text-sm font-bold text-[#8a5b00]">
              🍽 {f.name}
            </Link>
          ))}
          {festivals.map((f) => (
            <Link key={f.id} href={`/cultures?tab=festivals#${f.id}`} className="rounded-full bg-[#efe8fd] px-3 py-1 text-sm font-bold text-[#6a46c9]">
              🎉 {f.name}
            </Link>
          ))}
        </dd>
      </div>
    </div>
  );
}
