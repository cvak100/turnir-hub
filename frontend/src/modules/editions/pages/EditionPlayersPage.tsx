import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import { formatPersonName } from "@/shared/utils/format";
import { teamParticipationService } from "@/modules/teams/services/teamService";
import {
  participationPlayerService,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";

type SortKey =
  | "player"
  | "team"
  | "jersey_number"
  | "position"
  | "goals"
  | "assists"
  | "matches_played"
  | "is_captain";

type SortDir = "asc" | "desc";

function captainLabel(row: TeamParticipationPlayerListItem): string {
  if (row.is_captain) return "Kapetan";
  if (row.is_vice_captain) return "Podkapetan";
  return "—";
}

export function EditionPlayersPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission, isAdmin } = useAuth();

  const [rows, setRows] = useState<TeamParticipationPlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [captainFilter, setCaptainFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("player");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const teams = useAsyncTeams(editionId);

  const canAssign =
    isAdmin || hasPermission("player.assign", editionId);

  const load = useCallback(async () => {
    if (!Number.isFinite(editionId)) return;
    setLoading(true);
    setError(null);
    try {
      const orderingMap: Record<SortKey, string> = {
        player: "player__person__last_name",
        team: "jersey_number",
        jersey_number: "jersey_number",
        position: "position",
        goals: "goals",
        assists: "assists",
        matches_played: "matches_played",
        is_captain: "is_captain",
      };
      const ordering = `${sortDir === "desc" ? "-" : ""}${orderingMap[sortKey]}`;
      const page = await participationPlayerService.list({
        tournament_edition: editionId,
        search: search.trim() || undefined,
        team_participation: teamFilter || undefined,
        is_captain:
          captainFilter === "yes"
            ? true
            : captainFilter === "no"
              ? false
              : undefined,
        ordering,
        page_size: 500,
      });
      let results = page.results;
      if (positionFilter.trim()) {
        const q = positionFilter.trim().toLowerCase();
        results = results.filter(
          (r) =>
            (r.position || "").toLowerCase().includes(q) ||
            (r.player.position || "").toLowerCase().includes(q),
        );
      }
      if (sortKey === "team") {
        results = [...results].sort((a, b) => {
          const an = (a.participation_name || a.team_name || "").toLowerCase();
          const bn = (b.participation_name || b.team_name || "").toLowerCase();
          const cmp = an.localeCompare(bn, "sl");
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
      setRows(results);
      setSelected(new Set());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    editionId,
    search,
    teamFilter,
    captainFilter,
    positionFilter,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const allSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function removeSelected() {
    if (!canAssign || selected.size === 0) return;
    if (
      !window.confirm(
        `Odstranim ${selected.size} igralcev iz ekipe (participation)?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const id of selected) {
        await participationPlayerService.delete(id);
      }
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljavna edicija." />;
  }

  return (
    <div className="page">
      <PageHeader
        title="Igralci"
        subtitle={`Edicija #${editionId}`}
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/editions/${editionId}`}
          >
            Nazaj na edicijo
          </Link>
        }
      />

      <ErrorBanner error={error} />

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
              placeholder="Ime, priimek…"
            />
          </label>
          <label>
            Ekipa
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">Vse</option>
              {(teams.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.participation_name || t.team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kapetan
            <select
              value={captainFilter}
              onChange={(e) => setCaptainFilter(e.target.value)}
            >
              <option value="">Vsi</option>
              <option value="yes">Samo kapetani</option>
              <option value="no">Brez kapetanov</option>
            </select>
          </label>
          <label>
            Pozicija
            <input
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              placeholder="npr. GK, FW"
            />
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
              setTeamFilter("");
              setCaptainFilter("");
              setPositionFilter("");
            }}
          >
            Reset
          </button>
          {canAssign && selected.size > 0 ? (
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              disabled={busy}
              onClick={() => void removeSelected()}
            >
              Odstrani izbrane ({selected.size})
            </button>
          ) : null}
        </div>
      </section>

      {loading ? <StateMessage variant="loading" /> : null}
      {!loading && rows.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Ni igralcev"
          message="Za izbrane filtre ni zadetkov."
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          <div className="admin-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {canAssign ? (
                    <th className="col-check">
                      <input
                        className="sketch-check border-frame border-frame--sm"
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Izberi vse"
                      />
                    </th>
                  ) : null}
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("player")}
                    >
                      Igralec
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("team")}
                    >
                      Ekipa
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("jersey_number")}
                    >
                      #
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("position")}
                    >
                      Pozicija
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("is_captain")}
                    >
                      Kapetan
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("matches_played")}
                    >
                      Tekme
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("goals")}
                    >
                      Goli
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("assists")}
                    >
                      Asistence
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {canAssign ? (
                      <td>
                        <input
                          className="sketch-check border-frame border-frame--sm"
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`Izberi ${formatPersonName(row.player.person)}`}
                        />
                      </td>
                    ) : null}
                    <td>
                      <Link to={`/players/${row.player.id}`}>
                        {formatPersonName(row.player.person)}
                      </Link>
                    </td>
                    <td>
                      {row.participation_name || row.team_name || "—"}
                    </td>
                    <td>{row.jersey_number ?? "—"}</td>
                    <td>{row.position || row.player.position || "—"}</td>
                    <td>{captainLabel(row)}</td>
                    <td>{row.matches_played ?? 0}</td>
                    <td>{row.goals}</td>
                    <td>{row.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {rows.length} igralcev · sort: {sortKey} {sortDir}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function useAsyncTeams(editionId: number) {
  const [data, setData] = useState<
    Awaited<ReturnType<typeof teamParticipationService.list>>["results"] | null
  >(null);

  useEffect(() => {
    if (!Number.isFinite(editionId)) return;
    let cancelled = false;
    void teamParticipationService
      .list({ tournament_edition: editionId, page_size: 200 })
      .then((page) => {
        if (!cancelled) setData(page.results);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editionId]);

  return useMemo(() => ({ data }), [data]);
}
