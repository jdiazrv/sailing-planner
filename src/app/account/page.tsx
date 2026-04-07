import { saveOwnUserSettings, updateOwnPassword } from "@/app/actions";
import { UserSettingsPanel } from "@/components/account/user-settings-panel";
import { requireViewer } from "@/lib/boat-data";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function AccountPage() {
  const [locale, { viewer }] = await Promise.all([
    getRequestLocale(),
    requireViewer(),
  ]);

  if (!viewer.profile) {
    return null;
  }

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
        profile={viewer.profile}
        viewerEmail={viewer.profile.email ?? ""}
        onSave={saveOwnUserSettings}
        onUpdatePassword={updateOwnPassword}
      />
    </>
  );
}