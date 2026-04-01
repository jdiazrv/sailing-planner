import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

type BoatNavProps = {
  boatId: string;
  active: "trip" | "visits";
};

export const BoatNav = async ({ boatId, active }: BoatNavProps) => {
  const locale = await getRequestLocale();

  return (
    <nav className="section-nav">
      <Link
        className={active === "trip" ? "is-active" : undefined}
        href={`/boats/${boatId}/trip`}
      >
        {t(locale, "boatNav.trip")}
      </Link>
      <Link
        className={active === "visits" ? "is-active" : undefined}
        href={`/boats/${boatId}/visits`}
      >
        {t(locale, "boatNav.visits")}
      </Link>
    </nav>
  );
};
