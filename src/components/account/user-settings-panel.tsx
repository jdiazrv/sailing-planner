"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n/provider";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type UserSettingsPanelProps = {
  accessProfileLabel: string;
  boatAccessSummary: string;
  profile: ProfileRow;
  viewerEmail: string;
  onSave: (fd: FormData) => Promise<void>;
  onUpdatePassword: (fd: FormData) => Promise<void>;
};

export function UserSettingsPanel({
  accessProfileLabel,
  boatAccessSummary,
  profile,
  viewerEmail,
  onSave,
  onUpdatePassword,
}: UserSettingsPanelProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSave = (formData: FormData) => {
    startTransition(() => {
      void onSave(formData)
        .then(() => {
          toast.success(t("userSettings.saved"));
          router.refresh();
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : t("userSettings.saveError"));
        });
    });
  };

  const handlePasswordChange = (formData: FormData) => {
    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirm_password")?.toString() ?? "";
    if (password !== confirmPassword) {
      setPasswordError(
        locale === "es"
          ? "Las contraseñas no coinciden."
          : "Passwords do not match.",
      );
      return;
    }

    setPasswordError(null);
    startTransition(() => {
      void onUpdatePassword(formData)
        .then(() => {
          toast.success(t("admin.users.passwordUpdated"));
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : t("userSettings.saveError"));
        });
    });
  };

  return (
    <div className="stack">
      <article className="dashboard-card admin-card admin-card--section">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("userSettings.accessEyebrow")}</p>
            <h2>{t("userSettings.accessTitle")}</h2>
            <p className="muted">{t("userSettings.accessBody")}</p>
          </div>
        </div>
        <div className="account-settings-grid">
          <label className="account-settings-row">
            <span>{t("userSettings.accessProfile")}</span>
            <input disabled readOnly value={accessProfileLabel} />
          </label>
          <label className="account-settings-row account-settings-row--textarea">
            <span>{t("userSettings.accessBoats")}</span>
            <textarea disabled readOnly rows={Math.max(3, boatAccessSummary.split("\n").length)} value={boatAccessSummary} />
          </label>
        </div>
      </article>

      <article className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("userSettings.appearanceEyebrow")}</p>
            <h2>{t("userSettings.appearanceTitle")}</h2>
            <p className="muted">{t("userSettings.appearanceBody")}</p>
          </div>
        </div>
        <ThemeSwitcher />
      </article>

      <article className="dashboard-card admin-card admin-card--section admin-card--editable">
        <div className="card-header">
          <div>
            <p className="eyebrow">{t("userSettings.profileEyebrow")}</p>
            <h2>{t("userSettings.profileTitle")}</h2>
            <p className="muted">{t("userSettings.futureHint")}</p>
          </div>
        </div>
        <form
          className="editor-form editor-form--account"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave(new FormData(event.currentTarget));
          }}
        >
          <div className="account-settings-grid">
            <label className="account-settings-row">
              <span>{t("userSettings.displayName")}</span>
              <input defaultValue={profile.display_name ?? ""} name="display_name" />
            </label>
            <label className="account-settings-row">
              <span>{t("auth.email")}</span>
              <input defaultValue={viewerEmail} disabled readOnly />
            </label>
            <label className="account-settings-row">
              <span>{t("userSettings.language")}</span>
              <select defaultValue={profile.preferred_language ?? "es"} name="preferred_language">
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="account-settings-row">
              <span>{t("userSettings.visitMode")}</span>
              <div className="account-settings-row__field">
                <select
                  defaultValue={profile.visit_panel_display_mode ?? "both"}
                  name="visit_panel_display_mode"
                >
                  <option value="text">{t("userSettings.visitText")}</option>
                  <option value="image">{t("userSettings.visitImage")}</option>
                  <option value="both">{t("userSettings.visitBoth")}</option>
                </select>
                <small className="account-settings-row__help">{t("userSettings.visitModeHelp")}</small>
              </div>
            </label>
            <div className="account-settings-row account-settings-row--checkbox">
              <span>{t("userSettings.timelineVisibility")}</span>
              <label className="checkbox-field account-settings-toggle">
                <input
                  defaultChecked={profile.is_timeline_public}
                  name="is_timeline_public"
                  type="checkbox"
                />
                <span>{t("common.active")}</span>
              </label>
            </div>
          </div>

          <div className="modal__footer">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? t("userSettings.saving") : t("userSettings.save")}
            </button>
          </div>
        </form>
      </article>

      <article className="dashboard-card admin-card admin-card--section admin-card--editable">
        <form
          className="editor-form editor-form--account"
          onSubmit={(event) => {
            event.preventDefault();
            handlePasswordChange(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <div className="card-header">
            <div>
              <p className="eyebrow">{t("admin.users.sectionSecurity")}</p>
              <h2>{t("admin.users.passwordTitle")}</h2>
              <p className="muted">{t("admin.users.sectionSecurityHelp")}</p>
            </div>
          </div>
          <div className="account-settings-grid">
            <label className="account-settings-row">
              <span>{t("auth.password")}</span>
              <input
                minLength={8}
                name="password"
                placeholder={t("admin.users.passwordPlaceholder")}
                required
                type="password"
              />
            </label>
            <label className="account-settings-row">
              <span>{t("admin.users.confirmPassword")}</span>
              <input
                minLength={8}
                name="confirm_password"
                placeholder={t("admin.users.passwordPlaceholder")}
                required
                type="password"
              />
            </label>
          </div>
          {passwordError ? <p className="feedback feedback--error">{passwordError}</p> : null}
          <div className="modal__footer">
            <button className="secondary-button" disabled={isPending} type="submit">
              {t("admin.users.changePassword")}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}