import { notFound, useParams } from "next/navigation";
import { continentBySlug } from "@/lib/world";
import ContinentExplorer from "./ContinentExplorer";

export default function Page() {
  const { slug = "" } = useParams<{ slug: string }>();
  return <Content key={slug} slug={slug} />;
}

function Content({ slug }: { slug: string }) {
  const c = continentBySlug(slug);
  if (!c) notFound();
  return <ContinentExplorer id={c.id} />;
}
