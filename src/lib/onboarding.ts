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
  memberPhase?: OnboardingStep | null;
  canViewVisits: boolean;
  canManageUsers: boolean;
  canShare: boolean;
  canEditBoat: boolean;
  isReadOnly: boolean;
  hasSegments: boolean;
  hasVisits: boolean;
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

export const buildMemberTourSteps = ({
  memberPhase,
  canViewVisits,
  canManageUsers,
  canShare,
  canEditBoat,
  isReadOnly,
  hasSegments,
  hasVisits,
}: MemberTourStepsInput): TourStep[] => {
  if (memberPhase === "configure_boat") {
    return [
      {
        target: '[data-tour="sidebar-boat-settings"]',
        title: "Configurar barco",
        body: canEditBoat
          ? "El primer paso es revisar y completar los datos del barco. Abre la configuracion, rellena el modelo, año y puerto base, y guarda. Cuando cierres, el tour continuara automaticamente."
          : "Antes de empezar, revisa los datos del barco asignado. Un gestor debe haberlos completado para que puedas comenzar.",
      },
    ];
  }

  if (memberPhase === "create_season") {
    return [
      {
        target: '[data-tour="next-step-card"]',
        title: "Crear la primera temporada",
        body: canEditBoat
          ? "La temporada define el periodo de navegacion: fechas de inicio y fin, nombre del año. Sin temporada no hay timeline. Crea la primera desde esta card para continuar."
          : "Todavia no existe ninguna temporada para este barco. Sin temporada no hay timeline ni visitas que mostrar. Un gestor o editor del barco debe crearla antes de que puedas continuar.",
      },
    ];
  }

  if (isReadOnly) {
    return [
      {
        target: '[data-tour="boat-timeline"]',
        title: "Timeline de la temporada",
        body: "El timeline muestra el plan completo de la temporada: escalas del viaje, visitas de invitados y disponibilidad del barco. Es de solo lectura para tu perfil.",
      },
      {
        target: '[data-tour="planning-control-bar"]',
        title: "Controles de vista",
        body: "Puedes ajustar la escala temporal del timeline (temporada completa, mes o semana) y cambiar entre vista de tabla, mapa o ambas.",
      },
      {
        target: '[data-tour="boat-detail"]',
        title: "Escalas del viaje",
        body: "Aqui puedes consultar todas las escalas planificadas con sus fechas, lugares y estado. Esta informacion es de solo consulta para tu perfil.",
        requiredView: "trip",
      },
      {
        target: '[data-tour="boat-map"]',
        title: "Mapa del recorrido",
        body: "El mapa situa visualmente el recorrido y los puntos clave de la temporada. Puedes seleccionar una escala para ver su ubicacion destacada.",
        requiredView: "trip",
      },
      ...(canViewVisits
        ? [
            {
              target: '[data-tour="boat-visits-card"]',
              title: "Visitas de la temporada",
              body: "En esta card ves todas las visitas registradas: quien viene, en que fechas y desde donde embarca y desembarca. Modo consulta.",
              requiredView: "visits" as const,
            },
          ]
        : []),
    ];
  }

  return [
    {
      target: '[data-tour="boat-timeline"]',
      title: "Timeline de la temporada",
      body: hasSegments
        ? "El timeline muestra el plan completo. Las barras del viaje estan en la fila superior. Debajo aparecen las visitas agrupadas por persona, la disponibilidad calculada y los periodos bloqueados."
        : "El timeline es el corazon del panel. Cuando añadas escalas y visitas, aqui veras una vision completa de la temporada de un vistazo.",
    },
    {
      target: '[data-tour="planning-control-bar"]',
      title: "Controles del timeline",
      body: "Aqui ajustas la escala temporal (temporada, mes o semana), cambias entre tabla + mapa, solo tabla o solo mapa, y activas o desactivas las capas de visitas, disponibilidad y fechas bloqueadas.",
    },
    {
      target: '[data-tour="timeline-layers"]',
      title: "Capas del timeline",
      body: "Cada capa controla que grupo de filas se muestra. Visitas muestra las personas agrupadas. Disponibilidad calcula los huecos libres del barco. Bloqueado marca periodos cerrados por mantenimiento u otros motivos.",
    },
    {
      target: '[data-tour="boat-detail"]',
      title: "Escalas del viaje",
      body: canEditBoat
        ? "Aqui creas y editas las escalas: zona de navegacion, fechas, estado y ubicaciones. Cada escala que añadas aparecera inmediatamente en el timeline."
        : "Aqui consultas el detalle de las escalas planificadas con fechas, lugares y estado de cada una.",
      requiredView: "trip",
    },
    {
      target: '[data-tour="boat-map"]',
      title: "Mapa del recorrido",
      body: "El mapa situa visualmente todas las escalas y visitas. Selecciona cualquier elemento del timeline o la tabla para verlo destacado en el mapa.",
      requiredView: "trip",
    },
    ...(canViewVisits
      ? [
          {
            target: '[data-tour="boat-visits-card"]',
            title: "Visitas de la temporada",
            body: canEditBoat
              ? hasVisits
                ? "Aqui gestionas las visitas registradas. Puedes editar fechas, lugares de embarque y desembarque, estado y notas. Cada visita aparece como una fila en el timeline con su nombre."
                : "Aqui añadiras las visitas de la temporada. Cada visita necesita nombre, fechas de embarque y desembarque. Una vez creada, aparece automaticamente en el timeline agrupada por nombre."
              : "Consulta las visitas previstas con sus fechas, lugares y estado actual.",
            requiredView: "visits" as const,
          },
        ]
      : []),
    {
      target: '[data-tour="availability-card"]',
      title: "Disponibilidad y bloqueos",
      body: "Bajo la tabla principal encontraras la disponibilidad calculada automaticamente (periodos libres segun las escalas y visitas) y la seccion de fechas bloqueadas, donde puedes cerrar periodos por mantenimiento o cualquier otra razon.",
      requiredView: "trip",
    },
    ...(canShare
      ? [
          {
            target: '[data-tour="sidebar-invite"]',
            title: "Invitar tripulantes",
            body: "Desde Invitar generas un enlace de acceso directo para invitados. El enlace no requiere contraseña y da acceso al panel compartido en modo consulta, con la visibilidad que tu configures.",
          },
        ]
      : []),
    ...(canManageUsers
      ? [
          {
            target: '[data-tour="sidebar-users"]',
            title: "Gestionar miembros",
            body: "En Miembros creas otras cuentas para el barco y les asignas nivel lector o editor. Desde ahi gestionas sus datos y accesos sin afectar a tus propios permisos.",
          },
        ]
      : []),
  ];
};

