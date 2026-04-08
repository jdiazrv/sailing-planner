import type { Locale } from "@/lib/i18n";
import type { OnboardingStep } from "@/types/database";

export type TourStep = {
  target: string;
  title: string;
  body: string;
  requiredView?: "trip" | "visits";
};

type EffectiveOnboardingStateInput = {
  onboardingPending: boolean;
  onboardingStep?: OnboardingStep | null;
  hasSeason: boolean;
};

type StartTourStepInput = {
  hasAssignedBoat?: boolean;
  canEditBoat: boolean;
  hasSeason: boolean;
};

type MemberTourStepsInput = {
  locale: Locale;
  memberPhase?: OnboardingStep | null;
  canViewVisits: boolean;
  canManageUsers: boolean;
  canShare: boolean;
  canEditBoat: boolean;
  isSuperuser: boolean;
  isReadOnly: boolean;
  hasSegments: boolean;
  hasVisits: boolean;
};

type MemberWelcomeCopyInput = {
  locale: Locale;
  boatName: string;
  canEditBoat: boolean;
  hasSeason: boolean;
};

export const resolveEffectiveOnboardingStep = ({
  onboardingPending,
  onboardingStep,
  hasSeason,
}: EffectiveOnboardingStateInput): OnboardingStep | null => {
  if (!onboardingPending) {
    return onboardingStep ?? null;
  }

  if (hasSeason) {
    if (onboardingStep === "create_season" || !onboardingStep) {
      return "full_tour";
    }

    return onboardingStep;
  }

  return onboardingStep ?? "welcome";
};

export const getStartTourStep = ({
  hasAssignedBoat = true,
  canEditBoat,
  hasSeason,
}: StartTourStepInput): OnboardingStep => {
  if (!hasAssignedBoat) {
    return "welcome";
  }

  if (hasSeason) {
    return "full_tour";
  }

  if (canEditBoat) {
    return "configure_boat";
  }

  return "create_season";
};

export const getNextStepAfterBoatSettings = ({ hasSeason }: { hasSeason: boolean }): OnboardingStep =>
  hasSeason ? "full_tour" : "create_season";

export const canExecuteOnboardingPhaseAction = ({
  phase,
  canEditBoat,
}: {
  phase?: OnboardingStep | null;
  canEditBoat: boolean;
}) => canEditBoat && (phase === "configure_boat" || phase === "create_season");

export const getMemberWelcomeCopy = ({
  locale,
  boatName,
  canEditBoat,
  hasSeason,
}: MemberWelcomeCopyInput) => {
  const copy =
    locale === "es"
      ? {
          title: "Bienvenido a bordo",
          lead: "Gracias por unirte. Vamos a hacer un tour rapido de la plataforma.",
          closeHint: "Puedes salir del tour en cualquier momento con el boton Cerrar.",
          assignedBoatLabel: "Te han asignado al barco",
          hasSeasonBody:
            "Este barco ya tiene temporada activa, asi que la guia empezara explicando el timeline, las escalas y las visitas.",
          editableNoSeasonBody:
            "Lo primero sera abrir el menu de Barco y terminar la configuracion de tu barco.",
          readOnlyNoSeasonBody:
            "Todavia no hay temporada creada para este barco. La guia te llevara al siguiente paso disponible.",
          skip: "Saltar",
          start: "Empezar tour",
        }
      : {
          title: "Welcome aboard",
          lead: "Thanks for joining. We will do a quick platform tour.",
          closeHint: "You can exit the tour at any time using the Close button.",
          assignedBoatLabel: "You have been assigned to the boat",
          hasSeasonBody:
            "This boat already has an active season, so the guide will start by explaining the timeline, trip segments, and visits.",
          editableNoSeasonBody:
            "First, we will open the Boat menu and finish configuring your boat.",
          readOnlyNoSeasonBody:
            "There is no season yet for this boat. The guide will take you to the next available step.",
          skip: "Skip",
          start: "Start tour",
        };

  return {
    ...copy,
    assignedBoatBody: `${copy.assignedBoatLabel} ${boatName}.`,
    nextStepBody: hasSeason
      ? copy.hasSeasonBody
      : canEditBoat
        ? copy.editableNoSeasonBody
        : copy.readOnlyNoSeasonBody,
  };
};

