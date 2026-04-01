import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { BoatsAdmin } from "@/components/admin/boats-admin";
import { getAdminBoats } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import { deleteBoat, removeBoatImage, saveBoat, uploadBoatImage } from "../actions";

export default async function AdminBoatsPage() {
  const locale = await getRequestLocale();
  const boats = await getAdminBoats();

  return (
    <main className="shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "admin.users.eyebrow")}</p>
          <h1>{t(locale, "common.boats")}</h1>
          <p className="muted">
            {locale === "es"
              ? "Gestiona los datos de la flota, su estado y las imágenes de portada."
              : "Manage fleet records, activity and cover images."}
          </p>
        </div>
        <div className="workspace-header__actions">
          <Link className="secondary-button" href="/dashboard?change=1">
            {t(locale, "common.dashboard")}
          </Link>
          <LogoutButton />
        </div>
      </header>

      <AdminNav active="boats" />

      <BoatsAdmin
        boats={boats}
        onDelete={deleteBoat}
        onRemoveImage={removeBoatImage}
        onSave={saveBoat}
        onUploadImage={uploadBoatImage}
      />
    </main>
  );
}
