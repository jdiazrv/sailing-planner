import { BoatsAdmin } from "@/components/admin/boats-admin";
import { getAdminBoats, requireSuperuser } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

import { deleteBoat, removeBoatImage, saveBoat, uploadBoatImage } from "../actions";

export default async function AdminBoatsPage() {
  const locale = await getRequestLocale();
  const [, boats] = await Promise.all([
    requireSuperuser(),
    getAdminBoats(),
  ]);

  return (
    <>
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
      </header>

      <BoatsAdmin
        boats={boats}
        onDelete={deleteBoat}
        onRemoveImage={removeBoatImage}
        onSave={saveBoat}
        onUploadImage={uploadBoatImage}
      />
    </>
  );
}
