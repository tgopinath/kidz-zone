import { notFound, useParams } from "next/navigation";
import { getLandmark } from "@/lib/explorer";
import LandmarkDetail from "./LandmarkDetail";

export default function Page() {
  const { id = "" } = useParams<{ id: string }>();
  return <Content key={id} id={id} />;
}

function Content({ id }: { id: string }) {
  if (!getLandmark(id)) notFound();
  return <LandmarkDetail id={id} />;
}
