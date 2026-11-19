"use client";

import GameShell from "@/components/games/GameShell";
import QuizRunner from "@/components/QuizRunner";
import { actions } from "@/lib/progress";
import { landmarkDetectiveQs } from "@/lib/questions";

export default function LandmarkDetective() {
  return (
    <GameShell title="Landmark Detective" howTo={["Look at the photo of a famous place.", "Pick the country it is in — the flags give you a clue!"]}>
      {(level) => <QuizRunner make={() => landmarkDetectiveQs(level, 8)} onFinish={(r) => actions.finishGame("landmark-detective", r.score)} backHref="/games" backLabel="More challenges" />}
    </GameShell>
  );
}
