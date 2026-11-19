"use client";

import QuizRunner from "@/components/QuizRunner";
import { PageHeader } from "@/components/ui";
import { identifyStateQs } from "@/lib/questions";
import { actions } from "@/lib/progress";

export default function IdentifyState() {
  return (
    <div>
      <PageHeader back="/games" backLabel="All games" title="Identify the State" subtitle="A state is glowing orange. Which one is it?" />
      <QuizRunner make={() => identifyStateQs(10)} onFinish={(r) => actions.finishGame("identify-state", r.score)} backHref="/games" backLabel="More games" />
    </div>
  );
}
