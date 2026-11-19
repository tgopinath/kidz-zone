"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { ContinentLocator, DistrictPreview, IndiaColoured, IndiaOutlineDefs, StateLocator, WorldOutlineDefs } from "@/components/StateLocator";
import { DataStatusBadge, PageHeader, ShowMore, SpeakButton, Stars, TamilName } from "@/components/ui";
import { PILOT_STATE, REGION_COLOURS, STATES, districtsLabel, getState } from "@/lib/content";
import { DISTRICT_FILLS, STATE_FILLS, useIndiaMap, useWorldMap } from "@/lib/geo";
import { useProgress, type Progress } from "@/lib/progress";
import { speak, speakLocal } from "@/lib/speech";
import { CONTINENT_BOX, CONTINENTS, countriesIn, getCountry } from "@/lib/world";

const best = (p: Progress, key: string) =>
  Math.max(0, ...(["easy", "medium", "hard"] as const).map((l) => p.puzzles[`${key}:${l}`]?.stars ?? 0));
const continentOf = (id: string) => getCountry(id)?.continent;

export default function PuzzleHub() {
  const p = useProgress();
  const india = useIndiaMap();
  const world = useWorldMap();
  const pilot = getState(PILOT_STATE)!;
  const sayState = (id: string) => {
    const s = getState(id)!;
    speakLocal(`${s.name} puzzle. Put ${districtsLabel(s.districtCount)} in the right place.`, s.ta && `${s.ta.name}: ${s.districtCount} மாவட்டங்கள்.`, { force: true });
  };

  return (
    <div>
      <PageHeader back="/"  title="Map Puzzle" subtitle="Drag each name card onto the right spot on the map." />
      {india.features && <IndiaOutlineDefs features={india.features} />}
      {world.features && <WorldOutlineDefs features={world.features} continentOf={continentOf} />}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Link href={`/puzzle/${PILOT_STATE}`} className="flex h-full items-center gap-4 rounded-[2rem] bg-accent p-6 pr-20 text-white shadow-[var(--shadow-card)] transition hover:-translate-y-1">
            <div className="flex shrink-0 items-center">
              <div className="rounded-3xl bg-white p-1.5 shadow-sm">
                <DistrictPreview stateId={pilot.id} fills={DISTRICT_FILLS} size={80} />
              </div>
            </div>
            <div>
              <p className="font-display font-bold text-white/80">Featured</p>
              <h2 className="text-2xl font-extrabold">Tamil Nadu District Challenge</h2>
              <p className="text-white/85">38 districts · Easy, Medium & Hard</p>
              <div className="mt-2"><Stars count={best(p, PILOT_STATE)} /></div>
            </div>
          </Link>
          <SpeakButton label="Hear Tamil Nadu puzzle" onSpeak={() => sayState(PILOT_STATE)} tone="white" className="absolute right-4 top-4" />
        </div>
        <div className="relative">
          <Link href="/puzzle/india" className="flex h-full items-center gap-4 rounded-[2rem] bg-primary p-6 pr-20 text-white shadow-[var(--shadow-card)] transition hover:-translate-y-1">
            <div className="grid shrink-0 place-items-center rounded-3xl bg-white p-2 shadow-sm">
              {india.features ? <IndiaColoured features={india.features} fills={STATE_FILLS} size={80} /> : <div className="h-[90px] w-20" />}
            </div>
            <div>
              <p className="font-display font-bold text-white/80">India</p>
              <h2 className="text-2xl font-extrabold">Arrange the States</h2>
              <p className="text-white/85">28 states & 8 Union Territories</p>
              <div className="mt-2"><Stars count={best(p, "india")} /></div>
            </div>
          </Link>
          <SpeakButton
            label="Hear Arrange the States"
            onSpeak={() => speak("Arrange the States. Put India's 28 states and 8 Union Territories in the right place.", { force: true })}
            tone="white"
            className="absolute right-4 top-4"
          />
        </div>
      </div>

      <h2 id="world" className="mb-3 flex scroll-mt-20 items-center gap-2 text-2xl font-bold">
        <Globe2 className="size-6 text-[#1f8a7a]" /> World puzzles
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CONTINENTS.filter((c) => CONTINENT_BOX[c.id]).map((c) => (
          <div key={c.id} className="relative">
            <Link href={`/puzzle/world-${c.slug}`} className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
              <div className="grid h-28 place-items-center" style={{ background: `${c.colour}e0` }}>
                {world.features ? <ContinentLocator continent={c.id} features={world.features} continentOf={continentOf} colour="#356ae6" size={170} /> : <div className="h-[90px] w-[170px]" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold leading-tight">{c.id}</h3>
                  <Stars count={best(p, `world-${c.slug}`)} size="size-5" />
                </div>
                <p className="text-sm text-ink-soft">{countriesIn(c.id).length} countries & territories</p>
                <p className="mt-1 text-sm text-ink-soft">{c.blurb}</p>
              </div>
            </Link>
            <SpeakButton label={`Hear ${c.id}`} onSpeak={() => speak(`${c.id} puzzle. ${c.blurb}.`, { force: true })} className="absolute right-3 top-3" />
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-2xl font-bold">District puzzles for every state</h2>
      <ShowMore
        items={STATES.filter((s) => s.id !== PILOT_STATE)}
        initial={6}
        noun="state puzzles"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        render={(s) => (
          <div key={s.id} className="relative transition hover:z-20 hover:-translate-y-0.5">
            <Link href={`/puzzle/${s.id}`} className="flex h-full items-center gap-4 rounded-3xl bg-white p-3 pr-16 shadow-[var(--shadow-card)]">
              <div className="relative grid shrink-0 place-items-center rounded-2xl p-1.5" style={{ background: `${REGION_COLOURS[s.region]}e0` }}>
                <DistrictPreview stateId={s.id} fills={DISTRICT_FILLS} size={84} />
                {india.features && (
                  <span className="absolute -bottom-2 -right-2 rounded-xl border-2 border-white bg-[#eef2f9] p-1 shadow-md">
                    <StateLocator id={s.id} features={india.features} colour="#e5484d" size={38} bold />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold leading-tight">{s.name}</h3>
                <TamilName text={s.ta?.name} className="text-sm font-semibold text-primary" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-soft">{districtsLabel(s.districtCount)}</span>
                  <Stars count={best(p, s.id)} size="size-4" />
                </div>
                <div className="mt-1.5"><DataStatusBadge status={s.dataStatus} issues={s.issues} /></div>
              </div>
            </Link>
            <SpeakButton label={`Hear ${s.name}`} onSpeak={() => sayState(s.id)} className="absolute right-3 top-3" />
          </div>
        )}
      />
    </div>
  );
}
