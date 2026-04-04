import type { ReactNode } from "react";

export function SectionLoading({ notice }: { notice?: ReactNode }) {
  return (
    <section className="section-loading" aria-hidden="true">
      {notice ? <div className="section-loading__notice">{notice}</div> : null}
      <div className="section-loading__header">
        <div className="section-loading__eyebrow shimmer" />
        <div className="section-loading__title shimmer" />
        <div className="section-loading__meta shimmer" />
      </div>
      <div className="section-loading__grid">
        <article className="dashboard-card section-loading__card">
          <div className="section-loading__block shimmer" />
          <div className="section-loading__block shimmer" />
          <div className="section-loading__block section-loading__block--wide shimmer" />
        </article>
        <article className="dashboard-card section-loading__card">
          <div className="section-loading__panel shimmer" />
        </article>
      </div>
    </section>
  );
}
