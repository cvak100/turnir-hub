import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  matchService,
  type MatchListItem,
  type MatchStatusItem,
} from "@/modules/matches/services/matchService";

type SortKey =
  | "match_date"
  | "status__name"
  | "tournament_phase__tournament_edition__name"
  | "home_team_participation__participation_name";
type SortDir = "asc" | "desc";

function shortDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchLabel(row: MatchListItem): string {
  const home = row.home_team_name ?? "TBD";
  const away = row.away_team_name ?? "TBD";
  if (row.home_score != null && row.away_score != null) {
    return `${home} ${row.home_score}:${row.away_score} ${away}`;
  }
  return `${home} – ${away}`;
}

export function MatchesAdminPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("match_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState<MatchStatusItem[]>([]);

  const loadLookups = useCallback(async () => {
    setStatuses(await matchService.listStatuses());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordering = `${sortDir === "desc" ? "-" : ""}${sortKey}`;
      const page = await matchService.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        ordering,
        page_size: 100,
      });
      setRows(page.results);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [search, sortDir, sortKey, statusFilter]);

  useEffect(() => {
    void loadLookups().catch((err) => setError(err));
  }, [loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function deleteOne(id: number) {
    const ok = window.confirm("Izbrišem to tekmo?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await matchService.delete(id);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="page admin-matches-page">
      <PageHeader
        title="Tekme"
        subtitle="Iskanje, sortiranje, urejanje in brisanje."
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to="/dashboard_admin"
          >
            ← Dashboard Admin
          </Link>
        }
      />

      <section className="border-frame border-frame--md admin-matches-panel">
        <form
          className="admin-matches-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <label className="admin-matches-filters__search">
            Iskanje
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ekipa, faza, edicija…"
            />
          </label>
          <label className="admin-matches-filters__status">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Vsi</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="border-frame border-frame--sm">
            Išči
          </button>
        </form>

        <ErrorBanner error={error} />
        {loading ? <StateMessage variant="loading" /> : null}
        {!loading && rows.length === 0 ? (
          <p className="muted">Ni tekem.</p>
        ) : null}

        {rows.length > 0 ? (
          <div className="admin-matches-table">
            <table className="data-table admin-matches-grid">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() =>
                        toggleSort(
                          "home_team_participation__participation_name",
                        )
                      }
                    >
                      Tekma
                      {sortMark(
                        "home_team_participation__participation_name",
                      )}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() =>
                        toggleSort(
                          "tournament_phase__tournament_edition__name",
                        )
                      }
                    >
                      Edicija / faza
                      {sortMark(
                        "tournament_phase__tournament_edition__name",
                      )}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("match_date")}
                    >
                      Datum{sortMark("match_date")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("status__name")}
                    >
                      Status{sortMark("status__name")}
                    </button>
                  </th>
                  <th className="admin-matches-grid__actions">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Tekma">{matchLabel(row)}</td>
                    <td data-label="Edicija / faza">
                      {row.edition_name ?? "—"}
                      {row.phase_name ? (
                        <span className="muted"> · {row.phase_name}</span>
                      ) : null}
                    </td>
                    <td data-label="Datum">{shortDate(row.match_date)}</td>
                    <td data-label="Status">{row.status?.name ?? "—"}</td>
                    <td
                      className="admin-matches-grid__actions"
                      data-label="Akcije"
                    >
                      <div className="admin-matches-actions">
                        <Link
                          className="button-link border-frame border-frame--sm admin-matches-icon-btn"
                          to={`/matches/${row.id}`}
                          title="Uredi"
                          aria-label="Uredi"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 20h4l10.5-10.5-4-4L4 16v4zm13.1-13.1 1.4-1.4a1.5 1.5 0 0 1 2.1 0l1.4 1.4a1.5 1.5 0 0 1 0 2.1l-1.4 1.4-3.5-3.5z"
                              fill="currentColor"
                            />
                          </svg>
                        </Link>
                        <Link
                          className="button-link border-frame border-frame--sm"
                          to={`/live/matches/${row.id}`}
                        >
                          Live
                        </Link>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="border-frame border-frame--sm admin-matches-icon-btn"
                            disabled={busy}
                            title="Izbriši"
                            aria-label="Izbriši"
                            onClick={() => void deleteOne(row.id)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              aria-hidden="true"
                            >
                              <path
                                d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                                fill="currentColor"
                              />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
