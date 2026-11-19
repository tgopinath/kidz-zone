"use client";

import { useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { actions, useProgress } from "@/lib/progress";
import type { Level } from "@/lib/questions";

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Big, well-known countries · 3 choices" },
  { id: "intermediate", label: "Intermediate", hint: "More countries · 4 choices" },
  { id: "advanced", label: "Advanced", hint: "Every country · 4 choices" },
];

/** Title, how-to-play and a difficulty picker around any game. The game restarts when the level changes. */
export default function GameShell({
  title,
  howTo,
  children,
  levels = true,
}: {
  title: string;
  howTo: string[];
  children: (level: Level) => ReactNode;
  levels?: boolean;
}) {
  const p = useProgress();
  const [help, setHelp] = useState(false);
  const level = p.difficulty;
  return (
    <div>
      <PageHeader back="/games" backLabel="All challenges" title={title} subtitle={howTo[0]}>
        <div className="flex flex-wrap items-center gap-2">
          {levels && (
            <div role="group" aria-label="Difficulty" className="flex rounded-2xl bg-white p-1 shadow-[var(--shadow-card)]">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  title={l.hint}
                  aria-pressed={level === l.id}
                  onClick={() => actions.setDifficulty(l.id)}
                  className={`rounded-xl px-3 py-2 font-display font-semibold ${level === l.id ? "bg-primary text-white" : "text-ink-soft"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setHelp(!help)}
            aria-expanded={help}
            className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 font-display font-semibold text-primary shadow-[var(--shadow-card)]"
          >
            <HelpCircle className="size-5" /> How to play
          </button>
        </div>
      </PageHeader>
      {help && (
        <Card className="mb-4 animate-pop">
          <ol className="list-decimal space-y-1 pl-5 text-lg">
            {howTo.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </Card>
      )}
      <div key={level}>{children(level)}</div>
    </div>
  );
}
