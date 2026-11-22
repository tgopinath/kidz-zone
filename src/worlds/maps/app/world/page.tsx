"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Coins, Globe2, Landmark, Languages, Map as MapIcon, Rocket, Search, Users } from "lucide-react";
import GlobeView, { type GlobeMarker } from "@/components/GlobeView";
import MapView, { type RegionMark } from "@/components/MapView";
import { GoogleMapFrame } from "@/components/RealMap";
import { Flag } from "@/components/Media";
import { MascotSays } from "@/components/Mascot";
import { Card, Chip, LinkButton, Loading, PageHeader, ShowMore } from "@/components/ui";
import { STATE_FILLS, useWorldMap, type RegionFeature } from "@/lib/geo";
import { actions } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { countryDetails, describeCountry, LANDMARKS, landmarksIn, mediaFor, foodsIn, festivalsIn } from "@/lib/explorer";
import {
  CONTINENT_FOCUS, CONTINENTS, continentColour, continentLabel, COUNTRIES, countryName, getCountry, isCountry, peopleText, type Continent,
} from "@/lib/world";

type View = "globe" | "flat" | "google";

// Landmarks as pulsing destination markers on the globe.
const MARKERS: GlobeMarker[] = LANDMARKS.flatMap((l) => {
  const c = mediaFor(l.id)?.coords;
  return c ? [{ id: l.id, coords: c, label: l.name }] : [];
});

