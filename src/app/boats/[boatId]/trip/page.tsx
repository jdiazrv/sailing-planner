import { BoatNav } from "@/components/boats/boat-nav";
import { MapPanel } from "@/components/planning/map-panel";
import { Timeline } from "@/components/planning/timeline";
import { PlaceAutocompleteField } from "@/components/places/place-autocomplete-field";
import { getBoatWorkspace } from "@/lib/boat-data";
import {
  formatLongDate,
  getDefaultSeasonDraft,
  getEmptyTripSegmentDraft,
} from "@/lib/planning";

import { deleteSeason, deleteTripSegment, saveSeason, saveTripSegment } from "../actions";

export default async function BoatTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{
    season?: string;
    status?: string;
  }>;
}) {
  const { boatId } = await params;
  const { season: requestedSeasonId, status } = await searchParams;
  const workspace = await getBoatWorkspace(boatId, requestedSeasonId);
  const canEdit =
    workspace.viewer.isSuperuser || Boolean(workspace.permission?.can_edit);
  const filteredSegments = workspace.tripSegments.filter((segment) =>
    status ? segment.status === status : true,
  );

  const seasonDraft = getDefaultSeasonDraft(
    boatId,
    workspace.selectedSeason?.year ?? new Date().getUTCFullYear(),
  );
  const tripDraft = getEmptyTripSegmentDraft(workspace.selectedSeason);

  return (
    <>
      <BoatNav active="trip" boatId={boatId} />

      <section className="workspace-grid">
        <Timeline
          season={workspace.selectedSeason}
          subtitle="Trip plan, visit overlays and derived availability stay in sync."
          title="Season timeline"
          tripSegments={filteredSegments}
          visits={workspace.visits}
        />

        <aside className="stack">
          <MapPanel
            title="Trip and visit places"
            tripSegments={workspace.tripSegments}
            visits={workspace.visits}
          />
          <article className="dashboard-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Season selector</p>
                <h2>Choose the planning frame</h2>
              </div>
            </div>

            <div className="season-list">
              {workspace.seasons.length ? (
                workspace.seasons.map((season) => (
                  <a
                    className={`season-list__item ${
                      season.id === workspace.selectedSeason?.id ? "is-active" : ""
                    }`}
                    href={`/boats/${boatId}/trip?season=${season.id}`}
                    key={season.id}
                  >
                    <strong>{season.name}</strong>
                    <span>
                      {formatLongDate(season.start_date)} to{" "}
                      {formatLongDate(season.end_date)}
                    </span>
                  </a>
                ))
              ) : (
                <p className="muted">
                  No season exists yet. Create the first one below.
                </p>
              )}
            </div>
          </article>

          {canEdit ? (
            <article className="dashboard-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Create season</p>
                  <h2>Start a new annual plan</h2>
                </div>
              </div>

              <form action={saveSeason} className="editor-form">
                <input name="boat_id" type="hidden" value={boatId} />
                <label>
                  <span>Name</span>
                  <input defaultValue={seasonDraft.name} name="name" required />
                </label>
                <label>
                  <span>Year</span>
                  <input
                    defaultValue={seasonDraft.year}
                    name="year"
                    required
                    type="number"
                  />
                </label>
                <label>
                  <span>Start date</span>
                  <input
                    defaultValue={seasonDraft.start_date}
                    name="start_date"
                    required
                    type="date"
                  />
                </label>
                <label>
                  <span>End date</span>
                  <input
                    defaultValue={seasonDraft.end_date}
                    name="end_date"
                    required
                    type="date"
                  />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea defaultValue={seasonDraft.notes} name="notes" rows={3} />
                </label>
                <button className="primary-button" type="submit">
                  Create season
                </button>
              </form>
            </article>
          ) : null}
        </aside>
      </section>

      {workspace.selectedSeason ? (
        <section className="workspace-grid workspace-grid--single">
          <article className="dashboard-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Trip segments</p>
                <h2>Route blocks and undefined gaps</h2>
              </div>
              <form className="inline-filters" method="get">
                <input name="season" type="hidden" value={workspace.selectedSeason.id} />
                <select defaultValue={status ?? ""} name="status">
                  <option value="">All statuses</option>
                  <option value="tentative">Tentative</option>
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                </select>
                <button className="link-button" type="submit">
                  Filter
                </button>
              </form>
            </div>

            {canEdit ? (
              <form action={saveTripSegment} className="editor-form editor-form--dense">
                <input name="boat_id" type="hidden" value={boatId} />
                <input
                  name="season_id"
                  type="hidden"
                  value={workspace.selectedSeason.id}
                />
                <div className="form-grid">
                  <label>
                    <span>Start</span>
                    <input
                      defaultValue={tripDraft.start_date}
                      name="start_date"
                      required
                      type="date"
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      defaultValue={tripDraft.end_date}
                      name="end_date"
                      required
                      type="date"
                    />
                  </label>
                  <label className="form-grid__wide">
                    <span>Location label</span>
                    <PlaceAutocompleteField
                      externalIdName="external_place_id"
                      labelName="location_label"
                      latitudeName="latitude"
                      longitudeName="longitude"
                      placeholder="Cyclades, Paros port, Athens airport..."
                      sourceName="place_source"
                    />
                  </label>
                  <label>
                    <span>Precision</span>
                    <select defaultValue="zone" name="location_type">
                      <option value="zone">Zone</option>
                      <option value="island">Island</option>
                      <option value="city">City</option>
                      <option value="port">Port</option>
                      <option value="airport">Airport</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select defaultValue="tentative" name="status">
                      <option value="tentative">Tentative</option>
                      <option value="planned">Planned</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </label>
                  <label className="form-grid__wide">
                    <span>Public notes</span>
                    <textarea name="public_notes" rows={2} />
                  </label>
                  <label className="form-grid__wide">
                    <span>Private notes</span>
                    <textarea name="private_notes" rows={2} />
                  </label>
                </div>
                <button className="primary-button" type="submit">
                  Add trip segment
                </button>
              </form>
            ) : null}

            {filteredSegments.length ? (
              <div className="data-sheet">
                <div className="data-sheet__header data-sheet__header--trip">
                  <span>Dates</span>
                  <span>Location</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span>Public notes</span>
                  <span>Private notes</span>
                  <span>Actions</span>
                </div>
                {filteredSegments.map((segment) => (
                  <form
                    action={saveTripSegment}
                    className="data-row data-row--trip"
                    key={segment.id}
                  >
                    <input name="boat_id" type="hidden" value={boatId} />
                    <input name="season_id" type="hidden" value={segment.season_id} />
                    <input name="segment_id" type="hidden" value={segment.id} />
                    <div className="table-stack">
                      <input defaultValue={segment.start_date} name="start_date" type="date" />
                      <input defaultValue={segment.end_date} name="end_date" type="date" />
                    </div>
                    <div className="table-stack">
                      <PlaceAutocompleteField
                        defaultExternalPlaceId={segment.external_place_id}
                        defaultLabel={segment.location_label}
                        defaultLatitude={segment.latitude}
                        defaultLongitude={segment.longitude}
                        externalIdName="external_place_id"
                        labelName="location_label"
                        latitudeName="latitude"
                        longitudeName="longitude"
                        sourceName="place_source"
                      />
                    </div>
                    <div className="table-stack">
                      <select defaultValue={segment.location_type} name="location_type">
                        <option value="zone">Zone</option>
                        <option value="island">Island</option>
                        <option value="city">City</option>
                        <option value="port">Port</option>
                        <option value="airport">Airport</option>
                        <option value="marina">Marina</option>
                        <option value="anchorage">Anchorage</option>
                        <option value="boatyard">Boatyard</option>
                        <option value="other">Other</option>
                      </select>
                      <span className="meta">
                        Source: {segment.place_source === "google_places" ? "Google Places" : segment.place_source}
                      </span>
                    </div>
                    <select defaultValue={segment.status} name="status">
                      <option value="tentative">Tentative</option>
                      <option value="planned">Planned</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <textarea
                      defaultValue={segment.public_notes ?? ""}
                      name="public_notes"
                      rows={3}
                    />
                    <textarea
                      defaultValue={segment.private_notes ?? ""}
                      name="private_notes"
                      rows={3}
                    />
                    <div className="table-actions">
                      <button className="link-button" type="submit">
                        Save
                      </button>
                      <button
                        className="link-button link-button--danger"
                        formAction={deleteTripSegment}
                        type="submit"
                      >
                        Delete
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            ) : (
              <p className="muted">
                No trip segments match the current filter. Undefined periods are
                still visible in the availability lane above.
              </p>
            )}
          </article>
        </section>
      ) : null}

      {workspace.selectedSeason && canEdit ? (
        <section className="workspace-grid workspace-grid--single">
          <article className="dashboard-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Season maintenance</p>
                <h2>Edit or remove the selected season</h2>
              </div>
            </div>
            <form action={saveSeason} className="editor-form editor-form--dense">
              <input name="boat_id" type="hidden" value={boatId} />
              <input
                name="season_id"
                type="hidden"
                value={workspace.selectedSeason.id}
              />
              <div className="form-grid">
                <label className="form-grid__wide">
                  <span>Name</span>
                  <input defaultValue={workspace.selectedSeason.name} name="name" />
                </label>
                <label>
                  <span>Year</span>
                  <input
                    defaultValue={workspace.selectedSeason.year}
                    name="year"
                    type="number"
                  />
                </label>
                <label>
                  <span>Start</span>
                  <input
                    defaultValue={workspace.selectedSeason.start_date}
                    name="start_date"
                    type="date"
                  />
                </label>
                <label>
                  <span>End</span>
                  <input
                    defaultValue={workspace.selectedSeason.end_date}
                    name="end_date"
                    type="date"
                  />
                </label>
                <label className="form-grid__wide">
                  <span>Notes</span>
                  <textarea
                    defaultValue={workspace.selectedSeason.notes ?? ""}
                    name="notes"
                    rows={3}
                  />
                </label>
              </div>
              <div className="entity-card__actions">
                <button className="primary-button" type="submit">
                  Save season
                </button>
                <button
                  className="link-button link-button--danger"
                  formAction={deleteSeason}
                  type="submit"
                >
                  Delete season
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}
    </>
  );
}
