"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Award, BookMarked, CheckCircle2, Flame, Landmark, Lock, Map as MapIcon, Puzzle, Stamp, Star, Target, Trophy, Utensils } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { Flag } from "@/components/Media";
import { Card, PageHeader, ProgressBar, ShowMore, Stars } from "@/components/ui";
import { getState, PILOT_STATE } from "@/lib/content";
import { countryDetails, FEATURED, LANDMARKS } from "@/lib/explorer";
import { missionState } from "@/lib/missions";
import { actions, BADGES, levelFor, LEVELS, useProgress } from "@/lib/progress";
import { continentBySlug, continentLabel, COUNTRIES, getCountry, isCountry } from "@/lib/world";

const TOTAL_COUNTRIES = COUNTRIES.filter(isCountry).length;

export default function AchievementsPage() {
  const p = useProgress();
  const lvl = levelFor(p.points);
  const missions = missionState(p);
  const doneMissions = missions.filter((m) => m.done);
  const minutes = Math.round(Object.values(p.timeByDay).reduce((a, b) => a + b, 0) / 60);
  const districtsTotal = Object.values(p.districtsLearned).reduce((a, b) => a + b.length, 0);
  const stamps = Object.entries(p.stamps).sort((a, b) => b[1].localeCompare(a[1]));
  const cards = FEATURED.filter((id) => p.countriesExplored.includes(id));
  const puzzleRows = Object.entries(p.puzzles).sort((a, b) => b[1].stars - a[1].stars);
  useEffect(() => actions.visit("/progress", "My Achievements"), []);

  return (
    <div className="space-y-8">
      <PageHeader back="/" title="My Achievements" subtitle="Every place you explore fills your passport!" />

      <Card className="flex flex-col gap-5 bg-primary text-white sm:flex-row sm:items-center">
        <Mascot mood="cheer" size={110} />
        <div className="flex-1">
          <p className="font-display font-bold text-secondary">
            Explorer rank {lvl.index + 1} of {LEVELS.length}
          </p>
          <h2 className="text-4xl font-extrabold">{lvl.name}</h2>
          <ProgressBar value={lvl.pct} tone="bg-secondary" className="mt-3 bg-white/25" />
          <p className="mt-1 text-white/85">
            {p.points.toLocaleString()} points{lvl.next ? ` · ${(lvl.next.min - p.points).toLocaleString()} to ${lvl.next.name}` : " · top rank!"}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Stamp} tint="text-primary" label="Passport stamps" value={`${p.countriesExplored.length}/${TOTAL_COUNTRIES}`} />
        <Tile icon={Landmark} tint="text-accent" label="Landmarks visited" value={`${p.landmarksSeen.length}/${LANDMARKS.length}`} />
        <Tile icon={MapIcon} tint="text-success" label="Indian districts" value={String(districtsTotal)} sub={`${p.districtsLearned[PILOT_STATE]?.length ?? 0} in Tamil Nadu`} />
        <Tile icon={Flame} tint="text-accent" label="Day streak" value={String(p.streak.current)} sub={`Best ${p.streak.best} · ${minutes} min learning`} />
      </div>

      {/* Passport */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <BookMarked className="size-6 text-primary" /> My Explorer Passport
        </h2>
        <div className="rounded-[2rem] border-4 border-[#1f3b7a] bg-[#f6f1e3] p-5 shadow-[var(--shadow-card)]">
          {stamps.length === 0 ? (
            <p className="py-6 text-center text-lg text-ink-soft">
              Your passport is empty. <Link href="/world" className="font-bold text-primary">Explore a country</Link> to get your first stamp!
            </p>
          ) : (
            <ShowMore
              items={stamps}
              initial={12}
              noun="stamps"
              className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
              render={([id, date], i) => (
                <Link
                  key={id}
                  href={id === "in" ? "/explore" : `/world/${id}`}
                  className="flex aspect-square flex-col items-center justify-center rounded-full border-[3px] border-dashed p-2 text-center transition hover:scale-105"
                  style={{ borderColor: ["#2f5fd0", "#d9592a", "#1d7a52", "#7b55e0", "#b47c00"][i % 5], transform: `rotate(${((i * 37) % 17) - 8}deg)` }}
                >
                  <Flag id={id} size={36} />
                  <span className="mt-1 line-clamp-2 font-display text-xs font-extrabold uppercase leading-tight">{getCountry(id)?.name}</span>
                  <span className="text-[10px] font-semibold text-ink-soft">{new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                </Link>
              )}
            />
          )}
        </div>
      </section>

      {/* Missions */}
      <section id="missions" className="scroll-mt-20">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <Target className="size-6 text-accent" /> Explorer missions · {doneMissions.length}/{missions.length}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {missions.map((m) => (
            <Link key={m.id} href={m.href} className={`flex items-start gap-3 rounded-3xl border-2 bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 ${m.done ? "border-success" : "border-transparent"}`}>
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${m.done ? "bg-success text-white" : "bg-bg text-ink-soft"}`}>
                {m.done ? <CheckCircle2 className="size-6" /> : <Target className="size-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold leading-tight">{m.title}</span>
                <span className="block text-sm text-ink-soft">{m.hint}</span>
                <span className="mt-2 flex items-center gap-2">
                  <ProgressBar value={m.n / m.goal} tone={m.done ? "bg-success" : "bg-primary"} className="flex-1" />
                  <span className="text-sm font-bold">
                    {m.n}/{m.goal}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs font-bold text-[#b47c00]">
                  <Trophy className="size-3.5" /> {m.done ? "Trophy:" : "Wins:"} {m.trophy}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trophies */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <Trophy className="size-6 text-[#e5a100]" /> Trophies
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {missions.map((m) => (
            <div key={m.id} className={`flex flex-col items-center gap-1 rounded-3xl bg-white p-4 text-center shadow-[var(--shadow-card)] ${m.done ? "" : "opacity-50"}`}>
              <span className={`grid size-14 place-items-center rounded-full ${m.done ? "bg-secondary" : "bg-line"}`}>
                {m.done ? <Trophy className="size-7 text-[#8a5b00]" /> : <Lock className="size-6 text-ink-soft" />}
              </span>
              <span className="font-display font-bold leading-tight">{m.trophy}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Collectible country cards */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <Star className="size-6 text-[#e5a100]" /> Country cards · {cards.length}/{FEATURED.length}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {FEATURED.map((id) => {
            const c = getCountry(id)!;
            const got = cards.includes(id);
            const d = countryDetails(c);
            return got ? (
              <Link key={id} href={id === "in" ? "/explore" : `/world/${id}`} className="flex flex-col gap-1 rounded-3xl bg-gradient-to-b from-primary to-[#2450bd] p-3 text-white shadow-[var(--shadow-card)] transition hover:-translate-y-1">
                <Flag id={id} size={64} className="mx-auto" />
                <span className="text-center font-display text-lg font-extrabold leading-tight">{c.name}</span>
                <span className="text-center text-xs text-white/85">{continentLabel(c.continent)}</span>
                {d.animal && <span className="mt-1 rounded-xl bg-white/15 px-2 py-1 text-center text-xs">{d.animal}</span>}
              </Link>
            ) : (
              <div key={id} className="grid aspect-[3/4] place-items-center rounded-3xl border-2 border-dashed border-line bg-white text-ink-soft">
                <span className="flex flex-col items-center gap-1 text-sm font-bold">
                  <Lock className="size-6" /> Explore to collect
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <Award className="size-6 text-accent" /> Badges
        </h2>
        <ShowMore
          items={[...BADGES].sort((a, b) => Number(Boolean(p.badges[b.id])) - Number(Boolean(p.badges[a.id])))}
          initial={4}
          noun="badges"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          render={(b) => {
            const got = Boolean(p.badges[b.id]);
            return (
              <Card key={b.id} className={`flex flex-col items-center gap-2 p-4 text-center ${got ? "" : "opacity-60"}`}>
                <div className="grid size-16 place-items-center rounded-full" style={{ background: got ? b.colour : "#e3e8f2" }}>
                  {got ? <Star className="size-8 fill-white text-white" /> : <Lock className="size-6 text-ink-soft" />}
                </div>
                <p className="font-display text-lg font-bold leading-tight">{b.name}</p>
                <p className="text-sm text-ink-soft">{b.description}</p>
              </Card>
            );
          }}
        />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <Puzzle className="size-5 text-accent" /> Puzzles
          </h2>
          {puzzleRows.length ? (
            <ul className="space-y-2">
              {puzzleRows.slice(0, 8).map(([k, v]) => {
                const [id, level] = k.split(":");
                const cont = id.startsWith("world-") ? continentBySlug(id.slice(6)) : undefined;
                const name = id === "india" ? "India states" : cont ? continentLabel(cont.id) : getState(id)?.name;
                return (
                  <li key={k} className="flex items-center justify-between rounded-2xl bg-bg px-4 py-2">
                    <span className="font-semibold">
                      {name} · <span className="capitalize text-ink-soft">{level}</span>
                    </span>
                    <Stars count={v.stars} size="size-5" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-ink-soft">
              No puzzles yet. <Link href="/puzzle" className="font-bold text-primary">Try one!</Link>
            </p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <Utensils className="size-5 text-success" /> Discoveries
          </h2>
          <ul className="space-y-2 text-lg">
            <li className="flex justify-between rounded-2xl bg-bg px-4 py-2">
              <span>Foods discovered</span> <b>{p.foodsSeen.length}</b>
            </li>
            <li className="flex justify-between rounded-2xl bg-bg px-4 py-2">
              <span>Festivals & clothing</span> <b>{p.cultureSeen.length}</b>
            </li>
            <li className="flex justify-between rounded-2xl bg-bg px-4 py-2">
              <span>Greetings heard</span> <b>{p.greetingsHeard.length}</b>
            </li>
            <li className="flex justify-between rounded-2xl bg-bg px-4 py-2">
              <span>Quizzes taken</span> <b>{p.quizzes.length}</b>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, tint, label, value, sub }: { icon: typeof Flame; tint: string; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <Icon className={`size-6 ${tint}`} />
      <p className="mt-2 text-sm font-bold text-ink-soft">{label}</p>
      <p className="font-display text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-sm text-ink-soft">{sub}</p>}
    </Card>
  );
}