export default function WorldPage() {
  const { features, error } = useWorldMap();
  const [view, setView] = useState<View>("globe");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [colourBy, setColourBy] = useState<"country" | "continent">("continent");
  const [continent, setContinent] = useState<Continent | null>(null);
  const [focus, setFocus] = useState<{ coords: [number, number]; zoom?: number } | null>(null);
  const [pickedLandmark, setPickedLandmark] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => actions.visit("/world", "Explore World"), []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.capitals.some((k) => k.toLowerCase().includes(q))).slice(0, 6);
  }, [query]);

  const centreOf = (id: string): [number, number] | null => {
    const d = getCountry(id) && countryDetails(getCountry(id)!);
    return d?.latlng ? [d.latlng[1], d.latlng[0]] : null;
  };

  const select = (id: string) => {
    setSelected(id);
    setPickedLandmark(null);
    setQuery("");
    actions.exploreCountry(id);
    speak(describeCountry(id));
    const c = centreOf(id);
    if (c) setFocus({ coords: c, zoom: Math.max(1.6, (getCountry(id)?.pop ?? 0) > 1e8 ? 1.6 : 2.4) });
    if (window.innerWidth < 1024) window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const pickContinent = (k: Continent) => {
    const next = continent === k ? null : k;
    setContinent(next);
    if (next) {
      setFocus(CONTINENT_FOCUS[next]);
      speak(`${continentLabel(next)}. ${CONTINENTS.find((x) => x.id === next)!.blurb}`);
    }
  };
  const pickMarker = (id: string) => {
    const l = LANDMARKS.find((x) => x.id === id)!;
    setPickedLandmark(id);
    speak(`${l.name}, in ${countryName(l.country)}. ${l.why}`);
  };

  const c = selected ? getCountry(selected) : null;
  const fill = (f: RegionFeature) => {
    const country = getCountry(f.properties.id);
    if (f.properties.id === "in") return "#ff8b5c";
    return colourBy === "continent" && country ? continentColour(country.continent) : STATE_FILLS[f.properties.c];
  };
  const marks: Record<string, RegionMark | undefined> = {};
  if (continent && features) features.forEach((f) => getCountry(f.properties.id)?.continent !== continent && (marks[f.properties.id] = "dim"));
  const counts = useMemo(() => Object.fromEntries(CONTINENTS.map((k) => [k.id, COUNTRIES.filter((x) => x.continent === k.id && isCountry(x)).length])), []);
  const lm = pickedLandmark ? LANDMARKS.find((x) => x.id === pickedLandmark) : null;

  return (
    <div>
      <PageHeader back="/" title="Explore the World" subtitle="Spin the globe and tap any country. Orange dots are famous places!">
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a country or capital…"
              aria-label="Search countries"
              className="w-full rounded-2xl border-2 border-line bg-white py-3 pl-11 pr-4 text-lg outline-none focus:border-primary"
            />
            {matches.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => select(m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary-soft">
                      <Flag id={m.id} size={28} />
                      <span className="flex-1 font-display text-lg font-semibold">{m.name}</span>
                      <span className="truncate text-sm text-ink-soft">{m.capitals[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div role="group" aria-label="Map view" className="flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]">
            {(
              [
                ["globe", "3D Globe", Globe2],
                ["flat", "Flat map", MapIcon],
                ["google", "Google Map", Landmark],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-display font-semibold ${view === v ? "bg-primary text-white" : "text-ink-soft"}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          {view !== "google" && (
            <div className="flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]">
              {(["continent", "country"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={colourBy === k}
                  onClick={() => setColourBy(k)}
                  className={`rounded-xl px-3 py-2 font-display font-semibold ${colourBy === k ? "bg-primary text-white" : "text-ink-soft"}`}
                >
                  {k === "continent" ? "By continent" : "Colourful"}
                </button>
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {CONTINENTS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => pickContinent(k.id)}
            aria-pressed={continent === k.id}
            className={`flex items-center gap-2 rounded-full px-4 py-2 font-display font-semibold transition ${
              continent === k.id ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-primary-soft"
            }`}
          >
            <span className="size-3 rounded-full" style={{ background: k.colour }} />
            {continentLabel(k.id)}
            {k.id !== "Antarctica" && <span className="text-xs opacity-70">{counts[k.id]}</span>}
          </button>
        ))}
      </div>

      <div className={`grid gap-5 ${c || lm ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <div>
          {view === "google" ? (
            <GoogleMapFrame query={c ? c.name : continent ?? "World"} zoom={c ? (c.pop > 1e8 ? 3 : 5) : 2} title="Google Map of the world" />
          ) : error ? (
            <Card className="text-ink-soft">Couldn&apos;t load the world map. Please check your connection and try again.</Card>
          ) : !features ? (
            <Loading label="Spinning the globe…" />
          ) : view === "globe" ? (
            <GlobeView
              features={features}
              fillFor={fill}
              nameFor={countryName}
              selectedId={selected}
              onSelect={select}
              marks={marks}
              markers={MARKERS}
              onMarker={pickMarker}
              focus={focus}
              autoRotate={!selected}
              ariaLabel="3D globe of the world"
            />
          ) : (
            <MapView
              features={features}
              projection="world"
              tinyArea={4}
              fillFor={fill}
              marks={marks}
              selectedId={selected}
              onSelect={select}
              focusId={selected}
              labelFor={(f) => countryName(f.properties.id)}
              nameFor={(f) => countryName(f.properties.id)}
              ariaLabel="World map of countries"
              maxHeight="72vh"
            />
          )}
          <p className="mt-2 text-sm text-ink-soft">
            Drag to spin · pinch or + to zoom · tap a country or an orange dot. On a keyboard: arrow keys turn the globe and Enter picks the country in the middle.
          </p>

          {continent && (
            <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg font-bold">
                {continentLabel(continent)} · {counts[continent]} countries
              </p>
              <LinkButton href={`/world/continent/${CONTINENTS.find((k) => k.id === continent)!.slug}`} tone="secondary">
                Explore {continentLabel(continent)} <ArrowRight className="size-5" />
              </LinkButton>
            </Card>
          )}

          {!c && !lm && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="space-y-3">
                <MascotSays say>Let&apos;s travel the world! Tap any country, or pick a continent.</MascotSays>
                <p className="text-ink-soft">
                  There are <b>7 continents</b>. India is in <b>Asia</b>, the biggest one.
                </p>
              </Card>
              <Card className="space-y-2">
                <p className="font-display text-lg font-bold">More to explore</p>
                <Link href="/landmarks" className="flex items-center gap-2 rounded-2xl bg-bg px-4 py-3 font-semibold hover:bg-primary-soft">
                  <Landmark className="size-5 text-accent" /> Landmarks 360
                </Link>
                <Link href="/games" className="flex items-center gap-2 rounded-2xl bg-bg px-4 py-3 font-semibold hover:bg-primary-soft">
                  <Rocket className="size-5 text-primary" /> Geography challenges
                </Link>
              </Card>
            </div>
          )}
        </div>

        <div ref={panelRef} className={`scroll-mt-20 space-y-4 ${c || lm ? "" : "hidden"}`}>
          {lm && (
            <Card className="animate-pop space-y-3" key={lm.id}>
              <p className="text-sm font-bold uppercase tracking-wide text-accent">Famous place</p>
              <h2 className="text-2xl font-extrabold leading-tight">{lm.name}</h2>
              <p className="flex items-center gap-2 text-ink-soft">
                <Flag id={lm.country} size={24} /> {lm.city}, {countryName(lm.country)}
              </p>
              <p className="text-lg">{lm.why}</p>
              <LinkButton href={`/landmarks/${lm.id}`} className="w-full">
                Visit {lm.name} <ArrowRight className="size-5" />
              </LinkButton>
            </Card>
          )}
          {c && !lm && <CountryPanel id={c.id} />}
        </div>
      </div>
    </div>
  );
}

function CountryPanel({ id }: { id: string }) {
  const c = getCountry(id)!;
  const d = countryDetails(c);
  const places = landmarksIn(id);
  const foods = foodsIn(id);
  const fests = festivalsIn(id);
  return (
    <Card className="animate-pop space-y-4" key={id}>
      <div className="flex items-start gap-3">
        <Flag id={id} size={64} />
        <div className="min-w-0 flex-1">
          {c.continent !== c.name && <Chip className="bg-primary-soft text-primary">{continentLabel(c.continent)}</Chip>}
          <h2 className="mt-1 cursor-pointer text-3xl font-extrabold leading-tight" data-no-announce onClick={() => speak(describeCountry(id), { force: true })}>{c.name}</h2>
          {c.kind === "Dependency" && <p className="text-sm text-ink-soft">Part of {c.sovereign}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {c.capitals.length > 0 && <Info label={c.capitals.length > 1 ? "Capitals" : "Capital"} value={c.capitals.join(", ")} />}
        <Info label="People" value={peopleText(c)} />
        {d.languages.length > 0 && <Info label="Languages" value={d.languages.slice(0, 3).join(", ")} icon={<Languages className="size-4 text-[#7b55e0]" />} />}
        {d.currencies[0] && <Info label="Money" value={`${d.currencies[0].name}${d.currencies[0].symbol ? ` (${d.currencies[0].symbol})` : ""}`} icon={<Coins className="size-4 text-[#c58a00]" />} />}
        {d.animal && <Info label="National animal" value={d.animal} wide />}
      </dl>
      {(places.length > 0 || foods.length > 0 || fests.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {places.slice(0, 3).map((l) => (
            <Link key={l.id} href={`/landmarks/${l.id}`} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-[#b4471c]">
              🏛 {l.name}
            </Link>
          ))}
          {foods.slice(0, 2).map((f) => (
            <Link key={f.id} href={`/cultures?tab=food#${f.id}`} className="rounded-full bg-secondary-soft px-3 py-1 text-sm font-bold text-[#8a5b00]">
              🍽 {f.name}
            </Link>
          ))}
          {fests.slice(0, 2).map((f) => (
            <Link key={f.id} href={`/cultures?tab=festivals#${f.id}`} className="rounded-full bg-[#efe8fd] px-3 py-1 text-sm font-bold text-[#6a46c9]">
              🎉 {f.name}
            </Link>
          ))}
        </div>
      )}
      {c.neighbours.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink-soft">
            <Users className="size-4 text-accent" /> Neighbours
          </p>
          <ShowMore
            items={c.neighbours}
            initial={6}
            noun="neighbours"
            className="flex flex-wrap gap-1.5"
            render={(n) => (
              <span key={n} className="rounded-full bg-bg px-3 py-1 text-sm font-bold">
                {countryName(n)}
              </span>
            )}
          />
        </div>
      )}
      <LinkButton href={id === "in" ? "/explore" : `/world/${id}`} className="w-full">
        {id === "in" ? "Explore India's states" : "Start exploring"} <ArrowRight className="size-5" />
      </LinkButton>
    </Card>
  );
}

function Info({ label, value, icon, wide }: { label: string; value: string; icon?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-bg p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
        {icon} {label}
      </dt>
      <dd className="font-display text-lg font-bold leading-snug">{value}</dd>
    </div>
  );
}
