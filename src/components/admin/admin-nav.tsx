import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export async function AdminNav({ active }: { active: "boats" | "users" }) {
  const locale = await getRequestLocale();

  return (
    <nav className="section-nav">
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
    </nav>
  );
}
