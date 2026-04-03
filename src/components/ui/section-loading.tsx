export function SectionLoading() {
  return (
    <section className="section-loading" aria-hidden="true">
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
