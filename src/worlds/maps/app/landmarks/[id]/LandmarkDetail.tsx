"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Compass, Globe2, Landmark as LandmarkIcon, Lock, MapPin, Satellite, Sparkles, Volume2 } from "lucide-react";
import GlobeView from "@/components/GlobeView";
import { Flag, Photo } from "@/components/Media";
import { Card, Chip, LinkButton, Loading, PageHeader } from "@/components/ui";
import { useWorldMap } from "@/lib/geo";
import { CATEGORIES, getLandmark, landmarksIn, mediaFor } from "@/lib/explorer";
import { isUnlocked } from "@/lib/missions";
import { actions, useProgress } from "@/lib/progress";
import { speakLines } from "@/lib/speech";
import { continentColour, countryName, getCountry } from "@/lib/world";

type Tab = "globe" | "satellite" | "street";

export default function LandmarkDetail({ id }: { id: string }) {
  const l = getLandmark(id)!;
  const m = mediaFor(id);
  const p = useProgress();
  const { features } = useWorldMap();
  const [tab, setTab] = useState<Tab>("globe");
  const open = isUnlocked(p, id);
  const coords = m?.coords ?? null;
  const focus = useMemo(() => (coords ? { coords, zoom: 3 } : null), [coords]);
  const more = landmarksIn(l.country).filter((x) => x.id !== id);

  useEffect(() => {
    if (!open) return;
    actions.seeLandmark(id);
    actions.visit(`/landmarks/${id}`, l.name);
  }, [id, open, l.name]);

  if (!open)
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <PageHeader back="/landmarks" backLabel="All landmarks" title="Secret destination" />
        <Card className="space-y-3">
          <Lock className="mx-auto size-12 text-primary" />
          <p className="text-lg">Finish more explorer missions to unlock this place.</p>
          <LinkButton href="/progress#missions">See my missions</LinkButton>
        </Card>
      </div>
    );

  const say = () => speakLines([l.name, `In ${l.city}, ${countryName(l.country)}.`, l.why, l.period, ...l.facts], { force: true });
  const lat = coords?.[1];
  const lon = coords?.[0];

  return (
    <div className="space-y-6">
      <PageHeader back="/landmarks" backLabel="All landmarks" title={l.name} subtitle={`${l.city}, ${countryName(l.country)}`}>
        <button
          type="button"
          data-no-announce
          onClick={say}
          className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-display text-lg font-bold text-white"
        >
          <Volume2 className="size-5" /> Hear the story
        </button>
      </PageHeader>

      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Photo id={id} alt={l.name} ratio="aspect-[16/10]" />
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Chip className="bg-primary-soft text-primary">{CATEGORIES.find((c) => c.id === l.category)?.label}</Chip>
              <Link href={`/world/${l.country}`} className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-sm font-bold hover:bg-primary-soft">
                <Flag id={l.country} size={20} /> {countryName(l.country)}
              </Link>
            </div>
            <p className="font-display text-xl font-bold leading-snug">{l.why}</p>
            <dl className="grid grid-cols-2 gap-3">
              <Fact icon={Calendar} label="When" value={l.period} />
              <Fact icon={LandmarkIcon} label="Style" value={l.style} />
              <Fact icon={MapPin} label="Where" value={l.city} wide />
            </dl>
          </Card>
          <Card className="space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="size-5 text-[#e5a100]" /> Amazing facts
            </h2>
            {l.facts.map((f) => (
              <p key={f} className="rounded-2xl bg-secondary-soft px-4 py-3 text-lg leading-snug">
                {f}
              </p>
            ))}
            {m?.article && (
              <a href={m.article} target="_blank" rel="noreferrer" className="inline-block pt-1 text-sm font-bold text-primary underline">
                Read more on Wikipedia
              </a>
            )}
          </Card>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Find it on the map</h2>
          <div role="tablist" aria-label="Map view" className="flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]">
            {(
              [
                ["globe", "Globe", Globe2],
                ["satellite", "Satellite", Satellite],
                ["street", "360° view", Compass],
              ] as const
            ).map(([t, label, Icon]) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-display font-semibold ${tab === t ? "bg-primary text-white" : "text-ink-soft"}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        {!coords ? (
          <Card className="text-ink-soft">The exact location of this place isn&apos;t available yet.</Card>
        ) : tab === "globe" ? (
          features ? (
            <GlobeView
              features={features}
              fillFor={(f) => (f.properties.id === l.country ? "#ff8b5c" : continentColour(getCountry(f.properties.id)?.continent ?? "Asia"))}
              nameFor={countryName}
              markers={[{ id, coords, label: l.name }]}
              focus={focus}
              height="min(60vh, 520px)"
              ariaLabel={`Globe showing where ${l.name} is`}
            />
          ) : (
            <Loading label="Spinning the globe…" />
          )
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
            <iframe
              key={tab}
              title={tab === "street" ? `360° view of ${l.name}` : `Satellite view of ${l.name}`}
              src={
                tab === "street"
                  ? `https://maps.google.com/maps?layer=c&cbll=${lat},${lon}&cbp=12,0,0,0,0&output=svembed`
                  : `https://maps.google.com/maps?q=${lat},${lon}&t=k&z=16&hl=en&output=embed`
              }
              className="block h-[60vh] max-h-[560px] w-full border-0"
              loading="lazy"
              allowFullScreen
            />
            {tab === "street" && (
              <p className="bg-white px-4 py-2 text-sm text-ink-soft">
                Drag to look all around. If the view is blank, Google has no 360° photos right at this spot — try Satellite instead.
              </p>
            )}
          </div>
        )}
      </section>

      {more.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">More in {countryName(l.country)}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((x) => (
              <Link key={x.id} href={`/landmarks/${x.id}`} className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                <Photo id={x.id} alt={x.name} credit={false} />
                <p className="mt-2 px-1 font-display text-lg font-bold leading-tight">{x.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value, wide }: { icon: typeof Calendar; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-bg p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
        <Icon className="size-4 text-primary" /> {label}
      </dt>
      <dd className="font-display text-lg font-bold leading-snug">{value}</dd>
    </div>
  );
}
