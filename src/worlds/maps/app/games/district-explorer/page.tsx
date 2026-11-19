"use client";

import { useState } from "react";
import QuizRunner from "@/components/QuizRunner";
import { MascotSays } from "@/components/Mascot";
import { Button, Card, DataStatusBadge, PageHeader } from "@/components/ui";
import { getState, PILOT_STATE, STATES, stateName, districtsLabel } from "@/lib/content";
import { districtTapQs } from "@/lib/questions";
import { actions } from "@/lib/progress";

const PLAYABLE = STATES.filter((s) => s.dataStatus !== "issues" && s.districtCount >= 4);

export default function DistrictExplorerGame() {
  const [stateId, setStateId] = useState(PILOT_STATE);
  const [playing, setPlaying] = useState(false);
  const s = getState(stateId)!;
  return (
    <div>
      <PageHeader back="/games" backLabel="All games" title="District Explorer" subtitle={playing ? `Find districts of ${stateName(stateId)}` : "You get a district name — find it on the map!"} />
      {playing ? (
        <QuizRunner
          key={stateId}
          make={() => districtTapQs(stateId, 10)}
          stateId={stateId}
          onFinish={(r) => actions.finishGame("district-explorer", r.score)}
          backHref="/games"
          backLabel="More games"
        />
      ) : (
        <Card className="max-w-lg space-y-4">
          <MascotSays>Which state shall we explore?</MascotSays>
          <select value={stateId} onChange={(e) => setStateId(e.target.value)} className="w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg font-semibold">
            {PLAYABLE.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({districtsLabel(x.districtCount)})
              </option>
            ))}
          </select>
          <DataStatusBadge status={s.dataStatus} issues={s.issues} />
          <Button className="w-full" onClick={() => setPlaying(true)}>
            Let&apos;s go!
          </Button>
        </Card>
      )}
    </div>
  );
}
