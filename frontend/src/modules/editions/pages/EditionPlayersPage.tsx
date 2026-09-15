import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import { EditionManageNav } from "../EditionManageNav";
import { formatPersonName } from "@/shared/utils/format";
import {
  teamParticipationService,
  type TeamParticipationListItem,
} from "@/modules/teams/services/teamService";
import {
  participationPlayerService,
  playerService,
  type PlayerListItem,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";

type ViewMode = "list" | "register";

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

function playerLabel(p: PlayerListItem): string {
  return formatPersonName(p.person);
}

function toggleSet(
  setter: Dispatch<SetStateAction<Set<number>>>,
  id: number,
) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
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
  const [mode, setMode] = useState<ViewMode>("list");

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
        subtitle={
          mode === "register"
            ? "Prijava igralcev na ekipo v tej ediciji."
            : `Edicija #${editionId}`
        }
        actions={
          mode === "register" ? (
            <button
              type="button"
              className="button-link border-frame border-frame--sm"
              onClick={() => {
                setMode("list");
                void load();
              }}
            >
              ← Nazaj na seznam
            </button>
          ) : (
            <Link
              className="button-link border-frame border-frame--sm"
              to={`/editions/${editionId}`}
            >
              Nazaj na edicijo
            </Link>
          )
        }
      />

      <EditionManageNav editionId={editionId} />

      <ErrorBanner error={error} />

      {mode === "list" && canAssign ? (
        <div className="page-primary-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={() => setMode("register")}
          >
            Prijava igralcev
          </button>
          <Link
            className="button-secondary border-frame border-frame--sm"
            to="/dashboard_admin/persons/new"
          >
            + Nova oseba
          </Link>
        </div>
      ) : null}

      {mode === "register" && canAssign ? (
        <PlayerRegisterView
          editionId={editionId}
          participations={teams.data ?? []}
          participationsLoading={teams.loading}
          onDone={() => {
            setMode("list");
            void load();
          }}
          onError={setError}
        />
      ) : null}

      {mode === "list" ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

function PlayerRegisterView({
  editionId,
  participations,
  participationsLoading,
  onDone,
  onError,
}: {
  editionId: number;
  participations: TeamParticipationListItem[];
  participationsLoading: boolean;
  onDone: () => void;
  onError: (err: unknown) => void;
}) {
  const [participationId, setParticipationId] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerListItem[]>([]);
  const [editionRoster, setEditionRoster] = useState<
    TeamParticipationPlayerListItem[]
  >([]);
  const [teamRoster, setTeamRoster] = useState<TeamParticipationPlayerListItem[]>(
    [],
  );
  const [priorPlayerIds, setPriorPlayerIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [availSelected, setAvailSelected] = useState<Set<number>>(new Set());
  const [rosterSelected, setRosterSelected] = useState<Set<number>>(new Set());
  const [availSearch, setAvailSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");

  const selectedParticipation = useMemo(
    () =>
      participations.find((p) => String(p.id) === participationId) ?? null,
    [participationId, participations],
  );

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const [playersPage, editionPage] = await Promise.all([
        playerService.list({ page_size: 500, is_active: true }),
        participationPlayerService.list({
          tournament_edition: editionId,
          page_size: 1000,
        }),
      ]);
      setAllPlayers(playersPage.results);
      setEditionRoster(editionPage.results);
      setAvailSelected(new Set());
      setRosterSelected(new Set());
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [editionId, onError]);

  const loadTeamRoster = useCallback(async () => {
    if (!participationId) {
      setTeamRoster([]);
      setPriorPlayerIds(new Set());
      return;
    }
    try {
      const part = participations.find((p) => String(p.id) === participationId);
      const rosterPage = await participationPlayerService.list({
        team_participation: Number(participationId),
        page_size: 500,
      });
      setTeamRoster(rosterPage.results);
      setAvailSelected(new Set());
      setRosterSelected(new Set());

      if (part) {
        try {
          const priorPage = await participationPlayerService.list({
            team: part.team.id,
            page_size: 1000,
          });
          setPriorPlayerIds(new Set(priorPage.results.map((r) => r.player.id)));
        } catch {
          setPriorPlayerIds(new Set());
        }
      }
    } catch (err) {
      onError(err);
    }
  }, [onError, participationId, participations]);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    void loadTeamRoster();
  }, [loadTeamRoster]);

  useEffect(() => {
    if (participationId || participations.length === 0) return;
    setParticipationId(String(participations[0].id));
  }, [participationId, participations]);

  const editionPlayerIds = useMemo(
    () => new Set(editionRoster.map((r) => r.player.id)),
    [editionRoster],
  );

  const availablePlayers = useMemo(() => {
    const q = availSearch.trim().toLowerCase();
    return allPlayers
      .filter((p) => !editionPlayerIds.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return playerLabel(p).toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ap = priorPlayerIds.has(a.id) ? 0 : 1;
        const bp = priorPlayerIds.has(b.id) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return playerLabel(a).localeCompare(playerLabel(b), "sl");
      });
  }, [allPlayers, availSearch, editionPlayerIds, priorPlayerIds]);

  const rosterFiltered = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return teamRoster.filter((r) => {
      if (!q) return true;
      return playerLabel(r.player).toLowerCase().includes(q);
    });
  }, [rosterSearch, teamRoster]);

  async function assignSelected() {
    if (!participationId) return;
    const ids = [...availSelected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const playerId of ids) {
        await participationPlayerService.create({
          team_participation: Number(participationId),
          player: playerId,
        });
      }
      await loadPlayers();
      await loadTeamRoster();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function unassignSelected() {
    const ids = [...rosterSelected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const rowId of ids) {
        await participationPlayerService.delete(rowId);
      }
      await loadPlayers();
      await loadTeamRoster();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  if (participationsLoading || loading) {
    return <StateMessage variant="loading" />;
  }

  if (participations.length === 0) {
    return (
      <section className="border-frame border-frame--md">
        <StateMessage
          variant="empty"
          title="Ni prijavljenih ekip"
          message="Najprej prijavi ekipe na turnir, nato lahko dodaš igralce."
        />
        <p style={{ marginTop: "0.75rem" }}>
          <Link
            className="border-frame border-frame--sm"
            to={`/editions/${editionId}/teams`}
          >
            Prijava ekip
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="border-frame border-frame--md stack-form">
      <div className="row-actions" style={{ justifyContent: "space-between" }}>
        <label style={{ flex: "1 1 16rem", maxWidth: "28rem" }}>
          Ekipa *
          <select
            value={participationId}
            onChange={(e) => setParticipationId(e.target.value)}
          >
            {participations.map((p) => (
              <option key={p.id} value={p.id}>
                {p.participation_name || p.team.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button-secondary border-frame border-frame--sm"
          onClick={onDone}
        >
          Zapri prijavo
        </button>
      </div>

      {selectedParticipation ? (
        <p className="muted" style={{ margin: 0 }}>
          Igralce dodeljuješ ekipi{" "}
          <strong>{selectedParticipation.participation_name}</strong>. Vsak
          igralec sme biti na tej ediciji samo v eni ekipi.
        </p>
      ) : null}

      <div className="team-transfer">
        <section className="team-transfer__box border-frame border-frame--sm">
          <div className="team-transfer__head">
            <h3 style={{ margin: 0 }}>Razpoložljivi igralci</h3>
            <span className="muted">{availablePlayers.length}</span>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Najprej bivši igralci te ekipe, nato abeceda. Že prijavljeni na
            turnir so skriti.
          </p>
          <input
            className="team-transfer__search"
            value={availSearch}
            onChange={(e) => setAvailSearch(e.target.value)}
            placeholder="Išči igralce…"
          />
          <ul className="team-transfer__list plain-list">
            {availablePlayers.length === 0 ? (
              <li className="muted">Ni razpoložljivih igralcev.</li>
            ) : (
              availablePlayers.map((p) => (
                <li key={p.id} className="team-transfer__item">
                  <label className="checkbox-row">
                    <input
                      className="sketch-check border-frame border-frame--sm"
                      type="checkbox"
                      checked={availSelected.has(p.id)}
                      disabled={!participationId}
                      onChange={() => toggleSet(setAvailSelected, p.id)}
                    />
                    <span>
                      {playerLabel(p)}
                      {priorPlayerIds.has(p.id) ? (
                        <span className="muted"> · prej v ekipi</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="team-transfer__actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            disabled={busy || !participationId || availSelected.size === 0}
            onClick={() => void assignSelected()}
          >
            Prijavi →
          </button>
          <button
            type="button"
            className="button-secondary border-frame border-frame--sm"
            disabled={busy || rosterSelected.size === 0}
            onClick={() => void unassignSelected()}
          >
            ← Odstrani
          </button>
        </div>

        <section className="team-transfer__box border-frame border-frame--sm">
          <div className="team-transfer__head">
            <h3 style={{ margin: 0 }}>Na ekipi</h3>
            <span className="muted">{teamRoster.length}</span>
          </div>
          <input
            className="team-transfer__search"
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            placeholder="Išči na ekipi…"
          />
          <ul className="team-transfer__list plain-list">
            {rosterFiltered.length === 0 ? (
              <li className="muted">Še ni igralcev na tej ekipi.</li>
            ) : (
              rosterFiltered.map((r) => (
                <li key={r.id} className="team-transfer__item">
                  <label className="checkbox-row">
                    <input
                      className="sketch-check border-frame border-frame--sm"
                      type="checkbox"
                      checked={rosterSelected.has(r.id)}
                      onChange={() => toggleSet(setRosterSelected, r.id)}
                    />
                    <span>
                      {r.jersey_number != null ? `#${r.jersey_number} ` : ""}
                      {playerLabel(r.player)}
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="muted">
        Igralec še ne obstaja v sistemu?{" "}
        <Link to="/dashboard_admin/persons/new">Dodaj novo osebo</Link>, nato
        jo prijavi tukaj.
      </p>
    </section>
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
