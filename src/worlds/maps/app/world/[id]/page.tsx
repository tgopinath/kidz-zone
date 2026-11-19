import { notFound, useParams } from "next/navigation";
import { getCountry } from "@/lib/world";
import CountryExplorer from "./CountryExplorer";

export default function Page() {
  const { id = "" } = useParams<{ id: string }>();
  return <Content key={id} id={id} />;
}

function Content({ id }: { id: string }) {
  if (!getCountry(id)) notFound();
  return <CountryExplorer id={id} />;
}
