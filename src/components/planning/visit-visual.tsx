"use client";

import NextImage from "next/image";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { getVisitDisplayName, type VisitPanelDisplayMode, type VisitView } from "@/lib/planning";

type RenderVisitIdentityOptions = {
  badgeClassName: string;
  badgeSize: number;
  identityClassName?: string;
  imageOnlyClassName?: string;
  interactiveBadge?: boolean;
  bareImageMode?: boolean;
  onOpenImage?: (visit: VisitView) => void;
};

const renderVisitBadge = (
  visit: VisitView,
  options: {
    badgeClassName: string;
    badgeSize: number;
    interactive?: boolean;
    onOpenImage?: (visit: VisitView) => void;
  },
): ReactNode => {
  const className = `${options.badgeClassName} is-${visit.status}`;

  if (visit.image_url) {
    if (options.interactive && options.onOpenImage) {
      return (
        <button
          aria-label={getVisitDisplayName(visit, "Visit image")}
          className={`${className} timeline-visit-badge-button`}
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            options.onOpenImage?.(visit);
          }}
          type="button"
        >
          <NextImage
            alt=""
            height={options.badgeSize}
            sizes={`${options.badgeSize}px`}
            src={visit.image_url}
            unoptimized
            width={options.badgeSize}
          />
        </button>
      );
    }

    return (
      <span className={className} aria-hidden="true">
        <NextImage
          alt=""
          height={options.badgeSize}
          sizes={`${options.badgeSize}px`}
          src={visit.image_url}
          unoptimized
          width={options.badgeSize}
        />
      </span>
    );
  }

  if (visit.badge_emoji) {
    return (
      <span className={className} aria-hidden="true">
        <span>{visit.badge_emoji}</span>
      </span>
    );
  }

  return null;
};

export const renderVisitIdentity = (
  visit: VisitView,
  fallbackLabel: string,
  mode: VisitPanelDisplayMode,
  options: RenderVisitIdentityOptions,
) => {
  const badge = renderVisitBadge(visit, {
    badgeClassName: options.badgeClassName,
    badgeSize: options.badgeSize,
    interactive: options.interactiveBadge,
    onOpenImage: options.onOpenImage,
  });
  const label = getVisitDisplayName(visit, fallbackLabel);
  const hasBadge = Boolean(badge);

  if (mode === "image") {
    if (hasBadge) {
      if (options.bareImageMode) {
        return badge;
      }

      return <span className={options.imageOnlyClassName ?? options.identityClassName}>{badge}</span>;
    }

    if (options.identityClassName) {
      return <span className={options.identityClassName}>{label}</span>;
    }

    return <span>{label}</span>;
  }

  if (mode === "both" && hasBadge) {
    return (
      <span className={options.identityClassName}>
        {badge}
        <span>{label}</span>
      </span>
    );
  }

  if (options.identityClassName) {
    return <span className={options.identityClassName}>{label}</span>;
  }

  return <span>{label}</span>;
};