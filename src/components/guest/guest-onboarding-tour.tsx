"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  variant?: "guest" | "member";
  resetKey?: string;
};

export function GuestOnboardingTour({
  enabled,
  canViewVisits,
  canManageUsers = false,
  canShare = false,
  canEditBoat = false,
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
    if (variant === "member") {
      return [
        {
          target: '[data-tour="sidebar-plan"]',
          title: "Panel del barco",
          body:
            "Este panel es el espacio para gestionar la informacion de la temporada. Desde aqui puedes organizar el plan, revisar el contexto del barco y mantener al dia tramos y visitas.",
        },
        ...(canShare
          ? [
              {
                target: '[data-tour="sidebar-invite"]',
                title: "Invitar",
                body:
                  "Desde Invitar generas enlaces de acceso rapido para invitados. Esos enlaces no piden contraseña y sirven para entrar directamente al panel compartido en modo de solo lectura.",
              },
              {
                target: '[data-tour="sidebar-invite"]',
                title: "Invitados frente a usuarios",
                body:
                  "Los invitados entran solo con el enlace y solo pueden ver. Los usuarios, en cambio, tienen cuenta propia, pueden iniciar sesion y reciben permisos como lector, editor o gestor segun lo que les asignes.",
              },
            ]
          : []),
        ...(canEditBoat
          ? [
              {
                target: '[data-tour="sidebar-boat-settings"]',
                title: "Detalles del barco",
                body:
                  "Desde esta opcion puedes actualizar los detalles visibles del barco, como imagen, modelo, puerto base y descripcion, sin salir del espacio de trabajo.",
              },
            ]
          : []),
        ...(canManageUsers
          ? [
              {
                target: '[data-tour="sidebar-users"]',
                title: "Usuarios",
                body:
                  "En Usuarios puedes crear otras cuentas de tu barco y asignarles nivel lector o editor. Desde ahi actualizas sus datos, accesos y contraseñas sin tocar tus propios permisos.",
              },
              {
                target: '[data-tour="sidebar-user-settings"]',
                title: "Tu cuenta",
                body:
                  "Desde Mi cuenta entras directamente a tu ficha dentro de Usuarios. Ahi puedes cambiar tus datos y, si tienes permiso, tambien actualizar tu contraseña con el formulario ya existente.",
              },
            ]
          : []),
        {
          target: '[data-tour="boat-timeline"]',
          title: "Timeline",
          body:
            "El timeline te da una vision general de la temporada y te ayuda a entender rapidamente como encajan tramos y visitas.",
        },
        {
          target: '[data-tour="boat-detail"]',
          title: "Detalle de tramos",
          body:
            "Aqui gestionas el detalle de los tramos. Es la zona para crear nuevos, editar el plan existente y ajustar fechas, estados y ubicaciones.",
          requiredView: "trip" as const,
        },
        {
          target: '[data-tour="boat-map"]',
          title: "Mapa",
          body:
            "El mapa te ayuda a situar visualmente el recorrido y los puntos clave de la temporada mientras gestionas el plan.",
          requiredView: "trip" as const,
        },
        ...(canViewVisits
          ? [
              {
                target: '[data-tour="boat-visits-card"]',
                title: "Card de visitas",
                body:
                  "Esta card es el equivalente de gestion para las visitas: aqui puedes crear nuevas, modificar las existentes y mantener claro quien viene, cuando y desde donde.",
                requiredView: "visits" as const,
              },
            ]
          : []),
      ];
    }

    return [
      {
        target: '[data-tour="guest-header"]',
        title: "Bienvenido",
        body:
          "Esta vista es de solo lectura. Desde aqui puedes seguir el plan completo de la temporada sin modificar ningun dato.",
      },
      {
        target: '[data-tour="boat-nav"]',
        title: "Tramos",
        body:
          "Desde aqui puedes moverte por la planificacion del barco y volver a la vista de tramos. Todo lo que ves en este recorrido es de consulta.",
      },
      {
        target: '[data-tour="boat-timeline"]',
        title: "Timeline",
        body:
          "El timeline te permite ver de un vistazo el plan de la temporada. Si pausas el raton sobre una barra, apareceran detalles adicionales, siempre en modo consulta.",
      },
      {
        target: '[data-tour="boat-detail"]',
        title: "Detalle de tramos",
        body:
          "Aqui puedes ver el detalle estructurado de los tramos del viaje. Es una vista de consulta para entender mejor el plan, sin modificarlo.",
        requiredView: "trip" as const,
      },
      {
        target: '[data-tour="boat-map"]',
        title: "Mapa",
        body:
          "El mapa te ayuda a ubicar visualmente el recorrido y los puntos importantes de la temporada, siempre en modo de solo lectura.",
        requiredView: "trip" as const,
      },
      ...(canViewVisits
        ? [
            {
              target: '[data-tour="boat-nav"]',
              title: "Visitas",
              body:
                "Desde la pestana Visitas puedes abrir la vista donde consultar invitados previstos, fechas, lugares de embarque y desembarque y movimientos de la temporada.",
            },
          ]
        : []),
      ...(canViewVisits
        ? [
          {
            target: '[data-tour="boat-visits-card"]',
            title: "Card de visitas",
            body:
              "Aqui puedes consultar de un vistazo las visitas previstas, con sus fechas, lugares y estado, sin posibilidad de editar.",
            requiredView: "visits" as const,
          },
        ]
        : []),
    ];
  }, [canEditBoat, canManageUsers, canShare, canViewVisits, variant]);

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
  }, [enabled, resetKey]);

  useEffect(() => {
    if (variant !== "member") {
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

    // Instant scroll so the rect is stable before the rAF loop starts
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

  const closeTour = () => {
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
    } else {
      void fetch("/api/onboarding/complete", { method: "POST" });
    }
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

  return (
    <>
      <div className="tour-overlay" />
      <div className="tour-popover" ref={popoverRef}>
        <p className="tour-popover__step">
          Paso {stepIndex + 1} de {steps.length}
        </p>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-popover__actions">
          <button className="secondary-button" onClick={closeTour} type="button">
            Cerrar
          </button>
          {stepIndex > 0 ? (
            <button
              className="secondary-button"
              onClick={() => setStepIndex((value) => value - 1)}
              type="button"
            >
              Anterior
            </button>
          ) : null}
          <button
            className="primary-button"
            onClick={() => {
              if (isLastStep) {
                closeTour();
              } else {
                setStepIndex((value) => value + 1);
              }
            }}
            type="button"
          >
            {isLastStep ? "Terminar" : "Siguiente"}
          </button>
        </div>
      </div>
    </>
  );
}
