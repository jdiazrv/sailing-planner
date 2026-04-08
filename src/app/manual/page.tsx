import { getRequestLocale } from "@/lib/i18n-server";
import { getManualContent } from "@/lib/manual-content";

export default async function ManualPage() {
  const locale = await getRequestLocale();
  const copy = getManualContent(locale);

  const navigation = [
    ["#purpose", copy.sections.purpose.title],
    ["#flow", copy.sections.flow.title],
    ["#concepts", copy.sections.concepts.title],
    ["#tour", copy.sections.tour.title],
    ["#access", copy.sections.access.title],
    ["#practices", copy.sections.practices.title],
  ] as const;

  return (
    <main className="manual-page">
      <div className="manual-shell">
        <section className="manual-hero">
          <p className="manual-eyebrow">{copy.heroEyebrow}</p>
          <h1 className="manual-hero__title">{copy.heroTitle}</h1>
          <p className="manual-hero__lead">{copy.heroLead}</p>
          <div className="manual-pill-row">
            {copy.heroPills.map((pill) => (
              <span className="manual-pill" key={pill}>
                {pill}
              </span>
            ))}
          </div>
        </section>

        <div className="manual-layout">
          <aside className="manual-toc" aria-label={copy.tocTitle}>
            <h2 className="manual-toc__title">{copy.tocTitle}</h2>
            <nav className="manual-toc__nav">
              {navigation.map(([href, label]) => (
                <a className="manual-toc__link" href={href} key={href}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="manual-toc__note">
              <strong>{copy.tocNoteTitle}</strong>
              <p>{copy.tocNoteBody}</p>
            </div>
          </aside>

          <div className="manual-content">
            <section className="manual-section" id="purpose">
              <SectionHeader
                body={copy.sections.purpose.body}
                eyebrow={copy.sections.purpose.eyebrow}
                title={copy.sections.purpose.title}
              />
              <div className="manual-grid">
                {copy.purposeCards.map((card) => (
                  <InfoCard body={card.body} key={card.title} title={card.title} />
                ))}
              </div>
            </section>

            <section className="manual-section" id="flow">
              <SectionHeader
                eyebrow={copy.sections.flow.eyebrow}
                title={copy.sections.flow.title}
              />
              <div className="manual-steps">
                {copy.flowSteps.map(([title, body], index) => (
                  <article className="manual-step" key={title}>
                    <div className="manual-step__index">{index + 1}</div>
                    <div className="manual-step__body">
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="manual-section" id="concepts">
              <SectionHeader
                eyebrow={copy.sections.concepts.eyebrow}
                title={copy.sections.concepts.title}
              />
              <div className="manual-grid">
                {copy.conceptCards.map(([title, body]) => (
                  <InfoCard body={body} key={title} title={title} />
                ))}
              </div>
            </section>

            <section className="manual-section" id="tour">
              <SectionHeader
                body={copy.sections.tour.body}
                eyebrow={copy.sections.tour.eyebrow}
                title={copy.sections.tour.title}
              />
              <div className="manual-grid manual-grid--three">
                {copy.tourCards.map((card) => (
                  <InfoCard body={card.body} key={card.title} title={card.title} />
                ))}
              </div>
            </section>

            <section className="manual-section" id="access">
              <SectionHeader
                eyebrow={copy.sections.access.eyebrow}
                title={copy.sections.access.title}
              />
              <div className="manual-grid manual-grid--three">
                {copy.accessCards.map((card) => (
                  <InfoCard body={card.body} key={card.title} title={card.title} />
                ))}
              </div>
            </section>

            <section className="manual-section" id="practices">
              <SectionHeader
                eyebrow={copy.sections.practices.eyebrow}
                title={copy.sections.practices.title}
              />
              <ul className="manual-list">
                {copy.practiceItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="manual-section__header">
      <p className="manual-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="manual-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}