export const buildMemberTourSteps = ({
  locale,
  memberPhase,
  canViewVisits,
  canManageUsers,
  canShare,
  canEditBoat,
  isSuperuser,
  isReadOnly,
  hasSegments,
  hasVisits,
}: MemberTourStepsInput): TourStep[] => {
  const copy =
    locale === "es"
      ? {
          configureBoatTitle: "Configurar barco",
          configureBoatAdmin:
            "El primer paso es revisar y completar los datos del barco desde el menú Barcos. Entra ahí, ajusta los datos generales del barco y después vuelve al espacio de trabajo para continuar.",
          configureBoatEditable:
            "El primer paso es revisar y completar los datos del barco. Abre la configuración del barco, rellena el modelo, año y puerto base, y guarda. Cuando cierres, el tour continuará automáticamente.",
          configureBoatReadOnly:
            "Antes de empezar, revisa los datos del barco asignado. Un gestor debe haberlos completado para que puedas comenzar.",
          createSeasonTitle: "Crear la primera temporada",
          createSeasonEditable:
            "La temporada define el periodo de navegacion: fechas de inicio y fin, nombre del año. Sin temporada no hay timeline. Crea la primera desde esta card para continuar.",
          createSeasonReadOnly:
            "Todavia no existe ninguna temporada para este barco. Sin temporada no hay timeline ni visitas que mostrar. Un gestor o editor del barco debe crearla antes de que puedas continuar.",
          planTitle: "Plan",
          planReadOnlyBody:
            "Plan devuelve al espacio operativo principal del barco, donde ves timeline, escalas, mapa y visitas según tus permisos.",
          planBody:
            "Plan es el centro operativo diario del barco. Desde aquí controlas el timeline y la operativa de la temporada.",
          summaryTitle: "Resumen",
          summaryReadOnlyBody:
            "Resumen abre la vista condensada de temporada con secuencia operativa, mapa y métricas principales.",
          summaryBody:
            "Resumen te da una lectura condensada de la temporada para revisar secuencia, mapa y magnitudes sin entrar al detalle de edición.",
          inviteTitle: "Invitar",
          inviteBody:
            "Desde Invitar generas enlaces guest y gestionas cómo se comparte la temporada en modo consulta, sin dar acceso de edición.",
          usersTitle: "Miembros",
          usersBody:
            "Miembros te permite crear y mantener usuarios del barco, asignando permisos según la responsabilidad real de cada persona.",
          sharedTitle: "Compartidos",
          sharedReadOnlyBody:
            "Compartidos reúne los timelines públicos a los que tienes acceso para compararlos sin entrar en cada barco uno por uno.",
          sharedBody:
            "Compartidos centraliza los timelines públicos a los que tienes acceso y te permite compararlos en paralelo.",
          manualTitle: "Manual",
          manualReadOnlyBody:
            "Manual abre la guía operativa del producto en una pestaña nueva, con el flujo recomendado y los criterios de uso actuales.",
          manualBody:
            "Manual abre la guía escrita del producto en una pestaña nueva. Úsalo cuando necesites recordar el flujo recomendado o revisar criterios operativos.",
          settingsTitle: "Configuración",
          settingsReadOnlyBody:
            "Configuración reúne tus preferencias personales y el bloque de Rol y permisos para comprobar exactamente qué alcance tienes dentro del producto.",
          settingsBody:
            "En Configuración ajustas tus preferencias de uso y revisas Rol y permisos. Tus preferencias no cambian el barco para los demás, pero ese bloque sí te muestra tu alcance real.",
          timelineTitle: "Timeline de la temporada",
          timelineReadOnlyWithVisits:
            "El timeline muestra el plan completo de la temporada: escalas del viaje, visitas de invitados y disponibilidad del barco. Es de solo lectura para tu perfil.",
          timelineReadOnlyWithoutVisits:
            "El timeline muestra el plan completo disponible para tu perfil: escalas del viaje y disponibilidad del barco en modo consulta.",
          timelineWithSegments:
            "El timeline muestra el plan completo. Las barras del viaje estan en la fila superior. Debajo aparecen las visitas agrupadas por persona, la disponibilidad calculada y los periodos bloqueados.",
          timelineWithoutSegments:
            "El timeline es el corazon del panel. Cuando añadas escalas y visitas, aqui veras una vision completa de la temporada de un vistazo.",
          controlsReadOnlyTitle: "Controles de vista",
          controlsReadOnlyBody:
            "Aquí ajustas el zoom temporal del timeline y qué capas visibles quieres mantener activas dentro del plan.",
          controlsTitle: "Controles del timeline",
          controlsBody:
            "Aquí ajustas el zoom temporal del timeline y las capas visibles del plan. En esta barra no se cambia el layout del panel: solo la lectura del timeline.",
          layersTitle: "Capas del timeline",
          layersBody:
            "Cada capa controla qué filas ves en el timeline. Escalas está fija como base del plan, Visitas se puede mostrar u ocultar y Disponibilidad calcula los huecos libres del barco.",
          tripDetailTitle: "Escalas del viaje",
          tripDetailReadOnly:
            "Aqui puedes consultar todas las escalas planificadas con sus fechas, lugares y estado. Esta informacion es de solo consulta para tu perfil.",
          tripDetailEditable:
            "Aqui creas y editas las escalas: zona de navegacion, fechas, estado y ubicaciones. Cada escala que añadas aparecera inmediatamente en el timeline.",
          tripDetailViewer:
            "Aqui consultas el detalle de las escalas planificadas con fechas, lugares y estado de cada una.",
          mapTitle: "Mapa del recorrido",
          mapReadOnly:
            "El mapa situa visualmente el recorrido y los puntos clave de la temporada. Puedes seleccionar una escala para ver su ubicacion destacada.",
          mapBody:
            "El mapa situa visualmente todas las escalas y visitas. Selecciona cualquier elemento del timeline o la tabla para verlo destacado en el mapa.",
          visitsSwitchTitle: "Visitas",
          visitsSwitchReadOnlyBody:
            "Desde este selector cambias la tabla principal de Escalas a Visitas para consultar los invitados previstos.",
          visitsSwitchBody:
            "Desde este selector cambias la tabla principal de Escalas a Visitas para trabajar con los invitados de la temporada.",
          visitsCardTitle: "Visitas de la temporada",
          visitsCardReadOnly:
            "En esta tabla principal ves todas las visitas registradas: quien viene, en que fechas y desde donde embarca y desembarca. Modo consulta.",
          visitsCardEditableWithVisits:
            "Aqui gestionas las visitas registradas. Puedes editar fechas, lugares de embarque y desembarque, estado y notas. Cada visita aparece como una fila en el timeline con su nombre.",
          visitsCardEditableWithoutVisits:
            "Aqui añadiras las visitas de la temporada. Cada visita necesita nombre, fechas de embarque y desembarque. Una vez creada, aparece automaticamente en el timeline agrupada por nombre.",
          visitsCardViewer:
            "Consulta las visitas previstas con sus fechas, lugares y estado actual.",
          availabilityTitle: "Disponibilidad",
          availabilityBody:
            "Debajo de la tabla principal puedes desplegar la disponibilidad calculada automáticamente para revisar los huecos libres que quedan según escalas, visitas y periodos ya cerrados.",
        }
      : {
          configureBoatTitle: "Configure boat",
          configureBoatAdmin:
            "The first step is to review and complete the boat data from the Boats menu. Go there, adjust the general boat details, and then return to the workspace to continue.",
          configureBoatEditable:
            "The first step is to review and complete the boat details. Open boat settings, fill in the model, year, and home port, and save. When you close it, the tour will continue automatically.",
          configureBoatReadOnly:
            "Before you start, review the assigned boat details. A manager should have completed them so you can begin.",
          createSeasonTitle: "Create the first season",
          createSeasonEditable:
            "The season defines the navigation period: start and end dates and the season name. Without a season there is no timeline. Create the first one from this card to continue.",
          createSeasonReadOnly:
            "There is no season for this boat yet. Without a season there is no timeline or visits to show. A manager or editor must create it before you can continue.",
          planTitle: "Plan",
          planReadOnlyBody:
            "Plan takes you back to the boat's main operational workspace, where you see the timeline, trip segments, map, and visits according to your permissions.",
          planBody:
            "Plan is the boat's daily operational hub. From here you control the timeline and the season workflow.",
          summaryTitle: "Summary",
          summaryReadOnlyBody:
            "Summary opens the condensed season view with the operational sequence, map, and main metrics.",
          summaryBody:
            "Summary gives you a condensed reading of the season so you can review sequence, map, and scale without entering edit details.",
          inviteTitle: "Invite",
          inviteBody:
            "From Invite you generate guest links and manage how the season is shared in read-only mode, without granting edit access.",
          usersTitle: "Members",
          usersBody:
            "Members lets you create and maintain boat users, assigning permissions according to each person's actual responsibility.",
          sharedTitle: "Shared",
          sharedReadOnlyBody:
            "Shared gathers the public timelines you can access so you can compare them without opening each boat one by one.",
          sharedBody:
            "Shared centralizes the public timelines you can access and lets you compare them side by side.",
          manualTitle: "Manual",
          manualReadOnlyBody:
            "Manual opens the written product guide in a new tab, with the recommended workflow and current operating criteria.",
          manualBody:
            "Manual opens the written product guide in a new tab. Use it when you need to recall the recommended workflow or review operating criteria.",
          settingsTitle: "Settings",
          settingsReadOnlyBody:
            "Settings brings together your personal preferences and the Role and permissions block so you can verify exactly what scope you have inside the product.",
          settingsBody:
            "In Settings you adjust your usage preferences and review Role and permissions. Your preferences do not change the boat for others, but that block does show your actual reach.",
          timelineTitle: "Season timeline",
          timelineReadOnlyWithVisits:
            "The timeline shows the full season plan: trip segments, guest visits, and boat availability. It is read-only for your profile.",
          timelineReadOnlyWithoutVisits:
            "The timeline shows the full plan available to your profile: trip segments and boat availability in read-only mode.",
          timelineWithSegments:
            "The timeline shows the full plan. The trip bars sit on the top row. Below them you will see visits grouped by person, computed availability, and blocked periods.",
          timelineWithoutSegments:
            "The timeline is the heart of the workspace. Once you add trip segments and visits, you will see a complete season view here at a glance.",
          controlsReadOnlyTitle: "View controls",
          controlsReadOnlyBody:
            "Here you adjust the timeline zoom and which visible layers stay active within the plan.",
          controlsTitle: "Timeline controls",
          controlsBody:
            "Here you adjust the timeline zoom and the visible plan layers. This bar does not change the panel layout, only how the timeline is read.",
          layersTitle: "Timeline layers",
          layersBody:
            "Each layer controls which rows you see in the timeline. Trip segments stay fixed as the base plan, Visits can be shown or hidden, and Availability calculates the boat's free gaps.",
          tripDetailTitle: "Trip segments",
          tripDetailReadOnly:
            "Here you can review every planned trip segment with its dates, places, and status. This information is read-only for your profile.",
          tripDetailEditable:
            "Here you create and edit trip segments: navigation area, dates, status, and locations. Each segment appears in the timeline as soon as you add it.",
          tripDetailViewer:
            "Here you review the planned trip segments with the dates, places, and status of each one.",
          mapTitle: "Route map",
          mapReadOnly:
            "The map places the route and key season points visually. You can select a trip segment to see its location highlighted.",
          mapBody:
            "The map places all trip segments and visits visually. Select any element in the timeline or table to see it highlighted on the map.",
          visitsSwitchTitle: "Visits",
          visitsSwitchReadOnlyBody:
            "From this selector you switch the main table from Trip segments to Visits to review the planned guests.",
          visitsSwitchBody:
            "From this selector you switch the main table from Trip segments to Visits to work with the season guests.",
          visitsCardTitle: "Season visits",
          visitsCardReadOnly:
            "In this main table you see every recorded visit: who is coming, on which dates, and from where they board and disembark. Read-only mode.",
          visitsCardEditableWithVisits:
            "Here you manage the recorded visits. You can edit dates, boarding and disembark places, status, and notes. Each visit appears as a row in the timeline with its name.",
          visitsCardEditableWithoutVisits:
            "Here you will add the season visits. Each visit needs a name and boarding and disembark dates. Once created, it appears automatically in the timeline grouped by name.",
          visitsCardViewer:
            "Review the planned visits with their dates, places, and current status.",
          availabilityTitle: "Availability",
          availabilityBody:
            "Below the main table you can expand the automatically computed availability to review the free gaps left after trip segments, visits, and already blocked periods.",
        };

  if (memberPhase === "configure_boat") {
    return [
      {
        target: isSuperuser
          ? '[data-tour="sidebar-admin-boats"]'
          : '[data-tour="sidebar-boat-settings"]',
        title: copy.configureBoatTitle,
        body: canEditBoat
          ? isSuperuser
            ? copy.configureBoatAdmin
            : copy.configureBoatEditable
          : copy.configureBoatReadOnly,
      },
    ];
  }

  if (memberPhase === "create_season") {
    return [
      {
        target: '[data-tour="next-step-card"]',
        title: copy.createSeasonTitle,
        body: canEditBoat
          ? copy.createSeasonEditable
          : copy.createSeasonReadOnly,
      },
    ];
  }

  if (isReadOnly) {
    return [
      {
        target: '[data-tour="sidebar-plan"]',
        title: copy.planTitle,
        body: copy.planReadOnlyBody,
      },
      {
        target: '[data-tour="sidebar-summary"]',
        title: copy.summaryTitle,
        body: copy.summaryReadOnlyBody,
      },
      {
        target: '[data-tour="sidebar-shared"]',
        title: copy.sharedTitle,
        body: copy.sharedReadOnlyBody,
      },
      {
        target: '[data-tour="sidebar-manual"]',
        title: copy.manualTitle,
        body: copy.manualReadOnlyBody,
      },
      {
        target: '[data-tour="sidebar-user-settings"]',
        title: copy.settingsTitle,
        body: copy.settingsReadOnlyBody,
      },
      {
        target: '[data-tour="boat-timeline"]',
        title: copy.timelineTitle,
        body: canViewVisits
          ? copy.timelineReadOnlyWithVisits
          : copy.timelineReadOnlyWithoutVisits,
      },
      {
        target: '[data-tour="planning-control-bar"]',
        title: copy.controlsReadOnlyTitle,
        body: copy.controlsReadOnlyBody,
      },
      {
        target: '[data-tour="boat-detail"]',
        title: copy.tripDetailTitle,
        body: copy.tripDetailReadOnly,
        requiredView: "trip",
      },
      {
        target: '[data-tour="boat-map"]',
        title: copy.mapTitle,
        body: copy.mapReadOnly,
        requiredView: "trip",
      },
      ...(canViewVisits
        ? [
            {
              target: '[data-tour="boat-switch-visits"]',
              title: copy.visitsSwitchTitle,
              body: copy.visitsSwitchReadOnlyBody,
              requiredView: "trip" as const,
            },
            {
              target: '[data-tour="boat-visits-card"]',
              title: copy.visitsCardTitle,
              body: copy.visitsCardReadOnly,
              requiredView: "visits" as const,
            },
          ]
        : []),
    ];
  }

  return [
    {
      target: '[data-tour="sidebar-plan"]',
      title: copy.planTitle,
      body: copy.planBody,
    },
    {
      target: '[data-tour="sidebar-summary"]',
      title: copy.summaryTitle,
      body: copy.summaryBody,
    },
    ...(canShare
      ? [
          {
            target: '[data-tour="sidebar-invite"]',
            title: copy.inviteTitle,
            body: copy.inviteBody,
          },
        ]
      : []),
    ...(canEditBoat
      ? [
          {
            target: isSuperuser
              ? '[data-tour="sidebar-admin-boats"]'
              : '[data-tour="sidebar-boat-settings"]',
            title: isSuperuser ? (locale === "es" ? "Barcos" : "Boats") : copy.configureBoatTitle,
            body: isSuperuser
              ? copy.configureBoatAdmin
              : locale === "es"
                ? "Barco abre la configuración global del barco: modelo, año, puerto base, imagen y demás datos comunes a todos los usuarios."
                : "Boat opens the global boat settings: model, year, home port, image, and the rest of the data shared by all users.",
          },
        ]
      : []),
    ...(canManageUsers
      ? [
          {
            target: '[data-tour="sidebar-users"]',
            title: copy.usersTitle,
            body: copy.usersBody,
          },
        ]
      : []),
    {
      target: '[data-tour="sidebar-shared"]',
      title: copy.sharedTitle,
      body: copy.sharedBody,
    },
    {
      target: '[data-tour="sidebar-manual"]',
      title: copy.manualTitle,
      body: copy.manualBody,
    },
    {
      target: '[data-tour="sidebar-user-settings"]',
      title: copy.settingsTitle,
      body: copy.settingsBody,
    },
    {
      target: '[data-tour="boat-timeline"]',
      title: copy.timelineTitle,
      body: hasSegments
        ? copy.timelineWithSegments
        : copy.timelineWithoutSegments,
    },
    {
      target: '[data-tour="planning-control-bar"]',
      title: copy.controlsTitle,
      body: copy.controlsBody,
    },
    {
      target: '[data-tour="timeline-layers"]',
      title: copy.layersTitle,
      body: copy.layersBody,
    },
    {
      target: '[data-tour="boat-detail"]',
      title: copy.tripDetailTitle,
      body: canEditBoat
        ? copy.tripDetailEditable
        : copy.tripDetailViewer,
      requiredView: "trip",
    },
    {
      target: '[data-tour="boat-map"]',
      title: copy.mapTitle,
      body: copy.mapBody,
      requiredView: "trip",
    },
    ...(canViewVisits
      ? [
          {
            target: '[data-tour="boat-switch-visits"]',
            title: copy.visitsSwitchTitle,
            body: copy.visitsSwitchBody,
            requiredView: "trip" as const,
          },
          {
            target: '[data-tour="boat-visits-card"]',
            title: copy.visitsCardTitle,
            body: canEditBoat
              ? hasVisits
                ? copy.visitsCardEditableWithVisits
                : copy.visitsCardEditableWithoutVisits
              : copy.visitsCardViewer,
            requiredView: "visits" as const,
          },
        ]
      : []),
    {
      target: '[data-tour="availability-section"]',
      title: copy.availabilityTitle,
      body: copy.availabilityBody,
      requiredView: "trip",
    },
  ];
};

