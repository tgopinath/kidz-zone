"use client";

import GameShell from "@/components/games/GameShell";
import QuizRunner from "@/components/QuizRunner";
import { actions } from "@/lib/progress";
import { foodExplorerQs } from "@/lib/questions";

export default function FoodExplorer() {
  return (
    <GameShell title="Food Explorer" howTo={["Look at the yummy dish.", "Pick the country it comes from."]}>
      {(level) => <QuizRunner make={() => foodExplorerQs(level, 8)} onFinish={(r) => actions.finishGame("food-explorer", r.score)} backHref="/games" backLabel="More challenges" />}
    </GameShell>
  );
}
