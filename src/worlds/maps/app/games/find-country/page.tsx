"use client";

import GameShell from "@/components/games/GameShell";
import QuizRunner from "@/components/QuizRunner";
import { actions } from "@/lib/progress";
import { findCountryQs } from "@/lib/questions";

export default function FindCountry() {
  return (
    <GameShell title="Find the Country" howTo={["Read the country name, then spin the globe and tap it.", "Drag to spin, pinch or press + to zoom in.", "You get one extra try before the answer is shown."]}>
      {(level) => <QuizRunner make={() => findCountryQs(level, 8)} onFinish={(r) => actions.finishGame("find-country", r.score)} backHref="/games" backLabel="More challenges" />}
    </GameShell>
  );
}
