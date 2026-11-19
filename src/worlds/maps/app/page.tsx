"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookMarked, CalendarCheck, CheckCircle2, Compass, Flame, Gamepad2, Globe2, Landmark, Star, Target, Utensils } from "lucide-react";
import GlobeView, { type GlobeMarker } from "@/components/GlobeView";
import { GameCards } from "@/components/games/GameCards";
import { Flag, Photo } from "@/components/Media";
import { Card, LinkButton, ProgressBar } from "@/components/ui";
import { getDistricts, PILOT_STATE } from "@/lib/content";
import { LANDMARKS, mediaFor } from "@/lib/explorer";
import { STATE_FILLS, useWorldMap } from "@/lib/geo";
import { missionState } from "@/lib/missions";
import { levelFor, useProgress, useToday } from "@/lib/progress";
import { continentColour, countryName, getCountry } from "@/lib/world";

const MARKERS: GlobeMarker[] = LANDMARKS.flatMap((l) => (mediaFor(l.id)?.coords ? [{ id: l.id, coords: mediaFor(l.id)!.coords!, label: l.name }] : []));

const SECTIONS = [
  { href: "/explore", title: "Explore India", text: "States, districts and puzzles", icon: Compass, photo: "taj-mahal", tint: "#356ae6" },
  { href: "/world", title: "Explore the World", text: "Spin the globe and visit countries", icon: Globe2, photo: "great-wall", tint: "#1f8a7a" },
  { href: "/landmarks", title: "Landmarks 360", text: "Famous places in photos and 360°", icon: Landmark, photo: "eiffel-tower", tint: "#d9592a" },
  { href: "/cultures", title: "Cultures & Food", text: "Food, clothes, festivals and hellos", icon: Utensils, photo: "dosa", tint: "#b47c00" },
];

