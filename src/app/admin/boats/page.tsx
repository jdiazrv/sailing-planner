import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { BoatsAdmin } from "@/components/admin/boats-admin";
import { getAdminBoats } from "@/lib/boat-data";

import { deleteBoat, removeBoatImage, saveBoat, uploadBoatImage } from "../actions";

export default async function AdminBoatsPage() {
  const boats = await getAdminBoats();

  return (
    <main className="shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Boats</h1>
          <p className="muted">Manage fleet records, activity and cover images.</p>
        </div>
        <div className="workspace-header__actions">
          <Link className="secondary-button" href="/dashboard?change=1">
            Dashboard
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