export const buildGuestTourSteps = ({
  locale,
  canViewVisits,
}: {
  locale: Locale;
  canViewVisits: boolean;
}): TourStep[] => {
  const copy =
    locale === "es"
      ? {
          headerTitle: "Bienvenido al panel compartido",
          headerBody:
            "Esta vista es de solo lectura. Puedes seguir el plan completo de la temporada sin modificar ningun dato. Navega libremente por las escalas, el mapa y las visitas.",
          navTitle: "Navegacion del panel",
          navBody:
            "Usa estas pestanas para moverte entre la vista de escalas del viaje y las visitas de la temporada. Todo lo que ves es de consulta.",
          timelineTitle: "Timeline de la temporada",
          timelineBody:
            "El timeline te da una vision completa de la temporada con escalas, visitas y disponibilidad en formato cronologico.",
          detailTitle: "Detalle de escalas",
          detailBody:
            "Aqui ves el listado estructurado de todas las escalas del viaje con sus fechas, lugares y estado. Es una vista de consulta.",
          mapTitle: "Mapa del recorrido",
          mapBody:
            "El mapa situa visualmente el recorrido y los puntos clave de la temporada. Selecciona una escala en la tabla para verla destacada.",
          visitsViewTitle: "Vista de visitas",
          visitsViewBody:
            "Desde la pestana Visitas puedes consultar los invitados previstos, sus fechas de embarque y desembarque y los lugares.",
          visitsCardTitle: "Visitas de la temporada",
          visitsCardBody:
            "Aqui ves todas las visitas registradas con sus fechas, lugares y estado. Vista de consulta.",
        }
      : {
          headerTitle: "Welcome to the shared workspace",
          headerBody:
            "This view is read-only. You can follow the full season plan without modifying any data. Browse freely through trip segments, the map, and visits.",
          navTitle: "Workspace navigation",
          navBody:
            "Use these tabs to move between the trip view and the season visits view. Everything here is for consultation only.",
          timelineTitle: "Season timeline",
          timelineBody:
            "The timeline gives you a complete chronological view of the season with trip segments, visits, and availability.",
          detailTitle: "Trip segment details",
          detailBody:
            "Here you see the structured list of all trip segments with their dates, places, and status. This is a read-only view.",
          mapTitle: "Route map",
          mapBody:
            "The map places the route and key season points visually. Select a trip segment in the table to see it highlighted.",
          visitsViewTitle: "Visits view",
          visitsViewBody:
            "From the Visits tab you can review the planned guests, their boarding and disembark dates, and the places involved.",
          visitsCardTitle: "Season visits",
          visitsCardBody:
            "Here you see all recorded visits with their dates, places, and status. Read-only view.",
        };

  return [
  {
    target: '[data-tour="guest-header"]',
    title: copy.headerTitle,
    body: copy.headerBody,
  },
  {
    target: '[data-tour="boat-nav"]',
    title: copy.navTitle,
    body: copy.navBody,
  },
  {
    target: '[data-tour="boat-timeline"]',
    title: copy.timelineTitle,
    body: copy.timelineBody,
  },
  {
    target: '[data-tour="boat-detail"]',
    title: copy.detailTitle,
    body: copy.detailBody,
    requiredView: "trip",
  },
  {
    target: '[data-tour="boat-map"]',
    title: copy.mapTitle,
    body: copy.mapBody,
    requiredView: "trip",
  },
  ...(canViewVisits
    ? [
        {
          target: '[data-tour="boat-nav"]',
          title: copy.visitsViewTitle,
          body: copy.visitsViewBody,
        },
        {
          target: '[data-tour="boat-visits-card"]',
          title: copy.visitsCardTitle,
          body: copy.visitsCardBody,
          requiredView: "visits" as const,
        },
      ]
    : []),
  ];
};