export default function Home() {
  const p = useProgress();
  const router = useRouter();
  const { features } = useWorldMap();
  const lvl = levelFor(p.points);
  const missions = missionState(p);
  const nextMission = missions.find((m) => !m.done);
  const day = useToday();
  const dailyDone = Boolean(day && p.games[`daily:${day}`]);
  const stamps = Object.entries(p.stamps).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 6);
  const tnTotal = getDistricts(PILOT_STATE).length;
  const greeting = p.points === 0 ? "Hi! I'm Gaju. Ready to explore India and the world?" : `Welcome back, ${lvl.name}! Where shall we go today?`;

  return (
    <div className="space-y-7">
      {/* Hero with a live globe */}
      <section className="relative grid items-center gap-4 overflow-hidden rounded-[2rem] bg-primary px-6 py-7 text-white md:grid-cols-[1fr_1.05fr] sm:px-10">
        <div className="relative z-10">
          <p className="font-display text-lg font-semibold text-secondary">{greeting}</p>
          <h1 className="mt-1 text-4xl font-extrabold leading-tight sm:text-5xl">Map Explorer</h1>
          <p className="mt-2 max-w-md text-lg text-white/85">Travel across India and the world — discover places, cultures and food, play games and fill your passport.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href="/world" tone="secondary">
              <Globe2 className="size-5" /> Explore the world
            </LinkButton>
            <LinkButton href="/explore" tone="white">
              <Compass className="size-5" /> Explore India
            </LinkButton>
          </div>
        </div>
        <div className="relative -my-4 md:-mr-6">
          {features ? (
            <GlobeView
              features={features}
              fillFor={(f) => (f.properties.id === "in" ? "#ff8b5c" : getCountry(f.properties.id) ? continentColour(getCountry(f.properties.id)!.continent) : STATE_FILLS[f.properties.c])}
              nameFor={countryName}
              markers={MARKERS}
              onMarker={(id) => router.push(`/landmarks/${id}`)}
              onSelect={(id) => router.push(id === "in" ? "/explore" : `/world/${id}`)}
              autoRotate
              showControls={false}
              height="min(52vh, 380px)"
              ariaLabel="Spinning globe. Tap a country to visit it"
            />
          ) : (
            <div className="h-[min(52vh,380px)]" />
          )}
        </div>
      </section>

      {/* Continue + daily + progress */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
            <ArrowRight className="size-4 text-primary" /> Continue exploring
          </p>
          {p.lastVisited ? (
            <Link href={p.lastVisited.href} className="font-display text-2xl font-extrabold leading-tight text-primary hover:underline">
              {p.lastVisited.label}
            </Link>
          ) : (
            <Link href="/world" className="font-display text-2xl font-extrabold leading-tight text-primary hover:underline">
              Start with the globe
            </Link>
          )}
          {nextMission && (
            <Link href={nextMission.href} className="mt-auto flex items-center gap-2 rounded-2xl bg-bg px-3 py-2 text-sm font-semibold hover:bg-primary-soft">
              <Target className="size-4 shrink-0 text-accent" /> Mission: {nextMission.title} ({nextMission.n}/{nextMission.goal})
            </Link>
          )}
        </Card>
        <Link href="/games/daily" className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-secondary p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#8a5b00]">
            <CalendarCheck className="size-4" /> Daily Geography Challenge
          </p>
          <p className="font-display text-2xl font-extrabold leading-tight">{dailyDone ? "Done today — great job!" : "5 questions are waiting!"}</p>
          <span className="mt-auto inline-flex items-center gap-2 self-start rounded-2xl bg-white px-4 py-2 font-display font-bold">
            {dailyDone ? <CheckCircle2 className="size-5 text-success" /> : <ArrowRight className="size-5" />} {dailyDone ? "Play again" : "Play"}
          </span>
        </Link>
        <Card className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
            <Star className="size-4 fill-secondary text-[#e5a100]" /> {lvl.name}
          </p>
          <ProgressBar value={lvl.pct} tone="bg-secondary" />
          <div className="mt-1 grid grid-cols-3 gap-2 text-center">
            <Stat value={p.countriesExplored.length} label="stamps" />
            <Stat value={missions.filter((m) => m.done).length} label="missions" />
            <Stat value={p.streak.current} label="day streak" icon={<Flame className="size-4 text-accent" />} />
          </div>
          <p className="text-sm text-ink-soft">
            Tamil Nadu districts: {p.districtsLearned[PILOT_STATE]?.length ?? 0}/{tnTotal}
          </p>
        </Card>
      </section>

      {/* Sections */}
      <section>
        <h2 className="mb-3 text-2xl font-bold">Where to next?</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="group overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-1">
              <div className="relative">
                <Photo id={s.photo} alt="" credit={false} ratio="aspect-[16/10]" className="[&>div]:rounded-none" />
                <span className="absolute left-3 top-3 grid size-11 place-items-center rounded-2xl bg-white shadow" style={{ color: s.tint }}>
                  <s.icon className="size-6" />
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-ink-soft">{s.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Passport preview */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <BookMarked className="size-6 text-primary" /> My Explorer Passport
          </h2>
          <Link href="/progress" className="font-display font-bold text-primary">
            Open passport
          </Link>
        </div>
        <Link href="/progress" className="flex flex-wrap items-center gap-3 rounded-[2rem] border-4 border-[#1f3b7a] bg-[#f6f1e3] p-4 shadow-[var(--shadow-card)]">
          {stamps.length ? (
            stamps.map(([id], i) => (
              <span key={id} className="flex size-20 flex-col items-center justify-center rounded-full border-[3px] border-dashed text-center" style={{ borderColor: ["#2f5fd0", "#d9592a", "#1d7a52", "#7b55e0", "#b47c00"][i % 5], transform: `rotate(${((i * 37) % 17) - 8}deg)` }}>
                <Flag id={id} size={28} />
                <span className="mt-0.5 line-clamp-1 px-1 font-display text-[10px] font-extrabold uppercase">{getCountry(id)?.name}</span>
              </span>
            ))
          ) : (
            <span className="px-2 py-3 text-lg text-ink-soft">No stamps yet — tap a country on the globe to collect your first one!</span>
          )}
        </Link>
      </section>

      {/* Games */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Gamepad2 className="size-6 text-accent" /> Play a game
          </h2>
          <Link href="/games" className="font-display font-bold text-primary">
            All challenges
          </Link>
        </div>
        <GameCards ids={["find-country", "match-flags", "arrange-states"]} />
      </section>
    </div>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-bg p-2">
      <p className="flex items-center justify-center gap-1 font-display text-2xl font-extrabold">
        {icon}
        {value}
      </p>
      <p className="text-xs font-bold text-ink-soft">{label}</p>
    </div>
  );
}
