"use client";

import { useI18n } from "@/components/i18n/provider";

type AcceptInviteCardProps = {
  error?: string;
  tokenHash?: string;
  type?: string;
  redirectTo?: string;
};

const getErrorText = (error: string | undefined, locale: "es" | "en") => {
  if (!error) {
    return null;
  }

  if (error === "missing_token") {
    return locale === "es"
      ? "Falta el token de invitacion. Solicita una nueva invitacion."
      : "The invitation token is missing. Request a new invitation.";
  }

  if (error === "invalid_token") {
    return locale === "es"
      ? "La invitacion ya no es valida o ya ha sido usada. Solicita una nueva invitacion."
      : "This invitation is no longer valid or has already been used. Request a new invitation.";
  }

  return locale === "es"
    ? "No se pudo validar la invitacion. Solicita una nueva invitacion."
    : "The invitation could not be validated. Request a new invitation.";
};

export function AcceptInviteCard({
  error,
  tokenHash,
  type,
  redirectTo,
}: AcceptInviteCardProps) {
  const { locale } = useI18n();
  const text =
    locale === "es"
      ? {
          eyebrow: "Invitacion",
          title: "Aceptar invitacion",
          subtitle:
            "Para evitar que el enlace se consuma automaticamente desde el correo, valida la invitacion pulsando este boton.",
          submit: "Continuar y crear contraseña",
          note: "Despues podras definir tu contraseña y entrar en la plataforma.",
        }
      : {
          eyebrow: "Invitation",
          title: "Accept invitation",
          subtitle:
            "To avoid the link being consumed automatically by email scanners, validate the invitation by pressing this button.",
          submit: "Continue and create password",
          note: "You will then be able to set your password and access the platform.",
        };

  const errorText = getErrorText(error, locale);
  const canSubmit = Boolean(tokenHash && type);

  return (
    <form action="/auth/accept-invite/verify" className="auth-card" method="post">
      <div className="auth-card__header">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="muted">{text.subtitle}</p>
      </div>

      <input name="token_hash" type="hidden" value={tokenHash ?? ""} />
      <input name="type" type="hidden" value={type ?? "invite"} />
      <input name="redirect_to" type="hidden" value={redirectTo ?? "/auth/set-password"} />

      {errorText ? <p className="feedback feedback--error">{errorText}</p> : null}
      {!errorText ? <p className="feedback feedback--success">{text.note}</p> : null}

      <button className="primary-button" disabled={!canSubmit} type="submit">
        {text.submit}
      </button>
    </form>
  );
}