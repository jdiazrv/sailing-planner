import Link from "next/link";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type NextStepCardProps = {
  actionHref: string;
  actionLabel: string;
  body: string;
  eyebrow: string;
  locale: Locale;
  title: string;
};

export function NextStepCard({
  actionHref,
  actionLabel,
  body,
  eyebrow,
  locale,
  title,
}: NextStepCardProps) {
  return (
    <article className="dashboard-card workspace-main next-step-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="status-pill is-good">
          {t(locale, "planning.nextStepEyebrow")}
        </span>
      </div>
      <p className="muted">{body}</p>
      <div className="inline-actions">
        <Link className="primary-button" href={actionHref}>
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
