"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OnboardingStep } from "@/types/database";

type TourStep = {
  target: string;
  title: string;
  body: string;
  requiredView?: "trip" | "visits";
};

type RectState = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  inSidebar: boolean;
} | null;

type GuestOnboardingTourProps = {
  enabled: boolean;
  canViewVisits: boolean;
  canManageUsers?: boolean;
  canShare?: boolean;
  canEditBoat?: boolean;
  /** True if the user has no edit, manage, or share permissions */
  isReadOnly?: boolean;
  /** Whether the season has any trip segments already */
  hasSegments?: boolean;
  /** Whether the season has any visits already */
  hasVisits?: boolean;
  memberPhase?: OnboardingStep | null;
  onDismiss?: () => void;
  variant?: "guest" | "member";
  resetKey?: string;
};

export function GuestOnboardingTour({
  enabled,
  canViewVisits,
  canManageUsers = false,
  canShare = false,
  canEditBoat = false,
  isReadOnly = false,
  hasSegments = false,
  hasVisits = false,
  memberPhase,
  onDismiss,
  variant = "guest",
  resetKey,
}: GuestOnboardingTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(enabled);
  const [stepIndex, setStepIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverHeightRef = useRef(220);
  const isVisitsView = pathname.includes("/visits") || searchParams.get("view") === "visits";

  const steps = useMemo<TourStep[]>(() => {
    // -----------------------------------------------------------------------
    // MEMBER variant
    // -----------------------------------------------------------------------
    if (variant === "member") {
      // Phase 1: configure_boat
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

      // Phase 2: create_season
      if (memberPhase === "create_season") {
        return [
          {
            target: '[data-tour="next-step-card"]',
            title: "Crear la primera temporada",
            body: "La temporada define el periodo de navegacion: fechas de inicio y fin, nombre del año. Sin temporada no hay timeline. Crea la primera desde esta card para continuar.",
          },
        ];
      }

      // Phase 3: full_tour — READ-ONLY member
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

      // Phase 3: full_tour — EDITOR/MANAGER member
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
    }

    // -----------------------------------------------------------------------
    // GUEST variant (token access)
    // -----------------------------------------------------------------------
    return [
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
  }, [canEditBoat, canManageUsers, canShare, canViewVisits, hasSegments, hasVisits, isReadOnly, memberPhase, variant]);

  useEffect(() => {
    const requiredView = steps[stepIndex]?.requiredView;

    if (!isOpen || !requiredView) {
      return;
    }

    const isRequiredViewActive =
      requiredView === "visits" ? isVisitsView : !isVisitsView;

    if (isRequiredViewActive) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (variant === "guest" || !pathname.includes("/trip")) {
      nextParams.set("view", requiredView);
      const nextUrl = `${pathname}?${nextParams.toString()}`;
      router.replace(nextUrl, { scroll: false });
      return;
    }

    const nextUrl =
      requiredView === "visits"
        ? pathname.includes("/visits")
          ? pathname
          : pathname.replace(/\/trip$/, "/visits")
        : pathname.replace(/\/visits$/, "/trip");
    router.replace(nextUrl, { scroll: false });
  }, [
    isOpen,
    isVisitsView,
    pathname,
    router,
    searchParams,
    stepIndex,
    steps,
    variant,
  ]);

  useEffect(() => {
    setIsOpen(enabled);
    setStepIndex(0);
  }, [enabled, memberPhase, resetKey]);

  useEffect(() => {
    if (variant === "member") {
      return;
    }

    const currentTarget = steps[stepIndex]?.target ?? "";
    const shouldOpenSidebar = isOpen && currentTarget.includes('data-tour="sidebar-');

    if (shouldOpenSidebar) {
      document.body.setAttribute("data-tour-sidebar-open", "true");
    } else {
      document.body.removeAttribute("data-tour-sidebar-open");
    }

    return () => {
      document.body.removeAttribute("data-tour-sidebar-open");
    };
  }, [isOpen, stepIndex, steps, variant]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selector = steps[stepIndex]?.target;
    const element = selector ? document.querySelector<HTMLElement>(selector) : null;

    document
      .querySelectorAll<HTMLElement>("[data-tour-active='true']")
      .forEach((node) => node.setAttribute("data-tour-active", "false"));

    if (!element) {
      return;
    }

    element.setAttribute("data-tour-active", "true");

    const computeAndApplyPosition = () => {
      const popover = popoverRef.current;
      if (!popover) return;

      const bounds = element.getBoundingClientRect();
      const rect: RectState = {
        top: bounds.top,
        left: bounds.left,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
        inSidebar: Boolean(element.closest(".app-sidebar")),
      };

      const popoverHeight = popoverHeightRef.current;
      const popoverWidth = Math.min(360, window.innerWidth - 32);
      const margin = 16;

      let top: number;
      let left: number;

      if (rect.inSidebar) {
        const rootStyles = window.getComputedStyle(document.documentElement);
        const rawSidebarWidth = rootStyles.getPropertyValue("--sidebar-w").trim();
        const sidebarWidth = Number.parseInt(rawSidebarWidth, 10) || 220;
        const preferredLeft = Math.max(sidebarWidth + 24, rect.right + 18);
        const fitsRight = preferredLeft + popoverWidth <= window.innerWidth - margin;
        const centeredTop = rect.top + rect.height / 2 - popoverHeight / 2;
        top = fitsRight
          ? Math.max(margin, Math.min(centeredTop, window.innerHeight - popoverHeight - margin))
          : Math.max(margin, centeredTop);
        left = fitsRight
          ? preferredLeft
          : Math.max(margin, Math.min(sidebarWidth + 12, window.innerWidth - popoverWidth - margin));
      } else if (selector === '[data-tour="boat-map"]') {
        const preferredLeft = rect.left - popoverWidth - 18;
        const fitsLeft = preferredLeft >= margin;
        top = Math.max(margin, Math.min(rect.top + rect.height / 2 - popoverHeight / 2, window.innerHeight - popoverHeight - margin));
        left = fitsLeft
          ? preferredLeft
          : Math.max(margin, Math.min(rect.right + 18, window.innerWidth - popoverWidth - margin));
      } else if (
        selector === '[data-tour="boat-detail"]' ||
        selector === '[data-tour-detail="boat-detail"]' ||
        selector === '[data-tour="boat-visits-card"]'
      ) {
        const preferredLeft = rect.right + 18;
        const fitsRight = preferredLeft + popoverWidth <= window.innerWidth - margin;
        const fallbackLeft = rect.left - popoverWidth - 18;
        top = Math.max(margin, Math.min(rect.top + rect.height / 2 - popoverHeight / 2, window.innerHeight - popoverHeight - margin));
        left = fitsRight
          ? preferredLeft
          : Math.max(margin, Math.min(fallbackLeft, window.innerWidth - popoverWidth - margin));
      } else {
        const fitsBelow = rect.bottom + 18 + popoverHeight < window.innerHeight - margin;
        const fitsAbove = rect.top - popoverHeight - 18 >= margin;
        top = fitsBelow
          ? rect.bottom + 18
          : fitsAbove
            ? rect.top - popoverHeight - 18
            : Math.max(margin, window.innerHeight - popoverHeight - margin);
        left = Math.max(margin, Math.min(rect.left, window.innerWidth - popoverWidth - margin));
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    };

    element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });

    let frameId = 0;
    const syncPosition = () => {
      computeAndApplyPosition();
      frameId = window.requestAnimationFrame(syncPosition);
    };

    frameId = window.requestAnimationFrame(syncPosition);
    window.addEventListener("resize", computeAndApplyPosition);

    return () => {
      element.setAttribute("data-tour-active", "false");
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", computeAndApplyPosition);
    };
  }, [isOpen, stepIndex, steps]);

  const dismissTour = async () => {
    document
      .querySelectorAll<HTMLElement>("[data-tour-active='true']")
      .forEach((node) => node.setAttribute("data-tour-active", "false"));

    document.body.removeAttribute("data-tour-sidebar-open");
    setIsOpen(false);

    if (variant === "guest") {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("welcome");
      const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
      return;
    }

    onDismiss?.();
  };

  const step = steps[stepIndex];

  useEffect(() => {
    if (!isOpen || !popoverRef.current) {
      return;
    }

    const node = popoverRef.current;
    const updateHeight = () => {
      popoverHeightRef.current = node.offsetHeight || 220;
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isOpen, stepIndex, step.title, step.body]);

  if (!isOpen) {
    return null;
  }

  const isLastStep = stepIndex === steps.length - 1;
  const isConfigureBoatPhase = variant === "member" && memberPhase === "configure_boat";
  const isCreateSeasonPhase = variant === "member" && memberPhase === "create_season";
  const isPhaseAction = isConfigureBoatPhase || isCreateSeasonPhase;

  const handleMemberPhaseAction = () => {
    if (isConfigureBoatPhase) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("openBoatSettings", "1");
      setIsOpen(false);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      return;
    }

    if (isCreateSeasonPhase) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("setup", "create-season");
      setIsOpen(false);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }
  };

  return (
    <>
      <div className="tour-overlay" />
      <div className="tour-popover" ref={popoverRef}>
        <p className="tour-popover__step">Paso {stepIndex + 1} de {steps.length}</p>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-popover__actions">
          {/* Cerrar: always present, permanently dismisses the tour */}
          <button className="secondary-button" onClick={() => void dismissTour()} type="button">
            Cerrar
          </button>

          {/* Anterior: available on non-first steps when not in a phase action */}
          {stepIndex > 0 && !isPhaseAction ? (
            <button
              className="secondary-button"
              onClick={() => setStepIndex((value) => value - 1)}
              type="button"
            >
              Anterior
            </button>
          ) : null}

          {/* Primary action: phase-specific or Siguiente/Terminar */}
          <button
            className="primary-button"
            onClick={() => {
              if (isPhaseAction) {
                handleMemberPhaseAction();
                return;
              }
              if (isLastStep) {
                void fetch("/api/onboarding/complete", { method: "POST" }).then(() => {
                  setIsOpen(false);
                  router.refresh();
                });
              } else {
                setStepIndex((value) => value + 1);
              }
            }}
            type="button"
          >
            {isConfigureBoatPhase
              ? "Abrir configuracion"
              : isCreateSeasonPhase
                ? "Crear temporada"
                : isLastStep
                  ? "Terminar"
                  : "Siguiente"}
          </button>
        </div>
      </div>
    </>
  );
}
