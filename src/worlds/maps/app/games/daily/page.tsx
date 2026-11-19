"use client";

import { PageHeader } from "@/components/ui";
import QuizRunner from "@/components/QuizRunner";
import { actions, today } from "@/lib/progress";
import { dailyQs } from "@/lib/questions";

export default function DailyChallenge() {
  return (
    <div>
      <PageHeader back="/" title="Daily Geography Challenge" subtitle="Five new questions every day — the same for every explorer!" />
      <QuizRunner make={() => dailyQs(today())} onFinish={(r) => actions.finishGame(`daily:${today()}`, r.score)} backHref="/games" backLabel="More challenges" />
    </div>
  );
}