export const buildGuestTourSteps = ({ canViewVisits }: { canViewVisits: boolean }): TourStep[] => [
  {
    target: '[data-tour="guest-header"]',
    title: "Bienvenido al panel compartido",
    body: "Esta vista es de solo lectura. Puedes seguir el plan completo de la temporada sin modificar ningun dato. Navega libremente por las escalas, el mapa y las visitas.",
  },
  {
    target: '[data-tour="boat-nav"]',
    title: "Navegacion del panel",
    body: "Usa estas pestanas para moverte entre la vista de escalas del viaje y las visitas de la temporada. Todo lo que ves es de consulta.",
  },
  {
    target: '[data-tour="boat-timeline"]',
    title: "Timeline de la temporada",
    body: "El timeline te da una vision completa de la temporada con escalas, visitas y disponibilidad en formato cronologico.",
  },
  {
    target: '[data-tour="boat-detail"]',
    title: "Detalle de escalas",
    body: "Aqui ves el listado estructurado de todas las escalas del viaje con sus fechas, lugares y estado. Es una vista de consulta.",
    requiredView: "trip",
  },
  {
    target: '[data-tour="boat-map"]',
    title: "Mapa del recorrido",
    body: "El mapa situa visualmente el recorrido y los puntos clave de la temporada. Selecciona una escala en la tabla para verla destacada.",
    requiredView: "trip",
  },
  ...(canViewVisits
    ? [
        {
          target: '[data-tour="boat-nav"]',
          title: "Vista de visitas",
          body: "Desde la pestana Visitas puedes consultar los invitados previstos, sus fechas de embarque y desembarque y los lugares.",
        },
        {
          target: '[data-tour="boat-visits-card"]',
          title: "Visitas de la temporada",
          body: "Aqui ves todas las visitas registradas con sus fechas, lugares y estado. Vista de consulta.",
          requiredView: "visits" as const,
        },
      ]
    : []),
];