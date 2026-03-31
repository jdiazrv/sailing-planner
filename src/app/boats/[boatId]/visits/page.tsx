import { BoatNav } from "@/components/boats/boat-nav";
import { Timeline } from "@/components/planning/timeline";
import { getBoatWorkspace } from "@/lib/boat-data";
import { computeVisitConflicts, getEmptyVisitDraft } from "@/lib/planning";

import { deleteVisit, saveVisit } from "../actions";

export default async function BoatVisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{
    season?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const { boatId } = await params;
  const { season: requestedSeasonId, status, q } = await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const query = q?.trim().toLowerCase() ?? "";
  const filteredVisits = workspace.visits.filter((visit) => {
    const matchesStatus = status ? visit.status === status : true;
    const haystack = [
      visit.visitor_name,
      visit.embark_place_label,
      visit.disembark_place_label,
      visit.public_notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesStatus && (!query || haystack.includes(query));
  });
  const conflicts = computeVisitConflicts(
    workspace.selectedSeason,
    workspace.tripSegments,
    filteredVisits,
  );
  const visitDraft = getEmptyVisitDraft(workspace.selectedSeason);

  return (
    <>
      <BoatNav active="visits" boatId={boatId} />

      <section className="workspace-grid">
        <Timeline
          season={workspace.selectedSeason}
          subtitle="The visit editor and the timeline below share the same live season dataset."
          title="Visit timeline"
          tripSegments={workspace.tripSegments}
          visits={filteredVisits}
        />

        <aside className="stack">
          <article className="dashboard-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Filters</p>
                <h2>Find visits quickly</h2>
              </div>
            </div>
            <form className="editor-form editor-form--dense" method="get">
              {workspace.selectedSeason ? (
                <input name="season" type="hidden" value={workspace.selectedSeason.id} />
              ) : null}
              <label>
                <span>Search</span>
                <input
                  defaultValue={q ?? ""}
                  name="q"
                  placeholder="Visitor, port or notes"
                />
              </label>
              <label>
                <span>Status</span>
                <select defaultValue={status ?? ""} name="status">
                  <option value="">All statuses</option>
                  <option value="tentative">Tentative</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <button className="link-button" type="submit">
                Apply filters
              </button>
            </form>
          </article>

          {conflicts.length ? (
            <article className="dashboard-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Warnings</p>
                  <h2>Review before committing</h2>
                </div>
              </div>
              <ul className="list">
                {conflicts.map((conflict, index) => (
                  <li key={`${conflict.visitId}-${index}`}>{conflict.message}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </aside>
      </section>

      <section className="workspace-grid workspace-grid--single">
        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Visit editor</p>
              <h2>Data and timeline stay together</h2>
            </div>
          </div>

          {workspace.selectedSeason && canEdit ? (
            <form action={saveVisit} className="editor-form editor-form--dense">
              <input name="boat_id" type="hidden" value={boatId} />
              <input
                name="season_id"
                type="hidden"
                value={workspace.selectedSeason.id}
              />
              <div className="form-grid">
                <label className="form-grid__wide">
                  <span>Visitor name</span>
                  <input
                    defaultValue={visitDraft.visitor_name}
                    name="visitor_name"
                    placeholder="Julia and Salvador"
                    required
                  />
                </label>
                <label>
                  <span>Embark date</span>
                  <input
                    defaultValue={visitDraft.embark_date}
                    name="embark_date"
                    required
                    type="date"
                  />
                </label>
                <label>
                  <span>Disembark date</span>
                  <input
                    defaultValue={visitDraft.disembark_date}
                    name="disembark_date"
                    required
                    type="date"
                  />
                </label>
                <label>
                  <span>Embark place</span>
                  <input defaultValue={visitDraft.embark_place_label} name="embark_place_label" />
                </label>
                <label>
                  <span>Disembark place</span>
                  <input defaultValue={visitDraft.disembark_place_label} name="disembark_place_label" />
                </label>
                <label>
                  <span>Status</span>
                  <select defaultValue={visitDraft.status} name="status">
                    <option value="tentative">Tentative</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="form-grid__wide">
                  <span>Public notes</span>
                  <textarea defaultValue={visitDraft.public_notes} name="public_notes" rows={2} />
                </label>
                <label className="form-grid__wide">
                  <span>Private notes</span>
                  <textarea defaultValue={visitDraft.private_notes} name="private_notes" rows={2} />
                </label>
              </div>
              <button className="primary-button" type="submit">
                Add visit
              </button>
            </form>
          ) : null}

          <div className="entity-stack">
            {filteredVisits.length ? (
              filteredVisits.map((visit) => (
                <form action={saveVisit} className="entity-card" key={visit.id}>
                  <input name="boat_id" type="hidden" value={boatId} />
                  <input name="season_id" type="hidden" value={visit.season_id} />
                  <input name="visit_id" type="hidden" value={visit.id} />
                  <div className="entity-card__top">
                    <strong>{visit.visitor_name ?? "Private visit"}</strong>
                    <span className={`status-pill is-${visit.status}`}>
                      {visit.status}
                    </span>
                  </div>
                  <div className="form-grid">
                    <label className="form-grid__wide">
                      <span>Visitor name</span>
                      <input
                        defaultValue={visit.visitor_name ?? ""}
                        disabled={!canEdit}
                        name="visitor_name"
                      />
                    </label>
                    <label>
                      <span>Embark date</span>
                      <input
                        defaultValue={visit.embark_date}
                        disabled={!canEdit}
                        name="embark_date"
                        type="date"
                      />
                    </label>
                    <label>
                      <span>Disembark date</span>
                      <input
                        defaultValue={visit.disembark_date}
                        disabled={!canEdit}
                        name="disembark_date"
                        type="date"
                      />
                    </label>
                    <label>
                      <span>Embark place</span>
                      <input
                        defaultValue={visit.embark_place_label ?? ""}
                        disabled={!canEdit}
                        name="embark_place_label"
                      />
                    </label>
                    <label>
                      <span>Disembark place</span>
                      <input
                        defaultValue={visit.disembark_place_label ?? ""}
                        disabled={!canEdit}
                        name="disembark_place_label"
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        defaultValue={visit.status}
                        disabled={!canEdit}
                        name="status"
                      >
                        <option value="tentative">Tentative</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                    <label className="form-grid__wide">
                      <span>Public notes</span>
                      <textarea
                        defaultValue={visit.public_notes ?? ""}
                        disabled={!canEdit}
                        name="public_notes"
                        rows={2}
                      />
                    </label>
                    <label className="form-grid__wide">
                      <span>Private notes</span>
                      <textarea
                        defaultValue={visit.private_notes ?? ""}
                        disabled={!canEdit}
                        name="private_notes"
                        rows={2}
                      />
                    </label>
                  </div>
                  {canEdit ? (
                    <div className="entity-card__actions">
                      <button className="link-button" type="submit">
                        Save changes
                      </button>
                      <button
                        className="link-button link-button--danger"
                        formAction={deleteVisit}
                        type="submit"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </form>
              ))
            ) : (
              <p className="muted">
                No visits match the current filters. Confirmed visits will mark
                occupied ranges in the timeline above.
              </p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
