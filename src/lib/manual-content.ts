import type { Locale } from "@/lib/i18n";

type ManualCard = {
  title: string;
  body: string;
};

type ManualSection = {
  eyebrow: string;
  title: string;
  body?: string;
};

type ManualContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  backLabel: string;
  openAppLabel: string;
  heroPills: string[];
  tocTitle: string;
  tocNoteTitle: string;
  tocNoteBody: string;
  sections: {
    purpose: ManualSection;
    flow: ManualSection;
    concepts: ManualSection;
    access: ManualSection;
    practices: ManualSection;
  };
  purposeCards: ManualCard[];
  flowSteps: Array<[string, string]>;
  conceptCards: Array<[string, string]>;
  accessCards: ManualCard[];
  practiceItems: string[];
};

const manualContent: Record<Locale, ManualContent> = {
  es: {
    heroEyebrow: "Manual operativo",
    heroTitle: "Sailing Planner en una sola lectura",
    heroLead:
      "Sailing Planner ordena la temporada del barco en un único espacio de trabajo. Aquí preparas la temporada, defines la ruta por tramos, registras visitas, bloqueas periodos no disponibles y compartes la información con el nivel de acceso correcto.",
    backLabel: "Volver",
    openAppLabel: "Ir al panel",
    heroPills: [
      "Orientado a gestores y editores operativos",
      "Válido también como referencia para lectores e invitados",
    ],
    tocTitle: "En esta página",
    tocNoteTitle: "Antes de empezar",
    tocNoteBody:
      "El acceso real de cada persona se ve en Configuración, dentro de Rol y permisos. El manual explica el flujo, pero no sustituye esos permisos.",
    sections: {
      purpose: {
        eyebrow: "Finalidad",
        title: "Qué resuelve la aplicación",
        body:
          "La app mantiene alineados el plan del barco, la secuencia del viaje, las visitas previstas y la disponibilidad real para que el equipo trabaje sobre la misma versión del plan.",
      },
      flow: {
        eyebrow: "Proceso normal",
        title: "Orden recomendado de trabajo",
      },
      concepts: {
        eyebrow: "Conceptos",
        title: "Qué significa cada pieza",
      },
      access: {
        eyebrow: "Acceso",
        title: "Qué puede hacer cada tipo de usuario",
      },
      practices: {
        eyebrow: "Buenas prácticas",
        title: "Cómo mantener el espacio útil y legible",
      },
    },
    purposeCards: [
      {
        title: "Versión única del plan",
        body: "Temporada, tramos, visitas y bloqueos viven en el mismo contexto para evitar planes paralelos y decisiones con datos viejos.",
      },
      {
        title: "Menos fricción operativa",
        body: "El timeline cruza navegación, ocupación y disponibilidad para detectar huecos, solapes o incoherencias antes de operar.",
      },
      {
        title: "Compartir sin perder control",
        body: "Puedes dar acceso de lectura, crear editores o usar enlaces guest según la responsabilidad real de cada persona.",
      },
    ],
    flowSteps: [
      ["Configura el barco", "Revisa nombre visible, modelo, año, puerto base e imagen antes de trabajar sobre la temporada."],
      ["Crea la temporada", "La temporada es el marco completo de fechas sobre el que se ordena el resto del trabajo."],
      ["Define los tramos", "Cada tramo representa una etapa del viaje con fechas, lugar y estado."],
      ["Registra visitas", "Anota quién embarca, cuándo entra, cuándo sale y desde dónde se coordina la visita."],
      ["Bloquea lo no disponible", "Usa bloqueos para mantenimiento, limpieza, entregas o cualquier periodo que no deba venderse ni prometerse."],
      ["Comparte con criterio", "Invita lectores para consulta, crea editores para mantenimiento real y usa guest cuando solo necesites enseñar el plan."],
    ],
    conceptCards: [
      ["Barco", "La ficha base del activo y su contexto operativo."],
      ["Temporada", "El periodo de navegación que ordena el timeline."],
      ["Tramo o escala", "Una parte del viaje con fechas, lugar y estado."],
      ["Visita", "Una estancia de invitados o tripulación con embarque y desembarque."],
      ["Bloqueo", "Un periodo no operativo que se excluye de la disponibilidad."],
      ["Timeline", "La vista que combina ruta, visitas y disponibilidad."],
    ],
    accessCards: [
      {
        title: "Lectores e invitados",
        body: "Deben moverse en flujos de consulta: revisar temporada, resumen, visitas visibles y enlaces compartidos. No están pensados para mantener datos operativos.",
      },
      {
        title: "Editores y gestores",
        body: "Son quienes mantienen tramos, visitas, bloqueos y configuración del barco de forma recurrente. Solo tiene sentido dar este acceso cuando existe una responsabilidad clara.",
      },
      {
        title: "Dónde verificarlo",
        body: "Cada persona puede revisar su alcance en Configuración, dentro de Rol y permisos, donde se muestra si su acceso es global o limitado a barcos concretos.",
      },
    ],
    practiceItems: [
      "Empieza por la temporada y la ruta general antes de entrar al detalle de visitas y excepciones.",
      "Usa nombres de lugares consistentes para que mapa, timeline y resumen se lean rápido.",
      "Bloquea cuanto antes los periodos no disponibles para no transmitir una disponibilidad irreal.",
      "Evita crear editores por comodidad: solo deben editar quienes mantengan el plan de verdad.",
      "Cuando cambien fechas o ruta, corrige primero los tramos y después revisa visitas y bloqueos afectados.",
    ],
  },
  en: {
    heroEyebrow: "Operations manual",
    heroTitle: "Sailing Planner at a glance",
    heroLead:
      "Sailing Planner keeps the boat season inside one workspace. Here you prepare the season, define the route by segments, register visits, block unavailable periods, and share information with the right access level.",
    backLabel: "Go back",
    openAppLabel: "Open app",
    heroPills: [
      "Designed for managers and operational editors",
      "Also useful as a reference for viewers and guests",
    ],
    tocTitle: "On this page",
    tocNoteTitle: "Before you start",
    tocNoteBody:
      "Each person's actual access is shown in Settings, inside Role and permissions. The manual explains the workflow, but it does not replace those permissions.",
    sections: {
      purpose: {
        eyebrow: "Purpose",
        title: "What the app solves",
        body:
          "The app keeps the boat plan, route sequence, planned visits, and real availability aligned so the team works from the same version of the season.",
      },
      flow: {
        eyebrow: "Normal flow",
        title: "Recommended working order",
      },
      concepts: {
        eyebrow: "Concepts",
        title: "What each piece means",
      },
      access: {
        eyebrow: "Access",
        title: "What each user type should do",
      },
      practices: {
        eyebrow: "Good practices",
        title: "How to keep the workspace useful and readable",
      },
    },
    purposeCards: [
      {
        title: "One version of the plan",
        body: "Season, route segments, visits, and blocked periods stay in one context so people do not operate from parallel plans or stale notes.",
      },
      {
        title: "Less operational friction",
        body: "The timeline cross-checks navigation, occupancy, and availability so gaps, overlaps, and inconsistencies are easier to catch early.",
      },
      {
        title: "Share without losing control",
        body: "You can grant read access, create editors, or use guest links depending on each person's actual responsibility.",
      },
    ],
    flowSteps: [
      ["Configure the boat", "Review the visible name, model, year, home port, and image before working on the season."],
      ["Create the season", "The season is the full date frame used to organize the rest of the work."],
      ["Define the route segments", "Each segment represents a route stage with dates, place, and status."],
      ["Register visits", "Record who boards, when they arrive, when they leave, and where the visit is coordinated from."],
      ["Block unavailable time", "Use blocked periods for maintenance, cleaning, handovers, or any time that must not be offered."],
      ["Share deliberately", "Invite viewers for consultation, create editors for real maintenance work, and use guest links when you only need to show the plan."],
    ],
    conceptCards: [
      ["Boat", "The base asset record and its operating context."],
      ["Season", "The navigation period that structures the timeline."],
      ["Segment or stop", "A part of the route with dates, place, and status."],
      ["Visit", "A guest or crew stay with boarding and disembark dates."],
      ["Blocked period", "A non-operational period excluded from availability."],
      ["Timeline", "The view that combines route, visits, and availability."],
    ],
    accessCards: [
      {
        title: "Viewers and guests",
        body: "They should stay on consultation flows: review the season, summary, visible visits, and shared links. They are not meant to maintain operational data.",
      },
      {
        title: "Editors and managers",
        body: "They maintain route segments, visits, blocked periods, and boat settings on a recurring basis. This access only makes sense when there is a clear ownership responsibility.",
      },
      {
        title: "Where to verify it",
        body: "Each person can review their scope in Settings, inside Role and permissions, where the product shows whether access is global or limited to specific boats.",
      },
    ],
    practiceItems: [
      "Start with the season and the general route before going into visit details and exceptions.",
      "Use consistent place names so the map, timeline, and summary stay easy to read.",
      "Block unavailable periods early so you do not imply unrealistic availability.",
      "Do not create editors for convenience alone: only people who truly maintain the plan should edit it.",
      "When dates or route change, update segments first and then review affected visits and blocked periods.",
    ],
  },
};

export const getManualContent = (locale: Locale) => manualContent[locale];
