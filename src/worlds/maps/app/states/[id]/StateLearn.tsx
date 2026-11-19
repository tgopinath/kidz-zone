"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Camera, Landmark, Languages, Lightbulb, Map as MapIcon, Puzzle, Users } from "lucide-react";
import MapView from "@/components/MapView";
import { Card, DataStatusBadge, LinkButton, Loading, PageHeader, ShowMore, TamilName } from "@/components/ui";
import { districtsLabel, getState, REGION_COLOURS, stateName } from "@/lib/content";
import { useDistrictMap } from "@/lib/geo";
import { actions } from "@/lib/progress";

export default function StateLearn({ id }: { id: string }) {
  const s = getState(id)!;
  const { features } = useDistrictMap(id);
  useEffect(() => actions.viewState(id), [id]);
  const tint = REGION_COLOURS[s.region];
  const where = `${s.type === "ut" ? "Union Territory" : "State"} · ${s.region === "Islands" ? "Islands" : `${s.region} India`}`;

  return (
    <div className="space-y-6">
      <PageHeader back="/states" backLabel="All states" title={s.name} subtitle={where} />
      <TamilName text={s.ta?.name} className="-mt-4 font-display text-xl font-bold text-primary" />

      {/* Left: map, then key facts below it. Right: neighbours, places, facts. */}
      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          {features ? (
            <MapView
              features={features}
              fillFor={() => tint}
              labelMode="none"
              nameFor={(f) => f.properties.lgdName ?? ""}
              ariaLabel={`Map of ${s.name}`}
              zoomable
              maxHeight="56vh"
            />
          ) : (
            <Loading />
          )}
          <div className="-mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <DataStatusBadge status={s.dataStatus} issues={s.issues} />
            <span>White lines are district borders.</span>
          </div>
          <Card className="grid grid-cols-2 p-0">
            <Fact icon={Landmark} tint="text-primary" label="Capital" value={s.capital} />
            <Fact icon={MapIcon} tint="text-success" label="Districts" value={districtsLabel(s.districtCount)} className="border-l border-line" />
            <Fact icon={Languages} tint="text-[#7b55e0]" label="Official languages" value={s.languages.join(", ")} className="col-span-2 border-t border-line" />
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <LinkButton href={`/districts/${s.id}`}>
              Explore Districts <ArrowRight className="size-5" />
            </LinkButton>
            <LinkButton href={`/puzzle/${s.id}`} tone="white">
              <Puzzle className="size-5" /> Puzzle
            </LinkButton>
          </div>
        </div>

        <div className="space-y-5">
          <Section icon={Users} tint="text-accent" title="Neighbours">
            {s.neighbours.length ? (
              <div className="flex flex-wrap gap-2">
                {s.neighbours.map((n) => (
                  <Link key={n} href={`/states/${n}`} className="rounded-full bg-bg px-3 py-1.5 font-semibold transition hover:bg-primary-soft">
                    {stateName(n)}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-ink-soft">No land neighbours in India — only the sea!</p>
            )}
          </Section>

          <Section icon={Camera} tint="text-primary" title="Famous places">
            <ShowMore
              as="ul"
              items={s.famousPlaces}
              initial={3}
              noun="places"
              className="space-y-2"
              render={(p) => (
                <li key={p} className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-2.5 font-semibold">
                  <span className="size-2 shrink-0 rounded-full bg-secondary" />
                  {p}
                </li>
              )}
            />
          </Section>

          <Section icon={Lightbulb} tint="text-[#e5a100]" title="Did you know?">
            <ShowMore
              items={s.facts}
              initial={1}
              noun="facts"
              className="space-y-2"
              render={(f, i) => (
                <p key={i} className="rounded-2xl bg-secondary-soft px-4 py-3 text-lg leading-snug">
                  {f}
                </p>
              )}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, tint, label, value, className = "" }: { icon: typeof Landmark; tint: string; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 px-5 py-4 ${className}`}>
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-bg">
        <Icon className={`size-5 ${tint}`} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink-soft">{label}</p>
        <p className="font-display text-lg font-bold leading-snug">{value}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, tint, title, children }: { icon: typeof Landmark; tint: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Icon className={`size-5 ${tint}`} /> {title}
      </h2>
      {children}
    </Card>
  );
}
