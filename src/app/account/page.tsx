import { saveOwnUserSettings, updateOwnPassword } from "@/app/actions";
import { UserSettingsPanel } from "@/components/account/user-settings-panel";
import { getAccessibleBoatsLite, requireViewer } from "@/lib/boat-data";
import { getPermissionLabelForLocale, t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function AccountPage() {
  const [locale, { viewer }, boats] = await Promise.all([
    getRequestLocale(),
    requireViewer(),
    getAccessibleBoatsLite(),
  ]);

  if (!viewer.profile) {
    return null;
  }

  const accessProfileLabel = viewer.isSuperuser
    ? t(locale, "userSettings.accessGlobalSuperuser")
    : t(locale, "userSettings.accessBoatScoped");
  const boatAccessSummary = viewer.isSuperuser
    ? t(locale, "userSettings.accessAllBoats")
    : boats.length
      ? boats
          .map(
            (boat) =>
              `${boat.boat_name}: ${getPermissionLabelForLocale(locale, boat.permission_level, false)}`,
          )
          .join("\n")
      : t(locale, "userSettings.accessNoBoats");

  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{t(locale, "userSettings.eyebrow")}</p>
          <h1>{t(locale, "userSettings.title")}</h1>
          <p className="muted">{t(locale, "userSettings.subtitle")}</p>
        </div>
      </header>

      <UserSettingsPanel
        accessProfileLabel={accessProfileLabel}
        boatAccessSummary={boatAccessSummary}
        profile={viewer.profile}
        viewerEmail={viewer.profile.email ?? ""}
        onSave={saveOwnUserSettings}
        onUpdatePassword={updateOwnPassword}
      />
    </>
  );
}