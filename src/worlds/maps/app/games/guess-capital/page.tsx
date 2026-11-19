"use client";

import GameShell from "@/components/games/GameShell";
import QuizRunner from "@/components/QuizRunner";
import { actions } from "@/lib/progress";
import { worldCapitalQs } from "@/lib/questions";

export default function GuessCapital() {
  return (
    <GameShell title="Guess the Capital" howTo={["The country glows on the globe. Pick its capital city.", "Tap the speaker next to an answer to hear it."]}>
      {(level) => <QuizRunner make={() => worldCapitalQs(level, 10)} onFinish={(r) => actions.finishGame("guess-capital", r.score)} backHref="/games" backLabel="More challenges" />}
    </GameShell>
  );
}
