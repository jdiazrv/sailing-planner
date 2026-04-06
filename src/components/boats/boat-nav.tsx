import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type BoatNavProps = {
  boatId: string;
  active: "trip" | "summary" | "visits" | "share";
  canShare?: boolean;
  canViewVisits?: boolean;
  basePath?: string;
};

export const BoatNav = async ({
  boatId,
  active,
  canShare = false,
  canViewVisits = true,
  basePath = "/boats",
}: BoatNavProps) => {
  const locale = await getRequestLocale();
  const workspaceBasePath = `${basePath}/${boatId}`;

  return (
    <nav className="section-nav" data-tour="boat-nav">
      <Link
        className={active === "trip" ? "is-active" : undefined}
        href={`${workspaceBasePath}?view=trip`}
      >
        {t(locale, "boatNav.trip")}
      </Link>
      <Link
        className={active === "summary" ? "is-active" : undefined}
        href={`${workspaceBasePath}/summary`}
      >
        {t(locale, "boatNav.summary")}
      </Link>
      {canViewVisits ? (
        <Link
          className={active === "visits" ? "is-active" : undefined}
          href={`${workspaceBasePath}?view=visits`}
        >
          {t(locale, "boatNav.visits")}
        </Link>
      ) : null}
      {canShare ? (
        <Link
          className={active === "share" ? "is-active" : undefined}
          href={`${workspaceBasePath}/share`}
        >
          {t(locale, "boatNav.share")}
        </Link>
      ) : null}
    </nav>
  );
};
