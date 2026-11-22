"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, Puzzle, Sparkles, Users } from "lucide-react";
import GlobeView from "@/components/GlobeView";
import { Flag, Photo } from "@/components/Media";
import { Card, LinkButton, Loading, PageHeader, ShowMore } from "@/components/ui";
import { useWorldMap } from "@/lib/geo";
import { actions, useProgress } from "@/lib/progress";
import { speakLines } from "@/lib/speech";
import { continentInfo, landmarksOnContinent, mediaFor } from "@/lib/explorer";
import { CONTINENT_BOX, CONTINENT_FOCUS, CONTINENTS, continentLabel, COUNTRIES, countryName, getCountry, isCountry, type Continent } from "@/lib/world";

export default function ContinentExplorer({ id }: { id: Continent }) {
  const k = CONTINENTS.find((x) => x.id === id)!;
  const info = continentInfo(id);
  const { features } = useWorldMap();
  const p = useProgress();
  const countries = useMemo(() => COUNTRIES.filter((c) => c.continent === id && isCountry(c)).sort((a, b) => a.name.localeCompare(b.name)), [id]);
  const places = landmarksOnContinent(id);
  const markers = useMemo(() => places.flatMap((l) => (mediaFor(l.id)?.coords ? [{ id: l.id, coords: mediaFor(l.id)!.coords!, label: l.name }] : [])), [places]);
  const label = continentLabel(id);
  const router = useRouter();

  useEffect(() => actions.visit(`/world/continent/${k.slug}`, label), [k.slug, label]);

  return (
    <div className="space-y-6">
      <PageHeader back="/world" backLabel="World" title={label} subtitle={k.blurb} say={() => speakLines([label, ...info.facts, info.people], { force: true })} />

      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        {features ? (
          <GlobeView
            features={features}
            fillFor={(f) => (getCountry(f.properties.id)?.continent === id ? k.colour : "#e7ecf4")}
            nameFor={countryName}
            markers={markers}
            onMarker={(lid) => router.push(`/landmarks/${lid}`)}
            onSelect={(cid) => {
              if (getCountry(cid)?.continent === id) router.push(cid === "in" ? "/explore" : `/world/${cid}`);
            }}
            focus={CONTINENT_FOCUS[id]}
            height="min(60vh, 520px)"
            ariaLabel={`Globe showing ${label}`}
          />
        ) : (
          <Loading label="Spinning the globe…" />
        )}
        <div className="space-y-4">
          <Card className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="size-5 text-[#e5a100]" /> Geography facts
            </h2>
            {info.facts.map((f) => (
              <p key={f} className="rounded-2xl bg-secondary-soft px-4 py-3 text-lg leading-snug">
                {f}
              </p>
            ))}
          </Card>
          <Card className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <PawPrint className="size-5 text-success" /> Wildlife
            </h2>
            <div className="flex flex-wrap gap-2">
              {info.wildlife.map((w) => (
                <span key={w} className="rounded-full bg-success-soft px-3 py-1.5 font-semibold text-[#1d7a52]">
                  {w}
                </span>
              ))}
            </div>
          </Card>
          <Card className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Users className="size-5 text-accent" /> People & culture
            </h2>
            <p className="text-lg leading-snug">{info.people}</p>
          </Card>
          {CONTINENT_BOX[id] && (
            <LinkButton href={`/puzzle/world-${k.slug}`} tone="accent" className="w-full">
              <Puzzle className="size-5" /> {label} map puzzle
            </LinkButton>
          )}
        </div>
      </div>

      {places.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">Famous destinations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {places.map((l) => (
              <Link key={l.id} href={`/landmarks/${l.id}`} className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                <Photo id={l.id} alt={l.name} credit={false} />
                <p className="mt-2 px-1 font-display text-lg font-bold leading-tight">{l.name}</p>
                <p className="flex items-center gap-1.5 px-1 text-sm text-ink-soft">
                  <Flag id={l.country} size={18} /> {countryName(l.country)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {countries.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">
            {countries.length} countries · {countries.filter((c) => p.countriesExplored.includes(c.id)).length} stamped
          </h2>
          <ShowMore
            items={countries}
            initial={12}
            noun="countries"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
            render={(c) => (
              <Link
                key={c.id}
                href={c.id === "in" ? "/explore" : `/world/${c.id}`}
                className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2 font-semibold transition hover:border-primary/40 ${p.countriesExplored.includes(c.id) ? "border-success" : "border-line"}`}
              >
                <Flag id={c.id} size={28} /> <span className="truncate">{c.name}</span>
              </Link>
            )}
          />
        </section>
      )}
    </div>
  );
}
