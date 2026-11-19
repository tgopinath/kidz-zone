import { notFound, useParams } from "next/navigation";
import { getState } from "@/lib/content";
import StateLearn from "./StateLearn";

export default function Page() {
  const { id = "" } = useParams<{ id: string }>();
  return <Content key={id} id={id} />;
}

function Content({ id }: { id: string }) {
  if (!getState(id)) notFound();
  return <StateLearn id={id} />;
}
