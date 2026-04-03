import { redirect } from "next/navigation";

export default async function BoatVisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ season?: string; status?: string; q?: string; setup?: string }>;
}) {
  const { boatId } = await params;
  const { season: requestedSeasonId, status, q, setup } = await searchParams;
  const nextParams = new URLSearchParams();
  nextParams.set("view", "visits");
  if (requestedSeasonId) nextParams.set("season", requestedSeasonId);
  if (status) nextParams.set("status", status);
  if (q) nextParams.set("q", q);
  if (setup) nextParams.set("setup", setup);
  redirect(`/boats/${boatId}?${nextParams.toString()}`);
}
