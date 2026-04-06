"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildGuestTourSteps,
  buildMemberTourSteps,
  canExecuteOnboardingPhaseAction,
  type TourStep,
} from "@/lib/onboarding";
import type { OnboardingStep } from "@/types/database";

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
    if (variant === "member") {
      return buildMemberTourSteps({
        memberPhase,
        canViewVisits,
        canManageUsers,
        canShare,
        canEditBoat,
        isReadOnly,
        hasSegments,
        hasVisits,
      });
      }
    return buildGuestTourSteps({ canViewVisits });
  }, [canEditBoat, canManageUsers, canShare, canViewVisits, hasSegments, hasVisits, isReadOnly, memberPhase, variant]);

  const step = steps[stepIndex];
  const requiredView = step?.requiredView;
  const isRequiredViewActive = !requiredView || (requiredView === "visits" ? isVisitsView : !isVisitsView);
  const isWaitingForRequiredView = Boolean(isOpen && requiredView && !isRequiredViewActive);

  useEffect(() => {
    if (!isOpen || !requiredView) {
      return;
    }

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
    isRequiredViewActive,
    isVisitsView,
    pathname,
    requiredView,
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

    if (isWaitingForRequiredView) {
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
  }, [isOpen, isWaitingForRequiredView, stepIndex, steps]);

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

  if (!isOpen || isWaitingForRequiredView) {
    return null;
  }

  const isLastStep = stepIndex === steps.length - 1;
  const canRunPhaseAction =
    variant === "member" && canExecuteOnboardingPhaseAction({ phase: memberPhase, canEditBoat });
  const isConfigureBoatPhase = canRunPhaseAction && memberPhase === "configure_boat";
  const isCreateSeasonPhase = canRunPhaseAction && memberPhase === "create_season";
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
