import { getRequestLocale } from "@/lib/i18n-server";

export default async function ManualPage() {
  const locale = await getRequestLocale();
  const isEs = locale === "es";

  return (
    <main style={{ padding: "2rem 1rem 4rem", background: "var(--body-bg)", minHeight: "100vh" }}>
      <div
        style={{
          width: "min(1120px, 100%)",
          margin: "0 auto",
          display: "grid",
          gap: "1.5rem",
        }}
      >
        <section
          style={{
            display: "grid",
            gap: "1rem",
            padding: "1.75rem",
            borderRadius: "1.75rem",
            border: "1px solid var(--border-strong)",
            background:
              "linear-gradient(135deg, var(--accent-soft), color-mix(in srgb, var(--accent-strong) 8%, transparent)), var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent-strong)",
            }}
          >
            {isEs ? "Ayuda para gestores" : "Manager help"}
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 4vw, 3.3rem)",
              lineHeight: 1.1,
            }}
          >
            {isEs ? "Sailing Planner en una sola lectura" : "Sailing Planner at a glance"}
          </h1>
          <p style={{ margin: 0, maxWidth: "72ch", color: "var(--ink)" }}>
            {isEs
              ? "Sailing Planner sirve para ordenar la operativa de un barco a lo largo de una temporada. Como gestor, tu trabajo normal consiste en preparar el barco, dibujar el viaje por tramos, registrar visitas, bloquear periodos no disponibles y dar acceso a las personas adecuadas."
              : "Sailing Planner helps you organize boat operations across a season. As a manager, your usual work is to prepare the boat, outline the route in segments, register visits, block unavailable periods, and grant the right access to the right people."}
          </p>
          <div
            style={{
              width: "fit-content",
              padding: "0.5rem 0.85rem",
              borderRadius: 999,
              border: "1px solid var(--accent-border)",
              background: "var(--accent-soft)",
              color: "var(--accent-strong)",
              fontWeight: 600,
            }}
          >
            {isEs
              ? "El contenido está orientado a gestores, aunque puede leerlo cualquier miembro."
              : "The content is manager-oriented, although any member can read it."}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
            gap: "1.5rem",
          }}
        >
          <aside
            style={{
              alignSelf: "start",
              position: "sticky",
              top: "1.25rem",
              padding: "1.25rem",
              borderRadius: "1.4rem",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1rem" }}>{isEs ? "En esta página" : "On this page"}</h2>
            <nav style={{ display: "grid", gap: "0.35rem", marginTop: "0.75rem" }}>
              {[
                ["#finalidad", isEs ? "Finalidad" : "Purpose"],
                ["#flujo", isEs ? "Proceso normal" : "Normal flow"],
                ["#conceptos", isEs ? "Conceptos clave" : "Key concepts"],
                ["#tour", isEs ? "Tour guiado" : "Guided tour"],
                ["#accesos", isEs ? "Invitaciones y editores" : "Invites and editors"],
                ["#practicas", isEs ? "Buenas prácticas" : "Good practices"],
              ].map(([href, label]) => (
                <a key={href} href={href} style={{ color: "var(--ink)", textDecoration: "none", padding: "0.45rem 0" }}>
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div style={{ display: "grid", gap: "1.5rem" }}>
            <section style={sectionStyle} id="finalidad">
              <SectionHeader
                eyebrow={isEs ? "Finalidad" : "Purpose"}
                title={isEs ? "Qué resuelve la aplicación" : "What the app solves"}
                body={
                  isEs
                    ? "La app centraliza el plan del barco, la secuencia del viaje, quién sube y baja, qué días quedan libres y qué periodos no deben tocarse."
                    : "The app centralizes the boat plan, the route sequence, who boards and leaves, which days remain free, and which periods must stay blocked."
                }
              />
              <div style={gridStyle}>
                <InfoCard
                  title={isEs ? "Visión única" : "Single source of truth"}
                  body={
                    isEs
                      ? "Todo sucede alrededor de una temporada activa y un timeline común para que el equipo vea el mismo plan."
                      : "Everything is organized around one active season and one shared timeline so the whole team sees the same plan."
                  }
                />
                <InfoCard
                  title={isEs ? "Menos fricción" : "Less friction"}
                  body={
                    isEs
                      ? "Los tramos, visitas y bloqueos se cruzan entre sí, así que puedes detectar huecos, solapes o ausencia de datos antes de operar."
                      : "Segments, visits, and blocked periods are cross-checked, so you can detect gaps, overlaps, or missing data before operating."
                  }
                />
              </div>
            </section>

            <section style={sectionStyle} id="flujo">
              <SectionHeader
                eyebrow={isEs ? "Proceso normal" : "Normal flow"}
                title={isEs ? "Orden recomendado de trabajo" : "Recommended working order"}
              />
              <div style={{ display: "grid", gap: "0.9rem" }}>
                {[
                  [isEs ? "Configura el barco" : "Configure the boat", isEs ? "Revisa nombre visible, modelo, año, puerto base e imagen." : "Review visible name, model, year, home port, and image."],
                  [isEs ? "Crea la temporada" : "Create the season", isEs ? "La temporada define el marco temporal completo." : "The season defines the full time frame."],
                  [isEs ? "Añade tramos del viaje" : "Add route segments", isEs ? "Cada tramo representa una etapa o escala con fechas, ubicación y estado." : "Each segment represents a route stage or stop with dates, location, and status."],
                  [isEs ? "Registra visitas" : "Register visits", isEs ? "Anota quién embarca, cuándo sube, cuándo baja y desde dónde." : "Record who boards, when they board, when they leave, and from where."],
                  [isEs ? "Bloquea periodos no disponibles" : "Block unavailable periods", isEs ? "Usa bloqueos para mantenimiento, limpieza o entregas." : "Use blocked periods for maintenance, cleaning, or deliveries."],
                  [isEs ? "Comparte con el nivel adecuado" : "Share with the right level", isEs ? "Invita lectores o crea editores según la responsabilidad real de cada persona." : "Invite readers or create editors based on each person's real responsibility."],
                ].map(([title, body], index) => (
                  <div key={String(title)} style={stepStyle}>
                    <div style={stepIndexStyle}>{index + 1}</div>
                    <div>
                      <h3 style={{ margin: 0 }}>{title}</h3>
                      <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={sectionStyle} id="conceptos">
              <SectionHeader
                eyebrow={isEs ? "Conceptos" : "Concepts"}
                title={isEs ? "Qué significa cada pieza" : "What each piece means"}
              />
              <div style={gridStyle}>
                <InfoCard title={isEs ? "Barco" : "Boat"} body={isEs ? "La ficha base del activo." : "The base record for the asset."} />
                <InfoCard title={isEs ? "Temporada" : "Season"} body={isEs ? "El periodo de navegación que ordena el timeline." : "The navigation period that structures the timeline."} />
                <InfoCard title={isEs ? "Tramo o escala" : "Segment or stop"} body={isEs ? "Una parte del viaje con fechas, lugar y estado." : "A part of the route with dates, place, and status."} />
                <InfoCard title={isEs ? "Visita" : "Visit"} body={isEs ? "Una estancia de invitados o tripulación con embarque y desembarque." : "A guest or crew stay with boarding and disembark dates."} />
                <InfoCard title={isEs ? "Bloqueo" : "Blocked period"} body={isEs ? "Un periodo no operativo que se excluye de la disponibilidad." : "A non-operational period excluded from availability."} />
                <InfoCard title="Timeline" body={isEs ? "La vista que une viaje, visitas y disponibilidad." : "The view that combines route, visits, and availability."} />
              </div>
            </section>

            <section style={sectionStyle} id="tour">
              <SectionHeader
                eyebrow={isEs ? "Tour guiado" : "Guided tour"}
                title={isEs ? "Cómo recorrer la aplicación paso a paso" : "How to walk through the product step by step"}
                body={
                  isEs
                    ? "El menú lateral incluye una entrada Tour para volver a lanzar la guía sin alterar tu configuración real. El recorrido repasa las entradas del menú y los bloques operativos principales del espacio de trabajo."
                    : "The sidebar includes a Tour entry so you can relaunch the guide without changing your real setup. The walkthrough covers the main menu entries and the core workspace areas."
                }
              />
              <div style={{ display: "grid", gap: "0.9rem" }}>
                <InfoCard
                  title={isEs ? "Qué recorre" : "What it covers"}
                  body={
                    isEs
                      ? "Plan, Resumen, Compartidos, Manual, Configuración y, cuando corresponda, Invitar, Barco y Miembros. Dentro del plan también pasa por timeline, controles, escalas, visitas, mapa y disponibilidad."
                      : "Plan, Summary, Shared, Manual, Settings and, when applicable, Invite, Boat and Members. Inside the plan it also walks through the timeline, controls, port stops, visits, map and availability."
                  }
                />
                <InfoCard
                  title={isEs ? "Cuándo usarlo" : "When to use it"}
                  body={
                    isEs
                      ? "Úsalo al incorporarte a un barco nuevo, cuando cambie el flujo de trabajo o cuando quieras validar que sigues entendiendo el recorrido completo del producto."
                      : "Use it when joining a new boat, when the workflow changes, or when you want to validate that the full product journey is still clear."
                  }
                />
              </div>
            </section>

            <section style={sectionStyle} id="accesos">
              <SectionHeader
                eyebrow={isEs ? "Accesos" : "Access"}
                title={isEs ? "Cuándo usar invitaciones y cuándo crear editores" : "When to use invites and when to create editors"}
              />
              <div style={{ display: "grid", gap: "0.9rem" }}>
                <InfoCard
                  title={isEs ? "Invitación de lectura" : "Read-only invite"}
                  body={
                    isEs
                      ? "Úsala cuando alguien solo necesita consultar la temporada, entender el plan o seguir visitas sin editar información."
                      : "Use it when someone only needs to review the season, understand the plan, or follow visits without editing data."
                  }
                />
                <InfoCard
                  title={isEs ? "Editor o gestor operativo" : "Editor or operational manager"}
                  body={
                    isEs
                      ? "Créalo cuando esa persona vaya a mantener tramos, visitas, bloqueos o configuración del barco de forma recurrente."
                      : "Create it when that person will regularly maintain segments, visits, blocked periods, or boat settings."
                  }
                />
              </div>
            </section>

            <section style={sectionStyle} id="practicas">
              <SectionHeader
                eyebrow={isEs ? "Buenas prácticas" : "Good practices"}
                title={isEs ? "Cómo mantener el panel limpio y útil" : "How to keep the workspace clean and useful"}
              />
              <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
                <li>{isEs ? "Primero define la temporada y la estructura general del viaje. Después entra al detalle." : "Define the season and general route structure first. Then refine the details."}</li>
                <li>{isEs ? "Usa nombres de lugares consistentes para que mapa, timeline y visitas se entiendan de un vistazo." : "Use consistent location names so map, timeline, and visits are easy to read at a glance."}</li>
                <li>{isEs ? "Bloquea cuanto antes los periodos no disponibles para no prometer disponibilidad irreal." : "Block unavailable periods early so you do not suggest unrealistic availability."}</li>
                <li>{isEs ? "Crea editores solo cuando haya una responsabilidad clara de mantenimiento." : "Create editors only when there is a clear maintenance responsibility."}</li>
                <li>{isEs ? "Si cambian fechas o ruta, actualiza antes los tramos y luego revisa visitas y bloqueos afectados." : "If dates or route change, update segments first and then review affected visits and blocked periods."}</li>
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
    <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.1rem" }}>
      <p
        style={{
          margin: 0,
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--accent-strong)",
        }}
      >
        {eyebrow}
      </p>
      <h2 style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1.15 }}>{title}</h2>
      {body ? <p style={{ margin: 0, color: "var(--muted)" }}>{body}</p> : null}
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article style={cardStyle}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: "0.45rem 0 0", color: "var(--muted)" }}>{body}</p>
    </article>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: "1.5rem",
  borderRadius: "1.5rem",
  border: "1px solid var(--border)",
  background: "var(--surface)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "1rem",
};

const cardStyle: React.CSSProperties = {
  padding: "1.1rem",
  borderRadius: "1.25rem",
  border: "1px solid var(--border)",
  background: "linear-gradient(180deg, var(--surface-raised), var(--surface))",
};

const stepStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  gap: "0.9rem",
  padding: "1rem",
  borderRadius: "1.25rem",
  border: "1px solid var(--border)",
  background: "var(--surface)",
};

const stepIndexStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
  color: "var(--on-accent)",
  fontWeight: 800,
};