"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Building2, Cloud, Coins, Landmark, Languages, Mountain, PawPrint, Sparkles, Stamp, Users } from "lucide-react";
import GlobeView from "@/components/GlobeView";
import { Flag, Photo } from "@/components/Media";
import { Card, Chip, Loading, PageHeader } from "@/components/ui";
import { useWorldMap } from "@/lib/geo";
import { actions, useProgress } from "@/lib/progress";
import { speak, speakNative } from "@/lib/speech";
import { clothingIn, countryDetails, describeCountry, festivalsIn, foodsIn, greetingsIn, landmarksIn, mediaFor } from "@/lib/explorer";
import { continentColour, continentLabel, CONTINENTS, countryName, getCountry, peopleText } from "@/lib/world";

export default function CountryExplorer({ id }: { id: string }) {
  const c = getCountry(id)!;
  const d = countryDetails(c);
  const { features } = useWorldMap();
  const p = useProgress();
  const stamped = p.stamps[id];
  const places = landmarksIn(id);
  const foods = foodsIn(id);
  const fests = festivalsIn(id);
  const clothes = clothingIn(id);
  const hellos = greetingsIn(id);
  const focus = useMemo(() => (d.latlng ? { coords: [d.latlng[1], d.latlng[0]] as [number, number], zoom: c.pop > 1e8 ? 1.7 : 2.6 } : null), [d.latlng, c.pop]);
  const slug = CONTINENTS.find((k) => k.id === c.continent)?.slug;

  useEffect(() => {
    actions.exploreCountry(id);
    actions.visit(`/world/${id}`, c.name);
  }, [id, c.name]);

  return (
    <div className="space-y-6">
      <PageHeader back="/world" backLabel="World" title={c.name} say={() => speak(describeCountry(id), { force: true })} subtitle={c.name === c.continent ? "A continent of its own" : `${continentLabel(c.continent)}${c.subregion && c.subregion !== c.continent ? ` · ${c.subregion}` : ""}`}>
        <div className="flex items-center gap-3">
          <Flag id={id} size={84} />
          {stamped && (
            <span className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-success bg-success-soft px-3 py-1.5 font-display font-bold text-[#1d7a52]">
              <Stamp className="size-4" /> Stamped {new Date(stamped).toLocaleDateString()}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          {features ? (
            <GlobeView
              features={features}
              fillFor={(f) => (f.properties.id === id ? "#ff8b5c" : continentColour(getCountry(f.properties.id)?.continent ?? "Asia"))}
              nameFor={countryName}
              selectedId={id}
              focus={focus}
              height="min(52vh, 460px)"
              ariaLabel={`Globe showing where ${c.name} is`}
            />
          ) : (
            <Loading label="Spinning the globe…" />
          )}
        </div>

        <Card className="grid grid-cols-2 gap-3">
          {c.capitals.length > 0 && <Fact icon={Landmark} label={c.capitals.length > 1 ? "Capitals" : "Capital"} value={c.capitals.join(", ")} tint="text-primary" />}
          <Fact icon={Users} label="People" value={peopleText(c)} tint="text-success" />
          {d.languages.length > 0 && <Fact icon={Languages} label="Languages" value={d.languages.join(", ")} tint="text-[#7b55e0]" />}
          {d.currencies.length > 0 && <Fact icon={Coins} label="Money" value={d.currencies.map((x) => `${x.name}${x.symbol ? ` (${x.symbol})` : ""}`).join(", ")} tint="text-[#c58a00]" />}
          {d.cities.length > 0 && <Fact icon={Building2} label="Big cities" value={d.cities.join(", ")} tint="text-accent" />}
          {d.animal && <Fact icon={PawPrint} label="National animal" value={d.animal} tint="text-[#1f8a7a]" />}
          {d.features.length > 0 && <Fact icon={Mountain} label="Mountains & rivers" value={d.features.join(", ")} tint="text-[#5b6680]" wide />}
          {d.climate && <Fact icon={Cloud} label="Climate" value={d.climate} tint="text-[#4a90d9]" wide />}
          {c.neighbours.length > 0 && (
            <div className="col-span-2 rounded-2xl bg-bg p-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">Neighbours</p>
              <div className="flex flex-wrap gap-1.5">
                {c.neighbours.map((n) => (
                  <Link key={n} href={n === "in" ? "/explore" : `/world/${n}`} className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-sm font-bold hover:bg-primary-soft">
                    <Flag id={n} size={18} /> {countryName(n)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {d.facts.length > 0 && (
        <Card className="space-y-2">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="size-5 text-[#e5a100]" /> Did you know?
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {d.facts.map((f) => (
              <button key={f} type="button" data-no-announce onClick={() => speak(f, { force: true })} className="rounded-2xl bg-secondary-soft px-4 py-3 text-left text-lg leading-snug">
                {f}
              </button>
            ))}
          </div>
        </Card>
      )}

      {places.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">Famous places</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((l) => (
              <Link key={l.id} href={`/landmarks/${l.id}`} className="overflow-hidden rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                <Photo id={l.id} alt={l.name} credit={false} />
                <p className="mt-2 px-1 font-display text-lg font-bold">{l.name}</p>
                <p className="px-1 text-sm text-ink-soft">{l.city}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(foods.length > 0 || fests.length > 0 || clothes.length > 0 || hellos.length > 0) && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">Culture</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ...foods.map((f) => ({ id: f.id, name: f.name, tag: "Food", tab: "food" })),
              ...fests.map((f) => ({ id: f.id, name: f.name, tag: "Festival", tab: "festivals" })),
              ...clothes.map((f) => ({ id: f.id, name: f.name, tag: "Clothing", tab: "clothing" })),
            ].map((x) => (
              <Link key={x.id} href={`/cultures?tab=${x.tab}#${x.id}`} className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                <Photo id={x.id} alt={x.name} credit={false} ratio="aspect-square" />
                <Chip className="mt-2 bg-bg text-ink-soft">{x.tag}</Chip>
                <p className="px-1 font-display text-lg font-bold">{x.name}</p>
              </Link>
            ))}
            {hellos.map((g) => (
              <button
                key={g.id}
                type="button"
                data-no-announce
                onClick={() => {
                  speakNative(g.native, g.word, g.voice);
                  actions.hearGreeting(g.id);
                }}
                className="flex flex-col items-start justify-center gap-1 rounded-[var(--radius-card)] bg-primary p-5 text-left text-white shadow-[var(--shadow-card)]"
              >
                <span className="text-sm font-bold text-white/80">Say hello in {g.language}</span>
                <span className="font-display text-3xl font-extrabold">{g.word}</span>
                <span className="flex items-center gap-1 text-sm">
                  Tap to hear
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!d.featured && (
        <p className="rounded-2xl bg-bg p-4 text-ink-soft">
          More stories about {c.name} are coming soon. Capital, people, languages, money and big cities come from open map and country datasets.
        </p>
      )}
      {slug && (
        <Link href={`/world/continent/${slug}`} className="inline-flex font-display font-bold text-primary">
          More countries in {continentLabel(c.continent)} →
        </Link>
      )}
      <p className="text-xs text-ink-soft">
        Sources: Natural Earth, mledoze/countries (ODbL), Wikipedia & Wikimedia Commons.{" "}
        {mediaFor(places[0]?.id ?? "")?.article && (
          <a className="underline" href={mediaFor(places[0].id)!.article} target="_blank" rel="noreferrer">
            Read more on Wikipedia
          </a>
        )}
      </p>
    </div>
  );
}

function Fact({ icon: Icon, label, value, tint, wide }: { icon: typeof Landmark; label: string; value: string; tint: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-bg p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <Icon className={`size-4 ${tint}`} /> {label}
      </p>
      <p className="font-display text-lg font-bold leading-snug">{value}</p>
    </div>
  );
}
