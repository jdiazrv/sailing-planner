import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type BoatNavProps = {
  boatId: string;
  active: "trip" | "visits";
  basePath?: string;
};

export const BoatNav = async ({
  boatId,
  active,
  basePath = "/boats",
}: BoatNavProps) => {
  const locale = await getRequestLocale();

  return (
    <nav className="section-nav" data-tour="boat-nav">
      <Link
        className={active === "trip" ? "is-active" : undefined}
        href={`${basePath}/${boatId}/trip`}
      >
        {t(locale, "boatNav.trip")}
      </Link>
      <Link
        className={active === "visits" ? "is-active" : undefined}
        href={`${basePath}/${boatId}/visits`}
      >
        {t(locale, "boatNav.visits")}
      </Link>
    </nav>
  );
};
