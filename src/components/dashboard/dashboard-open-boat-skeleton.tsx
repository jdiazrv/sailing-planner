export function DashboardOpenBoatSkeleton() {
  return (
    <section className="dashboard-open-boat dashboard-open-boat--loading" aria-hidden="true">
      <article className="dashboard-card dashboard-skeleton">
        <div className="dashboard-skeleton__header">
          <div className="dashboard-skeleton__eyebrow shimmer" />
          <div className="dashboard-skeleton__title shimmer" />
        </div>
        <div className="dashboard-skeleton__timeline shimmer" />
      </article>

      <div className="workspace-grid workspace-grid--trip">
        <article className="dashboard-card dashboard-skeleton workspace-main">
          <div className="dashboard-skeleton__block shimmer" />
          <div className="dashboard-skeleton__block shimmer" />
          <div className="dashboard-skeleton__block shimmer" />
        </article>
        <aside className="dashboard-card dashboard-skeleton">
          <div className="dashboard-skeleton__map shimmer" />
        </aside>
      </div>
    </section>
  );
}
