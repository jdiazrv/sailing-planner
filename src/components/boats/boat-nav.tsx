import Link from "next/link";

type BoatNavProps = {
  boatId: string;
  active: "trip" | "visits";
};

export const BoatNav = ({ boatId, active }: BoatNavProps) => (
  <nav className="section-nav">
    <Link
      className={active === "trip" ? "is-active" : undefined}
      href={`/boats/${boatId}/trip`}
    >
      Trip & season
    </Link>
    <Link
      className={active === "visits" ? "is-active" : undefined}
      href={`/boats/${boatId}/visits`}
    >
      Visits
    </Link>
  </nav>
);
