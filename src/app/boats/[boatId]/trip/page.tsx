import { redirect } from "next/navigation";

export default async function BoatTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{ season?: string; status?: string; setup?: string }>;
}) {
  const { boatId } = await params;
  const { season: requestedSeasonId, status, setup } = await searchParams;
  const nextParams = new URLSearchParams();
  nextParams.set("view", "trip");
  if (requestedSeasonId) nextParams.set("season", requestedSeasonId);
  if (status) nextParams.set("status", status);
  if (setup) nextParams.set("setup", setup);
  redirect(`/boats/${boatId}?${nextParams.toString()}`);
}
