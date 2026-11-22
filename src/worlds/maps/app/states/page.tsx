"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { IndiaOutlineDefs, StateLocator } from "@/components/StateLocator";
import { Chip, PageHeader, ShowMore, SpeakButton, TamilName } from "@/components/ui";
import { REGION_COLOURS, STATES, type Region, type StateInfo, districtsLabel } from "@/lib/content";
import { useIndiaMap } from "@/lib/geo";
import { speakLocal } from "@/lib/speech";
import { useProgress } from "@/lib/progress";

const REGIONS = Object.keys(REGION_COLOURS) as Region[];

const sayState = (s: StateInfo) =>
  speakLocal(
    `${s.name}. Its capital is ${s.capital.replace(/\s*\(([^)]*)\)/g, " in $1")}.`,
    s.ta && `${s.ta.name}. இதன் தலைநகரம் ${s.ta.capital}.`,
    { force: true },
  );

export default function StatesPage() {
  const p = useProgress();
  const { features } = useIndiaMap();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<Region | "all">("all");
  const [type, setType] = useState<"all" | "state" | "ut">("all");

  const list = useMemo(
    () =>
      STATES.filter(
        (s) =>
          (region === "all" || s.region === region) &&
          (type === "all" || s.type === type) &&
          (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.capital.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, region, type],
  );

  return (
    <div>
      <PageHeader back="/"  title="Learn States" subtitle={`${p.statesViewed.length} of ${STATES.length} explored. Tap a card to start learning!`}>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            aria-label="Search states"
            className="w-full rounded-2xl border-2 border-line bg-white py-3 pl-11 pr-4 text-lg outline-none focus:border-primary"
          />
        </div>
      </PageHeader>
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "state", "ut"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`rounded-full px-4 py-2 font-display font-semibold ${type === t ? "bg-ink text-white" : "bg-white text-ink-soft"}`}>
              {t === "all" ? "All 36" : t === "state" ? "28 States" : "8 Union Territories"}
            </button>
          ))}
          <span className="mx-1 w-px bg-line" />
          {(["all", ...REGIONS] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-display font-semibold ${region === r ? "bg-primary text-white" : "bg-white text-ink-soft"}`}
            >
              {r !== "all" && <span className="size-3 rounded-full" style={{ background: REGION_COLOURS[r] }} />}
              {r === "all" ? "Every region" : r}
            </button>
          ))}
        </div>
      </div>

      {features && <IndiaOutlineDefs features={features} />}
      <ShowMore
        key={`${q}|${region}|${type}`}
        items={list}
        initial={q || region !== "all" || type !== "all" ? list.length : 9}
        noun="states"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        render={(s) => {
          const seen = p.statesViewed.includes(s.id);
          const tint = REGION_COLOURS[s.region];
          return (
            <div key={s.id} className="relative">
              <Link
                href={`/states/${s.id}`}
                aria-label={`${s.name}, capital ${s.capital}`}
                className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-1"
              >
                <div className="grid h-36 place-items-center" style={{ background: `${tint}e0` }}>
                  {features ? (
                    <StateLocator id={s.id} features={features} colour={s.type === "ut" ? "#ff6a33" : "#356ae6"} size={112} />
                  ) : (
                    <div className="h-[125px] w-[112px]" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-xl font-bold leading-tight">{s.name}</h2>
                  <TamilName text={s.ta?.name} className="font-display text-base font-semibold text-primary" />
                  <p className="mt-1 text-ink-soft">Capital: <b className="text-ink">{s.capital}</b></p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Chip className={s.type === "ut" ? "bg-accent-soft text-[#b4471c]" : "bg-primary-soft text-primary"}>{s.type === "ut" ? "UT" : "State"}</Chip>
                    <Chip className="bg-bg text-ink-soft">{districtsLabel(s.districtCount)}</Chip>
                    <Chip className="bg-bg text-ink-soft">{s.region}</Chip>
                  </div>
                </div>
              </Link>
              <SpeakButton label={`Hear ${s.name}`} onSpeak={() => sayState(s)} />
              {seen && (
                <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-success text-white" title="Explored" aria-label="Explored">
                  <Check className="size-4" />
                </span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
