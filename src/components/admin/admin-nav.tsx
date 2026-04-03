import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { requireUserAdminAccess } from "@/lib/boat-data";

export async function AdminNav({ active }: { active: "boats" | "users" | "metrics" }) {
  const locale = await getRequestLocale();
  const { viewer } = await requireUserAdminAccess();

  return (
    <nav className="section-nav section-nav--grouped">
      <div className="section-nav__group">
        <Link
          className={active === "boats" ? "is-active" : undefined}
          href="/admin/boats"
        >
          {t(locale, "common.boats")}
        </Link>
        <Link
          className={active === "users" ? "is-active" : undefined}
          href="/admin/users"
        >
          {t(locale, "common.users")}
        </Link>
      </div>
      {viewer.isSuperuser && (
        <div className="section-nav__group section-nav__group--system">
          <Link
            className={active === "metrics" ? "is-active" : undefined}
            href="/admin/metrics"
          >
            {t(locale, "metrics.title")}
          </Link>
        </div>
      )}
    </nav>
  );
}
