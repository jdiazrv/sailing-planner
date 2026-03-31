import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Multi-boat planning</p>
          <h1>Plan seasons, trip segments and visits with boat-aware access.</h1>
          <p>
            This starter is wired for Supabase Auth, PostgreSQL migrations, row
            level security and Netlify-friendly environment handling.
          </p>
          <div className="hero__actions">
            <Link className="primary-button" href="/login">
              Open login
            </Link>
            <Link className="secondary-button" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="panel dashboard-card">
          <p className="eyebrow">What is included</p>
          <ul className="list">
            <li>Supabase browser, server and middleware clients for Next.js App Router.</li>
            <li>Versioned SQL migrations with multi-boat RLS and helper functions.</li>
            <li>Bootstrapping and seed guidance for the first superuser and first boat.</li>
          </ul>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <p className="eyebrow">Isolation</p>
          <h2>Boat data stays isolated</h2>
          <p>
            Policies derive access through boat permissions and a global
            superuser profile flag.
          </p>
        </article>
        <article className="feature-card">
          <p className="eyebrow">Auth</p>
          <h2>Email first</h2>
          <p>
            Password login works today and magic links are already prepared for
            the same callback flow.
          </p>
        </article>
        <article className="feature-card">
          <p className="eyebrow">Deploy</p>
          <h2>Netlify ready</h2>
          <p>
            Environment variables, redirect URLs and manual dashboard steps are
            documented in the repository.
          </p>
        </article>
      </section>
    </main>
  );
}
