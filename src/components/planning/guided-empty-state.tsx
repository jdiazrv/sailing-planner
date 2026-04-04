"use client";

type GuidedEmptyStateProps = {
  icon?: string;
  title: string;
  body: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function GuidedEmptyState({ icon, title, body, action }: GuidedEmptyStateProps) {
  return (
    <div className="guided-empty-state">
      {icon ? <span className="guided-empty-state__icon" aria-hidden="true">{icon}</span> : null}
      <strong className="guided-empty-state__title">{title}</strong>
      <p className="guided-empty-state__body">{body}</p>
      {action ? (
        <button className="primary-button" onClick={action.onClick} type="button">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
