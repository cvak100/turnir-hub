import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import {
  adminEditionService,
  adminTournamentService,
} from "@/modules/admin/services/tournamentService";
import {
  eventTypeService,
  matchEventService,
  type EventTypeRef,
  type MatchEventListItem,
} from "@/modules/matches/services/matchService";
import { eventLabelWithIcon } from "@/modules/live/eventIcons";
import { halfDisplayLabel } from "@/modules/live/matchStatuses";

type SortKey = "minute" | "created_at" | "id" | "half" | "match_id";
type SortDir = "asc" | "desc";

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export type EventsAdminPageProps = {
  tournamentId: number;
  fixedEditionId?: number;
  title?: string;
  backHref?: string;
  backLabel?: string;
  /** Base path of this list (for edit return links). */
  listHref?: string;
};

export function EventsAdminPage({
  tournamentId,
  fixedEditionId,
  title,
  backHref,
  backLabel = "Nazaj",
  listHref,
}: EventsAdminPageProps) {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const listPath =
    listHref ?? `/dashboard_admin/tournaments/${tournamentId}/events`;

  const tournament = useAsyncData(
    () => adminTournamentService.get(tournamentId),
    [tournamentId],
  );

  const [rows, setRows] = useState<MatchEventListItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editionFilter, setEditionFilter] = useState(() => {
    if (fixedEditionId != null) return String(fixedEditionId);
    return searchParams.get("edition") ?? "";
  });
  const [typeFilter, setTypeFilter] = useState("");
  const [halfFilter, setHalfFilter] = useState("");
  const [tempOnly, setTempOnly] = useState(false);
  const [matchFilter, setMatchFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const editions = useAsyncData(
    () => adminEditionService.list({ tournament: tournamentId, page_size: 100 }),
    [tournamentId],
  );

  const loadTypes = useCallback(async () => {
    setEventTypes(normalizeList<EventTypeRef>(await eventTypeService.list()));
  }, []);

  const load = useCallback(async () => {
    if (!Number.isFinite(tournamentId)) return;
    setLoading(true);
    setError(null);
    try {
      const ordering = `${sortDir === "desc" ? "-" : ""}${sortKey}`;
      const edition =
        fixedEditionId != null
          ? String(fixedEditionId)
          : editionFilter || undefined;
      const page = await matchEventService.list({
        tournament: tournamentId,
        tournament_edition: edition || undefined,
        event_type: typeFilter || undefined,
        half: halfFilter || undefined,
        match: matchFilter.trim() || undefined,
        is_temporary_player: tempOnly ? true : undefined,
        search: search.trim() || undefined,
        ordering,
        page_size: 200,
      });
      setRows(page.results);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    tournamentId,
    fixedEditionId,
    editionFilter,
    typeFilter,
    halfFilter,
    matchFilter,
    tempOnly,
    search,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    void loadTypes().catch(setError);
  }, [loadTypes]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayed = useMemo(() => rows, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function onDelete(eventId: number) {
    if (!window.confirm("Izbrišem ta dogodek?")) return;
    setBusy(true);
    setError(null);
    try {
      await matchEventService.delete(eventId);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(tournamentId)) {
    return <StateMessage variant="error" message="Neveljaven turnir." />;
  }

  const resolvedBack =
    backHref ?? `/dashboard_admin/tournaments/${tournamentId}`;

  return (
    <div className="page">
      <PageHeader
        title={title ?? "Dogodki"}
        subtitle={
          tournament.data
            ? tournament.data.name
            : `Turnir #${tournamentId}`
        }
        actions={
          <>
            <Link
              className="button-link border-frame border-frame--sm"
              to={resolvedBack}
            >
              {backLabel}
            </Link>
            <Link
              className="button-link border-frame border-frame--sm"
              to="/dashboard_admin"
            >
              Admin
            </Link>
          </>
        }
      />

      <ErrorBanner error={error ?? tournament.error ?? editions.error} />

      <section className="border-frame border-frame--md stack-form">
        <div className="admin-filter-row">
          <label>
            Iskanje
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(searchInput.trim());
              }}
              placeholder="Igralec, ekipa…"
            />
          </label>
          {fixedEditionId == null ? (
            <label>
              Edicija
              <select
                value={editionFilter}
                onChange={(e) => setEditionFilter(e.target.value)}
              >
                <option value="">Vse</option>
                {(editions.data?.results ?? []).map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.year} · {ed.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Tip
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Vsi</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Polčas
            <select
              value={halfFilter}
              onChange={(e) => setHalfFilter(e.target.value)}
            >
              <option value="">Vsi</option>
              <option value="1">1. polčas</option>
              <option value="2">2. polčas</option>
              <option value="ET1">Podaljški</option>
              <option value="ET2">Podaljški 2</option>
              <option value="penalties">Penali</option>
            </select>
          </label>
          <label>
            Match ID
            <input
              type="number"
              min={1}
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
              placeholder="npr. 12"
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              className="border-frame border-frame--sm"
              checked={tempOnly}
              onChange={(e) => setTempOnly(e.target.checked)}
            />
            Samo neznani
          </label>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={() => {
              setSearch(searchInput.trim());
              void load();
            }}
          >
            Filtriraj
          </button>
          <button
            type="button"
            className="button-secondary border-frame border-frame--sm"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              if (fixedEditionId == null) setEditionFilter("");
              setTypeFilter("");
              setHalfFilter("");
              setMatchFilter("");
              setTempOnly(false);
            }}
          >
            Reset
          </button>
        </div>
      </section>

      {loading ? <StateMessage variant="loading" /> : null}
      {!loading && displayed.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Ni dogodkov"
          message="Za izbrane filtre ni zadetkov."
        />
      ) : null}

      {!loading && displayed.length > 0 ? (
        <section className="border-frame border-frame--md">
          <div className="admin-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("id")}
                    >
                      ID
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("match_id")}
                    >
                      Tekma
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("minute")}
                    >
                      Min
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("half")}
                    >
                      Polčas
                    </button>
                  </th>
                  <th>Tip</th>
                  <th>Ekipa</th>
                  <th>Igralec</th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("created_at")}
                    >
                      Ustvarjeno
                    </button>
                  </th>
                  {isAdmin ? <th>Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {displayed.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>
                      <Link to={`/matches/${e.match}`}>#{e.match}</Link>
                      <div className="muted">
                        {e.home_team_name ?? "?"} vs {e.away_team_name ?? "?"}
                      </div>
                    </td>
                    <td>
                      {e.minute}
                      {e.extra_minute != null ? `+${e.extra_minute}` : ""}
                    </td>
                    <td>{halfDisplayLabel(e.half)}</td>
                    <td>
                      {eventLabelWithIcon(e.event_type.code, e.event_type.name)}
                      {e.is_own_goal ? " (AG)" : ""}
                    </td>
                    <td>{e.team_name ?? e.team_participation}</td>
                    <td>
                      {e.is_temporary_player
                        ? `${e.temporary_player_label || "Neznani"} *`
                        : (e.player_name ?? e.player ?? "—")}
                    </td>
                    <td>
                      {e.created_at
                        ? new Date(e.created_at).toLocaleString("sl-SI")
                        : "—"}
                    </td>
                    {isAdmin ? (
                      <td>
                        <div className="row-actions">
                          <Link
                            className="linkish"
                            to={`/match-events/${e.id}/edit?return=${encodeURIComponent(listPath)}`}
                          >
                            Uredi
                          </Link>
                          <Link
                            className="linkish"
                            to={`/live/matches/${e.match}`}
                          >
                            Live
                          </Link>
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => void onDelete(e.id)}
                          >
                            Izbriši
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {displayed.length} dogodkov · sort: {sortKey} {sortDir}
          </p>
        </section>
      ) : null}
    </div>
  );
}

export function TournamentEventsAdminPage() {
  const { id } = useParams();
  return <EventsAdminPage tournamentId={Number(id)} />;
}
