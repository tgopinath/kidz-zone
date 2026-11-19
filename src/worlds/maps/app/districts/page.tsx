"use client";

import Link from "next/link";
import { ArrowRight, Star, Volume2 } from "lucide-react";
import { DistrictPreview, IndiaOutlineDefs, StateLocator } from "@/components/StateLocator";
import { DataStatusBadge, PageHeader, ProgressBar, ShowMore, TamilName } from "@/components/ui";
import { getState, PILOT_STATE, REGION_COLOURS, STATES, districtsLabel, type StateInfo } from "@/lib/content";
import { DISTRICT_FILLS, useIndiaMap } from "@/lib/geo";
import { speakLocal } from "@/lib/speech";
import { useProgress } from "@/lib/progress";

const sayDistricts = (s: StateInfo) =>
  speakLocal(
    `${s.name} has ${districtsLabel(s.districtCount)}.`,
    s.ta && `${s.ta.name}: ${s.districtCount} ${s.districtCount === 1 ? "மாவட்டம்" : "மாவட்டங்கள்"}.`,
    { force: true },
  );

function Speaker({ s, className = "" }: { s: StateInfo; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => sayDistricts(s)}
      aria-label={`Hear ${s.name}`}
      title={`Hear ${s.name}`}
      data-no-announce
      className={`grid size-12 place-items-center rounded-full bg-primary text-white transition active:translate-y-px ${className}`}
    >
      <Volume2 className="size-6" />
    </button>
  );
}

export default function DistrictsHome() {
  const p = useProgress();
  const { features } = useIndiaMap();
  const pilot = getState(PILOT_STATE)!;
  const learned = (id: string) => p.districtsLearned[id]?.length ?? 0;

  return (
    <div>
      <PageHeader back="/"  title="Learn Districts" subtitle="Pick a state and discover its districts one by one." />
      {features && <IndiaOutlineDefs features={features} />}

      <div className="relative mb-6">
      <Link
        href={`/districts/${pilot.id}`}
        className="flex flex-col gap-4 overflow-hidden rounded-[2rem] bg-secondary p-6 pr-20 shadow-[var(--shadow-card)] transition hover:-translate-y-1 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-3xl bg-white p-2 shadow-sm">
            <DistrictPreview stateId={pilot.id} fills={DISTRICT_FILLS} size={96} />
          </div>
        </div>
        <div className="flex-1">
          <p className="flex items-center gap-1 font-display font-bold text-[#8a5b00]">
            <Star className="size-4 fill-current" /> Featured state
          </p>
          <h2 className="text-3xl font-extrabold">{pilot.name} · {districtsLabel(pilot.districtCount)}</h2>
          <p className="text-lg text-ink/80">Every district has a fun fact and its headquarters town.</p>
          <ProgressBar value={learned(pilot.id) / pilot.districtCount} tone="bg-success" className="mt-3 max-w-md bg-white/60" />
          <p className="mt-1 text-sm font-bold">{learned(pilot.id)} of {pilot.districtCount} learned</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-2xl bg-white px-5 py-3 font-display text-lg font-bold sm:self-center">
          Start <ArrowRight className="size-5" />
        </span>
      </Link>
      <Speaker s={pilot} className="absolute right-4 top-4" />
      </div>

      <h2 className="mb-3 text-2xl font-bold">All states & Union Territories</h2>
      <ShowMore
        items={STATES.filter((s) => s.id !== PILOT_STATE)}
        initial={6}
        noun="states"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        render={(s) => (
          <div key={s.id} className="relative transition hover:z-20 hover:-translate-y-0.5">
            <Link
              href={`/districts/${s.id}`}
              aria-label={`${s.name}, ${districtsLabel(s.districtCount)}`}
              className="flex h-full items-center gap-4 rounded-3xl bg-white p-3 pr-16 shadow-[var(--shadow-card)]"
            >
              <div className="relative grid shrink-0 place-items-center rounded-2xl p-1.5" style={{ background: `${REGION_COLOURS[s.region]}e0` }}>
                <DistrictPreview stateId={s.id} fills={DISTRICT_FILLS} size={84} />
                {features && (
                  <span className="absolute -bottom-2 -right-2 rounded-xl border-2 border-white bg-[#eef2f9] p-1 shadow-md">
                    <StateLocator id={s.id} features={features} colour="#e5484d" size={38} bold />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold leading-tight">{s.name}</h3>
                <TamilName text={s.ta?.name} className="text-sm font-semibold text-primary" />
                <p className="text-sm font-bold text-ink-soft">{districtsLabel(s.districtCount)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <DataStatusBadge status={s.dataStatus} issues={s.issues} />
                  {learned(s.id) > 0 && <span className="text-sm font-bold text-success">{learned(s.id)} learned</span>}
                </div>
              </div>
            </Link>
            <Speaker s={s} className="absolute right-3 top-3" />
          </div>
        )}
      />
    </div>
  );
}
