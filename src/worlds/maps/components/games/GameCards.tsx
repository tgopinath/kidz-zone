"use client";

import Link from "next/link";
import { CalendarCheck, Crosshair, Gamepad2, Landmark, MapPin, Play, Trophy } from "lucide-react";
import { Flag, Photo } from "@/components/Media";
import { ContinentLocator, IndiaColoured, IndiaOutlineDefs, StateLocator, WorldOutlineDefs } from "@/components/StateLocator";
import { SpeakButton } from "@/components/ui";
import { getState } from "@/lib/content";
import { STATE_FILLS, useIndiaMap, useWorldMap, type RegionFeature } from "@/lib/geo";
import { useProgress } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { getCountry } from "@/lib/world";
import { GAMES } from "./registry";

type Game = (typeof GAMES)[number];
const continentOf = (id: string) => getCountry(id)?.continent;

/** A little picture of each game, drawn from the real maps. */
function Picture({ g, india, world }: { g: Game; india: RegionFeature[] | null; world: RegionFeature[] | null }) {
  if (!india) return <div className="h-[118px]" />;
  switch (g.id) {
    case "identify-state":
      return (
        <div className="relative">
          <StateLocator id="madhya-pradesh" features={india} colour="#ff8b5c" size={104} />
          <span className="absolute -right-3 top-6 grid size-9 place-items-center rounded-full bg-white font-display text-2xl font-extrabold text-accent shadow-md">?</span>
        </div>
      );
    case "find-capital":
      return (
        <div className="relative">
          <StateLocator id="rajasthan" features={india} colour="#ffc857" size={104} />
          <MapPin className="absolute left-[26px] top-[34px] size-8 fill-accent text-white drop-shadow" />
          <Landmark className="absolute -right-3 bottom-2 size-9 rounded-full bg-white p-1.5 text-[#c58a00] shadow-md" />
        </div>
      );
    case "district-explorer":
      return (
        <div className="relative">
          <StateLocator id="tamil-nadu" features={india} colour="#36b37e" size={104} />
          <Crosshair className="absolute bottom-[10px] left-[38px] size-9 text-accent drop-shadow" strokeWidth={2.5} />
        </div>
      );
    case "arrange-states":
      return <IndiaColoured features={india} fills={STATE_FILLS} size={104} blank={["maharashtra", "kerala", "bihar", "gujarat"]} />;
    case "identify-country":
      return world ? (
        <ContinentLocator continent="Africa" features={world} continentOf={continentOf} colour="#ff8b5c" size={190} />
      ) : (
        <div className="h-[100px]" />
      );
    case "neighbours":
      return <StateLocator id="telangana" features={india} colour="#ff8b5c" also={getState("telangana")!.neighbours} size={104} />;
    case "find-country":
      return world ? <ContinentLocator continent="Europe" features={world} continentOf={continentOf} colour="#2f5fd0" size={190} /> : <div className="h-[100px]" />;
    case "world-jigsaw":
      return world ? <ContinentLocator continent="South America" features={world} continentOf={continentOf} colour="#ff8b5c" size={190} /> : <div className="h-[100px]" />;
    case "continent-challenge":
      return world ? <ContinentLocator continent="Oceania" features={world} continentOf={continentOf} colour="#1f8a7a" size={190} /> : <div className="h-[100px]" />;
    case "match-flags":
      return (
        <div className="flex -space-x-3">
          {["fr", "jp", "br"].map((id, i) => (
            <span key={id} style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
              <Flag id={id} size={72} />
            </span>
          ))}
        </div>
      );
    case "guess-capital":
      return (
        <div className="relative">
          <Flag id="jp" size={110} />
          <span className="absolute -bottom-3 -right-4 rounded-full bg-white px-3 py-1 font-display text-lg font-extrabold text-[#b47c00] shadow-md">Tokyo?</span>
        </div>
      );
    case "landmark-detective":
      return (
        <div className="relative w-44">
          <Photo id="taj-mahal" alt="" credit={false} ratio="aspect-[16/10]" />
          <span className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full bg-white font-display text-2xl font-extrabold text-[#7b55e0] shadow-md">?</span>
        </div>
      );
    case "food-explorer":
      return (
        <div className="relative w-44">
          <Photo id="sushi" alt="" credit={false} ratio="aspect-[16/10]" />
          <span className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full bg-white font-display text-2xl font-extrabold text-success shadow-md">?</span>
        </div>
      );
    case "daily":
      return <CalendarCheck className="size-20 text-[#b47c00]" />;
    default:
      return <Gamepad2 className="size-16" />;
  }
}

export function GameCards({ ids, group, className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }: { ids?: string[]; group?: string; className?: string }) {
  const p = useProgress();
  const india = useIndiaMap().features;
  const world = useWorldMap().features;
  const list = ids ? ids.map((id) => GAMES.find((g) => g.id === id)!).filter(Boolean) : group ? GAMES.filter((g) => g.group === group) : GAMES;
  return (
    <>
      {india && <IndiaOutlineDefs features={india} />}
      {world && <WorldOutlineDefs features={world} continentOf={continentOf} />}
      <div className={className}>
        {list.map((g) => {
          const rec = p.games[g.id];
          const bestPuzzle = g.id === "arrange-states" ? Math.max(0, ...["easy", "medium", "hard"].map((l) => p.puzzles[`india:${l}`]?.bestScore ?? 0)) : 0;
          const best = rec?.bestScore ?? bestPuzzle;
          return (
            <div key={g.id} className="group relative">
              <Link
                href={g.href}
                aria-label={`Play ${g.title}`}
                className="flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white transition group-hover:-translate-y-1 group-active:translate-y-0.5"
              >
                <div
                  className="relative grid h-40 place-items-center overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${g.bg}, ${g.fg}40)` }}
                >
                  <div className="transition group-hover:scale-105">
                    <Picture g={g} india={india} world={world} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-xl font-extrabold leading-tight">{g.title}</h3>
                  <p className="text-ink-soft">{g.blurb}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-lg font-extrabold text-white" style={{ background: g.fg }}>
                      <Play className="size-5 fill-white" /> Play
                    </span>
                    {best > 0 ? (
                      <span className="flex items-center gap-1 rounded-full bg-secondary-soft px-3 py-1 text-sm font-bold text-[#8a5b00]">
                        <Trophy className="size-4" /> {best}
                      </span>
                    ) : (
                      <span className="rounded-full bg-bg px-3 py-1 text-sm font-bold text-ink-soft">New!</span>
                    )}
                  </div>
                </div>
              </Link>
              <SpeakButton label={`Hear ${g.title}`} onSpeak={() => speak(`${g.title}. ${g.blurb}.`, { force: true })} tone="white" className="absolute right-3 top-3" />
            </div>
          );
        })}
      </div>
    </>
  );
}
