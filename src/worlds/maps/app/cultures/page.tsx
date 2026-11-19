"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Languages, Shirt, Utensils, Volume2 } from "lucide-react";
import { Flag, Photo } from "@/components/Media";
import { Chip, PageHeader } from "@/components/ui";
import { CLOTHING, FESTIVALS, FOODS, GREETINGS } from "@/lib/explorer";
import { actions, useProgress } from "@/lib/progress";
import { speak, speakNative } from "@/lib/speech";
import { countryName } from "@/lib/world";

type Tab = "food" | "clothing" | "festivals" | "greetings";
const TABS: { id: Tab; label: string; icon: typeof Utensils }[] = [
  { id: "food", label: "Traditional food", icon: Utensils },
  { id: "clothing", label: "Clothing", icon: Shirt },
  { id: "festivals", label: "Festivals", icon: CalendarDays },
  { id: "greetings", label: "Say hello", icon: Languages },
];

export default function CulturesPage() {
  const p = useProgress();
  const [tab, setTab] = useState<Tab>("food");
  const [flipped, setFlipped] = useState<string | null>(null);

  // Deep links like /cultures?tab=festivals#diwali
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("tab") as Tab | null;
    // read once from the address bar on arrival
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t && TABS.some((x) => x.id === t)) setTab(t);
    const hash = "";
    if (hash) {
      setFlipped(hash);
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
    actions.visit("/cultures", "Cultures & Food");
  }, []);

  const flip = (id: string, text: string, kind: "food" | "culture") => {
    const open = flipped !== id;
    setFlipped(open ? id : null);
    if (open) {
      speak(text);
      if (kind === "food") actions.seeFood(id);
      else actions.seeCulture(id);
    }
  };

  return (
    <div>
      <PageHeader back="/" title="Cultures & Food" subtitle="Tap a card to flip it and discover something new!" />

      <div role="tablist" aria-label="Culture topics" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-display text-lg font-bold transition ${
              tab === t.id ? "bg-primary text-white" : "bg-white text-ink-soft shadow-[var(--shadow-card)] hover:bg-primary-soft"
            }`}
          >
            <t.icon className="size-5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "food" && (
        <Grid>
          {FOODS.map((f) => (
            <FlipCard
              key={f.id}
              id={f.id}
              title={f.name}
              country={f.country}
              seen={p.foodsSeen.includes(f.id)}
              open={flipped === f.id}
              onFlip={() => flip(f.id, `${f.name}, from ${countryName(f.country)}. Made with ${f.ingredients.join(", ")}. ${f.fact}`, "food")}
              back={
                <>
                  <p className="text-sm font-bold uppercase tracking-wide text-white/80">Main ingredients</p>
                  <ul className="mb-3 mt-1 flex flex-wrap gap-1.5">
                    {f.ingredients.map((i) => (
                      <li key={i} className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                        {i}
                      </li>
                    ))}
                  </ul>
                  <p className="text-lg leading-snug">{f.fact}</p>
                </>
              }
            />
          ))}
        </Grid>
      )}

      {tab === "clothing" && (
        <Grid>
          {CLOTHING.map((c) => (
            <FlipCard
              key={c.id}
              id={c.id}
              title={c.name}
              country={c.country}
              seen={p.cultureSeen.includes(c.id)}
              open={flipped === c.id}
              onFlip={() => flip(c.id, `${c.name}, from ${countryName(c.country)}. ${c.about}`, "culture")}
              back={<p className="text-lg leading-snug">{c.about}</p>}
            />
          ))}
        </Grid>
      )}

      {tab === "festivals" && (
        <Grid>
          {FESTIVALS.map((f) => (
            <FlipCard
              key={f.id}
              id={f.id}
              title={f.name}
              country={f.country}
              seen={p.cultureSeen.includes(f.id)}
              open={flipped === f.id}
              onFlip={() => flip(f.id, `${f.name}${f.country ? `, in ${countryName(f.country)}` : ", around the world"}. ${f.when}. ${f.about}`, "culture")}
              back={
                <>
                  <p className="text-sm font-bold uppercase tracking-wide text-white/80">When</p>
                  <p className="mb-3 font-display text-xl font-bold">{f.when}</p>
                  <p className="text-lg leading-snug">{f.about}</p>
                </>
              }
            />
          ))}
        </Grid>
      )}

      {tab === "greetings" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GREETINGS.map((g) => {
            const heard = p.greetingsHeard.includes(g.id);
            return (
              <button
                key={g.id}
                id={g.id}
                type="button"
                data-no-announce
                onClick={() => {
                  speakNative(g.native, g.word, g.voice);
                  actions.hearGreeting(g.id);
                }}
                className={`flex items-center gap-4 rounded-[var(--radius-card)] border-2 bg-white p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 ${heard ? "border-success" : "border-transparent"}`}
              >
                <Flag id={g.country} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-soft">
                    {g.language} · {countryName(g.country)}
                  </p>
                  <p className="font-display text-3xl font-extrabold leading-tight text-primary">{g.word}</p>
                  {g.native !== g.word && <p className="text-lg">{g.native}</p>}
                  <p className="text-sm text-ink-soft">“{g.meaning}”</p>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white">
                  {heard ? <Check className="size-6" strokeWidth={3} /> : <Volume2 className="size-6" />}
                </span>
              </button>
            );
          })}
          <p className="text-sm text-ink-soft sm:col-span-2 lg:col-span-3">
            Greetings are spoken with your device&apos;s own voices. If a language voice isn&apos;t installed, you&apos;ll hear the word in English instead.
          </p>
        </div>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

function FlipCard({
  id,
  title,
  country,
  seen,
  open,
  onFlip,
  back,
}: {
  id: string;
  title: string;
  country: string | null;
  seen: boolean;
  open: boolean;
  onFlip: () => void;
  back: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={open}
      aria-label={`${title}${country ? `, from ${countryName(country)}` : ""}. ${open ? "Showing facts" : "Tap to discover"}`}
      onClick={onFlip}
      className="group relative h-[22rem] w-full text-left [perspective:1200px]"
    >
      <div className={`relative size-full transition-transform duration-500 [transform-style:preserve-3d] ${open ? "[transform:rotateY(180deg)]" : ""}`}>
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)] [backface-visibility:hidden]">
          <Photo id={id} alt={title} credit={false} ratio="aspect-[4/3]" />
          <div className="flex flex-1 flex-col px-1 pt-3">
            <p className="font-display text-xl font-extrabold leading-tight">{title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-ink-soft">
              {country ? (
                <>
                  <Flag id={country} size={20} /> {countryName(country)}
                </>
              ) : (
                "Around the world"
              )}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <span className="font-display text-sm font-bold text-primary">Tap to discover →</span>
              {seen && <Chip className="bg-success-soft text-[#1d7a52]">Discovered</Chip>}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col overflow-auto rounded-[var(--radius-card)] bg-primary p-5 text-white shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="mb-2 font-display text-2xl font-extrabold">{title}</p>
          {back}
          <span className="mt-auto pt-3 font-display text-sm font-bold text-white/80">Tap to flip back</span>
        </div>
      </div>
    </button>
  );
}
