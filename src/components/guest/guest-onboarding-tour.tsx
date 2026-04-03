"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TourStep = {
  target: string;
  title: string;
  body: string;
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
  const [rect, setRect] = useState<RectState>(null);
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
        {
          target: '[data-tour="boat-timeline"]',
          title: "Timeline",
          body:
            "El timeline te da una vision general de la temporada y te ayuda a entender rapidamente como encajan tramos y visitas.",
        },
        {
          target: isVisitsView
            ? '[data-tour-detail="boat-detail"]'
            : '[data-tour="boat-detail"]',
          title: isVisitsView ? "Detalle de visitas" : "Detalle de tramos",
          body: isVisitsView
            ? "En esta zona gestionas el detalle de las visitas. Aqui puedes revisar la informacion de cada invitado y crear, modificar o ajustar fechas, lugares y estado."
            : "Aqui gestionas el detalle de los tramos. Es la zona para crear nuevos, editar el plan existente y ajustar fechas, estados y ubicaciones.",
        },
        {
          target: '[data-tour="boat-map"]',
          title: "Mapa",
          body:
            "El mapa te ayuda a situar visualmente el recorrido y los puntos clave de la temporada mientras gestionas el plan.",
        },
        ...(canViewVisits
          ? [
              {
                target: '[data-tour="boat-visits-card"]',
                title: "Card de visitas",
                body:
                  "Esta card es el equivalente de gestion para las visitas: aqui puedes crear nuevas, modificar las existentes y mantener claro quien viene, cuando y desde donde.",
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
        target: '[data-tour="boat-nav"]',
        title: "Visitas",
        body: canViewVisits
          ? "Desde la pestana Visitas puedes abrir la vista donde consultar invitados previstos, fechas, lugares de embarque y desembarque y movimientos de la temporada."
          : "Este acceso no incluye la vista de Visitas. Si la incluyera, podrias abrirla desde aqui en modo de solo lectura.",
      },
      {
        target: '[data-tour="boat-timeline"]',
        title: "Timeline",
        body:
          "El timeline te permite ver de un vistazo el plan de la temporada. Si pausas el raton sobre una barra, apareceran detalles adicionales, siempre en modo consulta.",
      },
      {
        target: isVisitsView
          ? '[data-tour-detail="boat-detail"]'
          : '[data-tour="boat-detail"]',
        title: isVisitsView ? "Detalle de visitas" : "Detalle de tramos",
        body: isVisitsView
          ? "En esta zona puedes ver el detalle de las visitas: invitado, fechas, lugares y estado. Es una vista informativa, sin opciones de edicion."
          : "Aqui puedes ver el detalle estructurado de los tramos del viaje. Es una vista de consulta para entender mejor el plan, sin modificarlo.",
      },
      {
        target: '[data-tour="boat-map"]',
        title: "Mapa",
        body:
          "El mapa te ayuda a ubicar visualmente el recorrido y los puntos importantes de la temporada, siempre en modo de solo lectura.",
      },
      ...(canViewVisits
        ? [
            {
              target: '[data-tour="boat-visits-card"]',
              title: "Card de visitas",
              body:
                "Aqui puedes consultar de un vistazo las visitas previstas, con sus fechas, lugares y estado, sin posibilidad de editar.",
            },
          ]
        : []),
    ];
  }, [canEditBoat, canManageUsers, canShare, canViewVisits, isVisitsView, variant]);

  const visitsStepIndex = useMemo(
    () =>
      steps.findIndex(
        (step) => step.target === '[data-tour="boat-visits-card"]',
      ),
    [steps],
  );

  useEffect(() => {
    if (!isOpen || !canViewVisits || stepIndex !== visitsStepIndex) {
      return;
    }

    if (isVisitsView) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (variant === "guest") {
      nextParams.set("view", "visits");
      const nextUrl = `${pathname}?${nextParams.toString()}`;
      router.replace(nextUrl, { scroll: false });
      return;
    }

    if (!pathname.includes("/trip")) {
      nextParams.set("view", "visits");
      const nextUrl = `${pathname}?${nextParams.toString()}`;
      router.replace(nextUrl, { scroll: false });
      return;
    }

    const nextUrl = pathname.includes("/visits")
      ? pathname
      : pathname.replace(/\/trip$/, "/visits");
    router.replace(nextUrl, { scroll: false });
  }, [
    canViewVisits,
    isOpen,
    isVisitsView,
    pathname,
    router,
    searchParams,
    stepIndex,
    variant,
    visitsStepIndex,
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
      setRect(null);
      return;
    }

    element.setAttribute("data-tour-active", "true");
    const updateRect = () => {
      const bounds = element.getBoundingClientRect();
      setRect({
        top: bounds.top,
        left: bounds.left,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
        inSidebar: Boolean(element.closest(".app-sidebar")),
      });
    };

    element.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: variant === "guest" ? "auto" : "smooth",
    });

    let frameId = 0;
    const syncRect = () => {
      updateRect();
      frameId = window.requestAnimationFrame(syncRect);
    };

    updateRect();
    frameId = window.requestAnimationFrame(syncRect);
    window.addEventListener("resize", updateRect);

    return () => {
      element.setAttribute("data-tour-active", "false");
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateRect);
    };
  }, [isOpen, stepIndex, steps, variant]);

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

  if (!isOpen) {
    return null;
  }

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const popoverStyle = (() => {
    if (!rect || typeof window === "undefined") {
      return undefined;
    }

    const popoverWidth = Math.min(360, window.innerWidth - 32);
    const estimatedHeight = 220;
    const margin = 16;

    if (rect.inSidebar) {
      const rootStyles = window.getComputedStyle(document.documentElement);
      const rawSidebarWidth = rootStyles.getPropertyValue("--sidebar-w").trim();
      const sidebarWidth = Number.parseInt(rawSidebarWidth, 10) || 220;
      const preferredLeft = Math.max(sidebarWidth + 24, rect.right + 18);
      const fitsRight = preferredLeft + popoverWidth <= window.innerWidth - margin;
      const centeredTop = rect.top + rect.height / 2 - estimatedHeight / 2;
      const top = fitsRight
        ? Math.max(margin, Math.min(centeredTop, window.innerHeight - estimatedHeight - margin))
        : Math.max(margin, rect.top - estimatedHeight - 18);
      const left = fitsRight
        ? preferredLeft
        : Math.max(margin, Math.min(sidebarWidth + 12, window.innerWidth - popoverWidth - margin));

      return {
        top: `${top}px`,
        left: `${left}px`,
      };
    }

    const target = step?.target ?? "";

    if (target === '[data-tour="boat-map"]') {
      const preferredLeft = rect.left - popoverWidth - 18;
      const fitsLeft = preferredLeft >= margin;
      const top = Math.max(
        margin,
        Math.min(
          rect.top + rect.height / 2 - estimatedHeight / 2,
          window.innerHeight - estimatedHeight - margin,
        ),
      );
      const left = fitsLeft
        ? preferredLeft
        : Math.max(
            margin,
            Math.min(rect.right + 18, window.innerWidth - popoverWidth - margin),
          );

      return {
        top: `${top}px`,
        left: `${left}px`,
      };
    }

    if (
      target === '[data-tour="boat-detail"]' ||
      target === '[data-tour-detail="boat-detail"]' ||
      target === '[data-tour="boat-visits-card"]'
    ) {
      const preferredLeft = rect.right + 18;
      const fitsRight = preferredLeft + popoverWidth <= window.innerWidth - margin;
      const fallbackLeft = rect.left - popoverWidth - 18;
      const top = Math.max(
        margin,
        Math.min(
          rect.top + rect.height / 2 - estimatedHeight / 2,
          window.innerHeight - estimatedHeight - margin,
        ),
      );
      const left = fitsRight
        ? preferredLeft
        : Math.max(
            margin,
            Math.min(fallbackLeft, window.innerWidth - popoverWidth - margin),
          );

      return {
        top: `${top}px`,
        left: `${left}px`,
      };
    }

    const fitsBelow = rect.bottom + 18 + estimatedHeight < window.innerHeight - margin;
    const fitsAbove = rect.top - estimatedHeight - 18 >= margin;
    const top = fitsBelow
      ? rect.bottom + 18
      : fitsAbove
        ? rect.top - estimatedHeight - 18
        : Math.max(margin, window.innerHeight - estimatedHeight - margin);
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - popoverWidth - margin),
    );

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  })();

  return (
    <>
      <div className="tour-overlay" />
      <div className="tour-popover" style={popoverStyle}>
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
