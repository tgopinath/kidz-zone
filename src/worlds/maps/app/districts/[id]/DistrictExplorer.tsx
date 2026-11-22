"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Building2, GraduationCap, Puzzle, Search, Sparkles, X } from "lucide-react";
import MapView from "@/components/MapView";
import { GoogleMapFrame, MapModeSwitch, type MapMode } from "@/components/RealMap";
import { Mascot, MascotSays } from "@/components/Mascot";
import { Button, Card, DataStatusBadge, LinkButton, Loading, PageHeader, ProgressBar, ShowMore, SpeakButton, TamilName } from "@/components/ui";
import { getDistricts, getState, districtsLabel } from "@/lib/content";
import { DISTRICT_FILLS, useDistrictMap } from "@/lib/geo";
import { actions, useProgress } from "@/lib/progress";
import { speakLocal } from "@/lib/speech";

export default function DistrictExplorer({ id }: { id: string }) {
  const s = getState(id)!;
  const districts = getDistricts(id);
  const byId = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const { features, error } = useDistrictMap(id);
  const p = useProgress();
  const learned = new Set(p.districtsLearned[id] ?? []);

  const [selected, setSelected] = useState<string | null>(null);
  const [tour, setTour] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("drawn");
  const [q, setQ] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const select = (did: string) => {
    setSelected(did);
    actions.learnDistrict(id, did);
    tell(did);
    if (window.innerWidth < 1024) window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };
  const describe = (did: string) => {
    const x = byId.get(did)!;
    return [x.name + ".", x.headquarters && x.headquarters !== x.name ? `Its headquarters is ${x.headquarters}.` : "", x.fact ?? ""].join(" ");
  };
  const describeTa = (did: string) => {
    const t = byId.get(did)!.ta;
    if (!t) return null;
    return [t.name + ".", t.headquarters !== t.name ? `தலைநகரம் ${t.headquarters}.` : "", t.fact].join(" ");
  };
  const tell = (did: string, force = false) => speakLocal(describe(did), describeTa(did), { force });
  const step = (dir: 1 | -1) => {
    const i = selected ? districts.findIndex((d) => d.id === selected) : -1;
    const next = districts[(i + dir + districts.length) % districts.length];
    select(next.id);
  };

  const list = districts.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.lgdName.toLowerCase().includes(q.toLowerCase()));
  const d = selected ? byId.get(selected) : null;
  const done = learned.size;

  return (
    <div>
      <PageHeader
        back="/districts"
        backLabel="All states"
        title={`${s.name} districts`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {districtsLabel(s.districtCount)} · {done} learned <DataStatusBadge status={s.dataStatus} issues={s.issues} />
          </span>
        }
      >
        <div className="flex flex-wrap gap-2">
          <MapModeSwitch mode={mapMode} onChange={setMapMode} />
          <Button tone={tour ? "success" : "white"} onClick={() => { setTour(!tour); if (!tour && !selected) select(districts[0].id); }}>
            <GraduationCap className="size-5" /> {tour ? "Tour on" : "Guided tour"}
          </Button>
          <LinkButton href={`/puzzle/${id}`} tone="accent">
            <Puzzle className="size-5" /> Puzzle
          </LinkButton>
        </div>
      </PageHeader>

      {s.dataStatus === "issues" && (
        <Card className="mb-4 border-2 border-danger-soft text-ink-soft">
          <b className="text-ink">Heads up:</b> {s.issues.join(" ")}
        </Card>
      )}

      <ProgressBar value={done / districts.length} tone="bg-success" className="mb-4" />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {mapMode === "google" ? (
            <GoogleMapFrame query={d ? `${d.name} district, ${s.name}, India` : `${s.name}, India`} zoom={d ? 9 : s.districtCount <= 3 ? 9 : 6} title="Google Map" />
          ) : error ? (
            <Card>Couldn&apos;t load this map.</Card>
          ) : !features ? (
            <Loading />
          ) : (
            <MapView
              features={features}
              fillFor={(f) => (learned.has(f.properties.id) ? DISTRICT_FILLS[f.properties.c] : "#d3dcea")}
              selectedId={selected}
              onSelect={select}
              focusId={tour ? selected : null}
              labelFor={(f) => (learned.has(f.properties.id) || f.properties.id === selected ? byId.get(f.properties.id)?.name ?? null : null)}
              nameFor={(f) => byId.get(f.properties.id)?.name ?? ""}
              ariaLabel={`District map of ${s.name}`}
              maxHeight="75vh"
            />
          )}
          <p className="text-sm text-ink-soft">Grey districts are still a mystery — tap them to reveal their names!</p>
          {tour && (
            <div className="flex items-center justify-center gap-3">
              <Button tone="white" onClick={() => step(-1)} aria-label="Previous district">
                <ChevronLeft className="size-6" />
              </Button>
              <span className="min-w-32 text-center font-display text-lg font-bold">
                {selected ? districts.findIndex((x) => x.id === selected) + 1 : 0} / {districts.length}
              </span>
              <Button onClick={() => step(1)} aria-label="Next district">
                <ChevronRight className="size-6" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div ref={cardRef} className="scroll-mt-20">
            {d ? (
              <Card key={d.id} className="animate-pop space-y-3 border-2 border-primary-soft">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-primary">District</p>
                    <h2 className="cursor-pointer text-3xl font-extrabold leading-tight" data-no-announce onClick={() => tell(d.id, true)}>{d.name}</h2>
                    <TamilName text={d.ta?.name} className="font-display text-xl font-bold text-primary" />
                    {d.name !== d.lgdName && <p className="text-sm text-ink-soft">Also written: {d.lgdName}</p>}
                  </div>
                  <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="grid size-9 shrink-0 place-items-center rounded-full bg-bg">
                    <X className="size-4" />
                  </button>
                </div>
                {d.headquarters && (
                  <p className="flex items-center gap-2 text-lg">
                    <Building2 className="size-5 text-accent" /> Headquarters: <b>{d.headquarters}</b>
                  </p>
                )}
                {d.fact ? (
                  <div className="flex gap-3 rounded-2xl bg-secondary-soft p-3">
                    <Sparkles className="mt-0.5 size-5 shrink-0 text-[#c58a00]" />
                    <p className="text-lg leading-snug">{d.fact}</p>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-bg p-3 text-ink-soft">
                    Fun facts for {s.name}&apos;s districts are coming soon. The name and border come from official LGD map data.
                  </p>
                )}
                {d.neighbours.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-sm font-bold text-ink-soft">Next-door districts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.neighbours.map((n) => (
                        <button key={n} type="button" onClick={() => select(n)} className="rounded-full bg-bg px-3 py-1 text-sm font-bold hover:bg-primary-soft">
                          {byId.get(n)?.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <MascotSays mood="think" say>Tap a district on the map, or pick one from the list below!</MascotSays>
              </Card>
            )}
          </div>

          <Card className="p-3">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a district…"
                aria-label="Search districts"
                className="w-full rounded-2xl border-2 border-line bg-white py-2.5 pl-10 pr-3 text-lg outline-none focus:border-primary"
              />
            </div>
            {list.length === 0 ? (
              <p className="px-3 py-2 text-ink-soft">No district called “{q}”.</p>
            ) : (
              <ShowMore
                key={q}
                as="ul"
                items={list}
                initial={q ? list.length : 10}
                noun="districts"
                className="space-y-2"
                render={(x) => (
                <li
                  key={x.id}
                  className={`flex items-center gap-2 rounded-2xl border-2 p-1.5 pl-1 transition ${
                    x.id === selected ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-primary/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => select(x.id)}
                    className="flex flex-1 items-center gap-2 rounded-xl px-3 py-1.5 text-left font-display text-[17px] font-bold"
                  >
                    {x.name}
                    {learned.has(x.id) && <Check className={`size-4 ${x.id === selected ? "text-white" : "text-success"}`} strokeWidth={3} />}
                  </button>
                  <SpeakButton label={`Say ${x.name}`} onSpeak={() => speakLocal(x.name, x.ta?.name, { force: true })} />
                </li>
                )}
              />
            )}
          </Card>

          {done === districts.length && (
            <Card className="flex items-center gap-3 bg-success-soft">
              <Mascot mood="cheer" size={64} />
              <p className="font-display text-lg font-bold">You discovered every district in {s.name}! Try the puzzle next.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
