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
  width: number;
  height: number;
} | null;

type GuestOnboardingTourProps = {
  enabled: boolean;
  canViewVisits: boolean;
  variant?: "guest" | "member";
  resetKey?: string;
};

export function GuestOnboardingTour({
  enabled,
  canViewVisits,
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

  const steps = useMemo<TourStep[]>(
    () =>
      [
        ...(variant === "guest"
          ? [
              {
                target: '[data-tour="guest-header"]',
                title: "Bienvenido",
                body:
                  "Esta vista es de solo lectura. Desde aqui puedes seguir el plan completo de la temporada sin modificar datos.",
              },
            ]
          : []),
        {
          target: '[data-tour="boat-nav"]',
          title: "Tramos",
          body:
            "Desde aqui puedes moverte por la planificacion principal del barco y volver siempre al listado de tramos.",
        },
        {
          target: '[data-tour="boat-nav"]',
          title: "Visitas",
          body: canViewVisits
            ? "Desde la pestana Visitas puedes abrir la vista de invitados para revisar incorporaciones, fechas, lugares de embarque y desembarque, y movimientos previstos durante la temporada."
            : "Si este acceso incluyera Visitas, tambien podrias cambiar a esa vista desde aqui.",
        },
        {
          target: '[data-tour="boat-timeline"]',
          title: "Timeline",
          body:
            "El timeline te da una vision rapida de toda la temporada. Si pausas el raton sobre una barra de un tramo o de una visita, apareceran mas detalles.",
        },
        {
          target: '[data-tour="boat-detail"]',
          title: isVisitsView ? "Detalle de visitas" : "Detalle",
          body: isVisitsView
            ? "En esta zona ves el detalle de las visitas: invitado, fechas, lugares y estado. Si vuelves a Tramos, este panel cambia para mostrar el plan de navegacion."
            : "Aqui ves el detalle estructurado de los tramos. Cuando cambies a Visitas, este mismo panel te mostrara las incorporaciones previstas, con fechas, lugares y estado.",
        },
        {
          target: '[data-tour="boat-map"]',
          title: "Mapa",
          body:
            "El mapa ayuda a ubicar visualmente el recorrido y los puntos importantes de la temporada.",
        },
      ] satisfies TourStep[],
    [canViewVisits, isVisitsView, variant],
  );

  useEffect(() => {
    setIsOpen(enabled);
    setStepIndex(0);
  }, [enabled, resetKey]);

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
    element.scrollIntoView({ block: "center", behavior: "smooth" });

    const updateRect = () => {
      const bounds = element.getBoundingClientRect();
      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      element.setAttribute("data-tour-active", "false");
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, stepIndex, steps]);

  const closeTour = () => {
    document
      .querySelectorAll<HTMLElement>("[data-tour-active='true']")
      .forEach((node) => node.setAttribute("data-tour-active", "false"));

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
    const fitsBelow = rect.top + rect.height + 18 + estimatedHeight < window.innerHeight - margin;
    const top = fitsBelow
      ? rect.top + rect.height + 18
      : Math.max(margin, rect.top - estimatedHeight - 18);
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
      {rect ? (
        <div
          className="tour-highlight"
          style={{
            top: `${rect.top - 8}px`,
            left: `${rect.left - 8}px`,
            width: `${rect.width + 16}px`,
            height: `${rect.height + 16}px`,
          }}
        />
      ) : null}
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
