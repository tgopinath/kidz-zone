import { notFound, useParams } from "next/navigation";
import PuzzleGame from "@/components/PuzzleGame";
import { PageHeader } from "@/components/ui";
import { getState } from "@/lib/content";
import { continentBySlug, CONTINENT_BOX, countriesIn } from "@/lib/world";

export default function Page() {
  const { id = "" } = useParams<{ id: string }>();
  return <Content key={id} id={id} />;
}

function heading(id: string) {
  if (id === "india") return { title: "Arrange the States", subtitle: "Put India's 28 states and 8 Union Territories in the right place." };
  const cont = id.startsWith("world-") ? continentBySlug(id.slice(6)) : undefined;
  if (cont && CONTINENT_BOX[cont.id])
    return { title: `${cont.id} Puzzle`, subtitle: `Put the ${countriesIn(cont.id).length} countries and territories of ${cont.id} in the right place.` };
  const s = getState(id);
  if (s) return { title: `${s.name} District Challenge`, subtitle: s.districtCount === 1 ? "Put its district in the right place." : `Put all ${s.districtCount} districts in the right place.` };
  return null;
}

function Content({ id }: { id: string }) {
  const h = heading(id);
  if (!h) notFound();
  return (
    <div>
      <PageHeader back="/puzzle" backLabel="All puzzles" title={h.title} subtitle={h.subtitle} />
      <PuzzleGame key={id} mapKey={id} />
    </div>
  );
}
