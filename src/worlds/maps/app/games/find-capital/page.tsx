"use client";

import QuizRunner from "@/components/QuizRunner";
import { PageHeader } from "@/components/ui";
import { findCapitalQs } from "@/lib/questions";
import { actions } from "@/lib/progress";

export default function FindCapital() {
  return (
    <div>
      <PageHeader back="/games" backLabel="All games" title="Find the Capital" subtitle="Read the capital city, then tap the state it belongs to." />
      <QuizRunner make={() => findCapitalQs(10)} onFinish={(r) => actions.finishGame("find-capital", r.score)} backHref="/games" backLabel="More games" />
    </div>
  );
}
