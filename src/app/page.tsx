import Link from "next/link";

import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function Home() {
  const locale = await getRequestLocale();

  return (
    <main className="landing">
      <section className="landing__hero">
        <div className="landing__nav">
          <div>
            <p className="eyebrow">Sailing Planner</p>
            <strong className="landing__brand">{t(locale, "landing.brand")}</strong>
          </div>
          <div className="landing__nav-actions">
            <Link className="secondary-button" href="/dashboard">
              {t(locale, "landing.navDashboard")}
            </Link>
            <Link className="primary-button" href="/login">
              {t(locale, "landing.navSignIn")}
            </Link>
          </div>
        </div>

        <div className="landing__hero-grid">
          <div className="landing__copy">
            <span className="landing__pill">{t(locale, "landing.pill")}</span>
            <h1>{t(locale, "landing.title")}</h1>
            <p className="landing__lead">{t(locale, "landing.lead")}</p>
            <div className="landing__actions">
              <Link className="primary-button" href="/login">
                {t(locale, "common.signIn")}
              </Link>
              <Link className="secondary-button" href="/dashboard">
                {t(locale, "landing.openDashboard")}
              </Link>
            </div>
            <div className="landing__stats">
              <div>
                <strong>{t(locale, "landing.stat1.title")}</strong>
                <span>{t(locale, "landing.stat1.body")}</span>
              </div>
              <div>
                <strong>{t(locale, "landing.stat2.title")}</strong>
                <span>{t(locale, "landing.stat2.body")}</span>
              </div>
              <div>
                <strong>{t(locale, "landing.stat3.title")}</strong>
                <span>{t(locale, "landing.stat3.body")}</span>
              </div>
            </div>
            <div className="landing__mini-flow">
              <div className="landing__mini-step">
                <span>1</span>
                <div>
                  <strong>{t(locale, "landing.step1.title")}</strong>
                  <p>{t(locale, "landing.step1.body")}</p>
                </div>
              </div>
              <div className="landing__mini-step">
                <span>2</span>
                <div>
                  <strong>{t(locale, "landing.step2.title")}</strong>
                  <p>{t(locale, "landing.step2.body")}</p>
                </div>
              </div>
              <div className="landing__mini-step">
                <span>3</span>
                <div>
                  <strong>{t(locale, "landing.step3.title")}</strong>
                  <p>{t(locale, "landing.step3.body")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing__visual">
            <div className="landing__preview-card">
              <div className="landing__preview-top">
                <div>
                  <p className="eyebrow">{t(locale, "landing.currentBoat")}</p>
                  <strong>Moody 54 · Summer season</strong>
                </div>
                <span className="landing__preview-badge">{t(locale, "landing.liveWorkspace")}</span>
              </div>
              <div className="landing__preview-body">
                <div className="landing__timeline-demo">
                  <div className="landing__timeline-row">
                    <span>{t(locale, "landing.timelineTrips")}</span>
                    <div>
                      <i className="is-trip-a" />
                      <i className="is-trip-b" />
                    </div>
                  </div>
                  <div className="landing__timeline-row">
                    <span>{t(locale, "landing.timelineVisits")}</span>
                    <div>
                      <i className="is-visit-a" />
                      <i className="is-visit-b" />
                    </div>
                  </div>
                  <div className="landing__timeline-row">
                    <span>{t(locale, "landing.timelineOpen")}</span>
                    <div>
                      <i className="is-available-a" />
                      <i className="is-available-b" />
                    </div>
                  </div>
                </div>

                <div className="landing__workspace-panels">
                  <div className="landing__table-demo">
                    <div className="landing__table-head">
                      <span>{t(locale, "landing.timelineVisits")}</span>
                      <span>{t(locale, "landing.tableMap")}</span>
                    </div>
                    <div className="landing__table-row">
                      <strong>{t(locale, "landing.confirmed")}</strong>
                      <span>Palma Marina</span>
                    </div>
                    <div className="landing__table-row">
                      <strong>{t(locale, "landing.tentative")}</strong>
                      <span>Mahon Harbour</span>
                    </div>
                    <div className="landing__table-row">
                      <strong>{t(locale, "landing.tripZone")}</strong>
                      <span>North coast</span>
                    </div>
                  </div>

                  <div className="landing__map-demo">
                    <div className="landing__map-line" />
                    <span className="landing__map-point is-1">1</span>
                    <span className="landing__map-point is-2">2</span>
                    <span className="landing__map-point is-3">M</span>
                    <span className="landing__map-visit">V</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing__section">
        <div className="landing__section-head">
          <p className="eyebrow">{t(locale, "landing.sectionEyebrow")}</p>
          <h2>{t(locale, "landing.sectionTitle")}</h2>
        </div>
        <div className="landing__cards">
          <article className="landing__card">
            <strong>{t(locale, "landing.card1.title")}</strong>
            <p>{t(locale, "landing.card1.body")}</p>
          </article>
          <article className="landing__card">
            <strong>{t(locale, "landing.card2.title")}</strong>
            <p>{t(locale, "landing.card2.body")}</p>
          </article>
          <article className="landing__card">
            <strong>{t(locale, "landing.card3.title")}</strong>
            <p>{t(locale, "landing.card3.body")}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
