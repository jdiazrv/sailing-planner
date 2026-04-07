import { AcceptInviteCard } from "@/components/auth/accept-invite-card";

type AcceptInvitePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getSingleValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <main className="auth-layout">
      <AcceptInviteCard
        error={getSingleValue(resolvedSearchParams.error)}
        redirectTo={getSingleValue(resolvedSearchParams.redirect_to)}
        tokenHash={getSingleValue(resolvedSearchParams.token_hash)}
        type={getSingleValue(resolvedSearchParams.type)}
      />
    </main>
  );
}