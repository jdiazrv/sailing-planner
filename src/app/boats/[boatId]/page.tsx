import { redirect } from "next/navigation";

export default async function BoatIndexPage({
  params,
}: {
  params: Promise<{ boatId: string }>;
}) {
  const { boatId } = await params;
  redirect(`/boats/${boatId}/trip`);
}
