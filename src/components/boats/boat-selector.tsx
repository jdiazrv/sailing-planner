import Link from "next/link";

import type { BoatSummary } from "@/lib/planning";

type BoatSelectorProps = {
  boats: BoatSummary[];
  activeBoatId?: string;
};

export const BoatSelector = ({ boats, activeBoatId }: BoatSelectorProps) => (
  <div className="boat-grid">
    {boats.map((boat) => (
      <Link
        className={`boat-card ${boat.boat_id === activeBoatId ? "is-active" : ""}`}
        href={`/boats/${boat.boat_id}/trip`}
        key={boat.boat_id}
      >
        <div className="boat-card__header">
          <p className="eyebrow">Boat</p>
          <span className={`status-pill ${boat.is_active ? "is-good" : "is-muted"}`}>
            {boat.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <h3>{boat.boat_name}</h3>
        <p className="muted">
          {boat.description ?? "No description yet. Open the boat workspace to start planning."}
        </p>
        <p className="meta">
          {boat.home_port ? `Home port: ${boat.home_port}` : "Home port not set"}
        </p>
      </Link>
    ))}
  </div>
);
