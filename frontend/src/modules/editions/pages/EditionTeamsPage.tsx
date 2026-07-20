import {
  type Dispatch,
  type FormEvent,
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
  StatusHelpHint,
  TEAM_PARTICIPATION_STATUS_HELP,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { personService } from "@/modules/admin/services/personService";
import { editionService } from "@/modules/editions/services/editionService";
import {
  participationPlayerService,
  playerService,
  type PlayerListItem,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";
import {
  teamParticipationService,
  teamService,
  type TeamListItem,
  type TeamParticipationDetail,
  type TeamParticipationListItem,
  type TeamStatus,
} from "@/modules/teams/services/teamService";

type ViewMode = "list" | "register" | "detail";
type SortKey = "name" | "status" | "registered_at" | "payment";
type SortDir = "asc" | "desc";

function playerLabel(p: PlayerListItem) {
  const nick = p.person.nickname ? ` (${p.person.nickname})` : "";
  return `${p.person.last_name} ${p.person.first_name}${nick}`.trim();
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

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditionTeamsPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission, isAdmin } = useAuth();

  const edition = useAsyncData(() => editionService.get(editionId), [editionId]);

  const canRegister =
    isAdmin || hasPermission("team.participation.manage", editionId);
  const canCreateTeam = isAdmin || hasPermission("team.manage");
  const canAssignPlayers =
    isAdmin || hasPermission("player.assign", editionId);

  const [mode, setMode] = useState<ViewMode>("list");
  const [detailId, setDetailId] = useState<number | null>(null);

  const [participations, setParticipations] = useState<
    TeamParticipationListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [listSearch, setListSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const loadParticipations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await teamParticipationService.list({
        tournament_edition: editionId,
        page_size: 500,
        ordering: "participation_name",
      });
      setParticipations(page.results);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [editionId]);

  useEffect(() => {
    void loadParticipations();
  }, [loadParticipations]);

  const sortedList = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const rows = participations.filter((p) => {
      if (!q) return true;
      return (
        p.participation_name.toLowerCase().includes(q) ||
        p.team.name.toLowerCase().includes(q) ||
        (p.team.city || "").toLowerCase().includes(q) ||
        (p.status?.name || "").toLowerCase().includes(q)
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.participation_name.localeCompare(b.participation_name, "sl");
      } else if (sortKey === "status") {
        cmp = (a.status?.name || "").localeCompare(b.status?.name || "", "sl");
      } else if (sortKey === "payment") {
        cmp = Number(a.payment_status) - Number(b.payment_status);
      } else {
        cmp =
          new Date(a.registered_at).getTime() -
          new Date(b.registered_at).getTime();
      }
      return cmp * dir;
    });
    return rows;
  }, [listSearch, participations, sortDir, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  async function removeParticipation(partId: number) {
    setBusy(true);
    setError(null);
    try {
      await teamParticipationService.delete(partId);
      if (detailId === partId) {
        setDetailId(null);
        setMode("list");
      }
      await loadParticipations();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const title =
    edition.data?.name != null
      ? `Ekipe — ${edition.data.name}`
      : "Ekipe edicije";

  return (
    <div className="page">
      <PageHeader
        title={title}
        subtitle={
          mode === "register"
            ? "Prijava ekip na edicijo."
            : mode === "detail"
              ? "Podatki prijavljene ekipe in igralci."
              : "Prijavljene ekipe na tej ediciji."
        }
        actions={
          mode !== "list" ? (
            <button
              type="button"
              className="button-link border-frame border-frame--sm"
              onClick={() => {
                setMode("list");
                setDetailId(null);
                void loadParticipations();
              }}
            >
              ← Nazaj na seznam
            </button>
          ) : (
            <Link
              className="button-link border-frame border-frame--sm"
              to={`/editions/${editionId}`}
            >
              ← Nazaj na edicijo
            </Link>
          )
        }
      />

      {mode === "list" && canRegister ? (
        <div className="page-primary-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={() => setMode("register")}
          >
            Prijava ekip
          </button>
        </div>
      ) : null}
      <ErrorBanner error={error ?? edition.error} />

      {mode === "list" ? (
        <ListView
          loading={loading}
          rows={sortedList}
          listSearch={listSearch}
          setListSearch={setListSearch}
          sortMark={sortMark}
          toggleSort={toggleSort}
          canRegister={canRegister}
          busy={busy}
          onOpen={(id) => {
            setDetailId(id);
            setMode("detail");
          }}
          onEdit={(id) => {
            setDetailId(id);
            setMode("detail");
          }}
          onRemove={(id) => void removeParticipation(id)}
          onBulkStatus={async (ids, statusId) => {
            setBusy(true);
            setError(null);
            try {
              for (const partId of ids) {
                await teamParticipationService.update(partId, {
                  status: statusId,
                });
              }
              await loadParticipations();
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {mode === "register" ? (
        <RegisterView
          editionId={editionId}
          canRegister={canRegister}
          canCreateTeam={canCreateTeam}
          onDone={() => {
            setMode("list");
            void loadParticipations();
          }}
          onError={setError}
        />
      ) : null}

      {mode === "detail" && detailId != null ? (
        <DetailView
          editionId={editionId}
          participationId={detailId}
          canRegister={canRegister}
          canAssignPlayers={canAssignPlayers}
          onRemoved={() => {
            setDetailId(null);
            setMode("list");
            void loadParticipations();
          }}
          onError={setError}
        />
      ) : null}
    </div>
  );
}

function ListView({
  loading,
  rows,
  listSearch,
  setListSearch,
  sortMark,
  toggleSort,
  canRegister,
  busy,
  onOpen,
  onEdit,
  onRemove,
  onBulkStatus,
}: {
  loading: boolean;
  rows: TeamParticipationListItem[];
  listSearch: string;
  setListSearch: (v: string) => void;
  sortMark: (key: SortKey) => string;
  toggleSort: (key: SortKey) => void;
  canRegister: boolean;
  busy: boolean;
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onRemove: (id: number) => void;
  onBulkStatus: (ids: number[], statusId: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatusId, setBulkStatusId] = useState("");
  const statuses = useAsyncData(() => teamService.listStatuses(), []);

  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  const allSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  }

  if (loading) return <StateMessage variant="loading" />;

  return (
    <section className="border-frame border-frame--md">
      <div className="row-actions" style={{ marginBottom: "0.75rem" }}>
        <label className="admin-search">
          Iskanje
          <input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="ime ekipe, status…"
          />
        </label>
      </div>

      {canRegister && rows.length > 0 ? (
        <div className="row-actions admin-bulk">
          <label className="admin-search">
            Status za izbrane
            <select
              value={bulkStatusId}
              disabled={busy || selected.size === 0}
              onChange={(e) => setBulkStatusId(e.target.value)}
            >
              <option value="">— izberi status —</option>
              {(statuses.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="border-frame border-frame--sm"
            disabled={busy || selected.size === 0 || !bulkStatusId}
            onClick={() =>
              void onBulkStatus([...selected], Number(bulkStatusId)).then(() => {
                setSelected(new Set());
                setBulkStatusId("");
              })
            }
          >
            Spremeni status ({selected.size})
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <StateMessage variant="empty" message="Še ni prijavljenih ekip." />
      ) : (
        <div className="admin-table-wrap">
          <table className="data-table admin-table">
            <thead>
              <tr>
                {canRegister ? (
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
                    onClick={() => toggleSort("name")}
                  >
                    Ekipa{sortMark("name")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => toggleSort("status")}
                  >
                    Status{sortMark("status")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => toggleSort("payment")}
                  >
                    Plačilo{sortMark("payment")}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => toggleSort("registered_at")}
                  >
                    Prijava{sortMark("registered_at")}
                  </button>
                </th>
                {canRegister ? <th>Akcije</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  {canRegister ? (
                    <td className="col-check">
                      <input
                        className="sketch-check border-frame border-frame--sm"
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSet(setSelected, p.id)}
                        aria-label={`Izberi ${p.participation_name}`}
                      />
                    </td>
                  ) : null}
                  <td>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => onOpen(p.id)}
                    >
                      {p.participation_name}
                    </button>
                    <span className="muted"> · {p.team.name}</span>
                    {p.team.city ? (
                      <span className="muted"> · {p.team.city}</span>
                    ) : null}
                  </td>
                  <td>{p.status?.name ?? "—"}</td>
                  <td>{p.payment_status ? "da" : "ne"}</td>
                  <td>
                    {p.registered_at
                      ? new Date(p.registered_at).toLocaleString("sl-SI")
                      : "—"}
                  </td>
                  {canRegister ? (
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => onEdit(p.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="linkish"
                          disabled={busy}
                          onClick={() => onRemove(p.id)}
                        >
                          Odstrani
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RegisterView({
  editionId,
  canRegister,
  canCreateTeam,
  onDone,
  onError,
}: {
  editionId: number;
  canRegister: boolean;
  canCreateTeam: boolean;
  onDone: () => void;
  onError: (err: unknown) => void;
}) {
  const [allTeams, setAllTeams] = useState<TeamListItem[]>([]);
  const [participations, setParticipations] = useState<
    TeamParticipationListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [availableSelected, setAvailableSelected] = useState<Set<number>>(
    new Set(),
  );
  const [registeredSelected, setRegisteredSelected] = useState<Set<number>>(
    new Set(),
  );
  const [availableSearch, setAvailableSearch] = useState("");
  const [registeredSearch, setRegisteredSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShortName, setNewShortName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [alsoRegister, setAlsoRegister] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsPage, partsPage] = await Promise.all([
        teamService.list({ page_size: 500, ordering: "name" }),
        teamParticipationService.list({
          tournament_edition: editionId,
          page_size: 500,
          ordering: "participation_name",
        }),
      ]);
      setAllTeams(teamsPage.results);
      setParticipations(partsPage.results);
      setAvailableSelected(new Set());
      setRegisteredSelected(new Set());
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [editionId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const registeredTeamIds = useMemo(
    () => new Set(participations.map((p) => p.team.id)),
    [participations],
  );

  const availableTeams = useMemo(() => {
    const q = availableSearch.trim().toLowerCase();
    return allTeams
      .filter((t) => !registeredTeamIds.has(t.id))
      .filter((t) => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.short_name || "").toLowerCase().includes(q) ||
          (t.city || "").toLowerCase().includes(q)
        );
      });
  }, [allTeams, availableSearch, registeredTeamIds]);

  const registeredFiltered = useMemo(() => {
    const q = registeredSearch.trim().toLowerCase();
    return participations.filter((p) => {
      if (!q) return true;
      return (
        p.participation_name.toLowerCase().includes(q) ||
        p.team.name.toLowerCase().includes(q)
      );
    });
  }, [participations, registeredSearch]);

  async function registerSelected() {
    const ids = [...availableSelected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const teamId of ids) {
        const team = allTeams.find((t) => t.id === teamId);
        await teamParticipationService.create({
          team: teamId,
          tournament_edition: editionId,
          participation_name: team?.name,
        });
      }
      await load();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function unregisterSelected() {
    const ids = [...registeredSelected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const partId of ids) {
        await teamParticipationService.delete(partId);
      }
      await load();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateTeam(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const created = await teamService.create({
        name: newName.trim(),
        short_name: newShortName.trim(),
        city: newCity.trim(),
      });
      if (alsoRegister && canRegister) {
        await teamParticipationService.create({
          team: created.id,
          tournament_edition: editionId,
          participation_name: created.name,
        });
      }
      setNewName("");
      setNewShortName("");
      setNewCity("");
      setShowCreate(false);
      await load();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <StateMessage variant="loading" />;

  return (
    <>
      <div className="row-actions" style={{ marginBottom: "0.75rem" }}>
        {canCreateTeam ? (
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Skrij obrazec" : "+ Dodaj ekipo"}
          </button>
        ) : null}
        <button
          type="button"
          className="button-secondary border-frame border-frame--sm"
          onClick={onDone}
        >
          Zapri prijavo
        </button>
      </div>

      {showCreate && canCreateTeam ? (
        <form
          className="stack-form border-frame border-frame--md"
          onSubmit={onCreateTeam}
        >
          <h2>Nova ekipa</h2>
          <label>
            Ime *
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </label>
          <label>
            Kratko ime
            <input
              value={newShortName}
              onChange={(e) => setNewShortName(e.target.value)}
            />
          </label>
          <label>
            Mesto
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
            />
          </label>
          {canRegister ? (
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={alsoRegister}
                onChange={(e) => setAlsoRegister(e.target.checked)}
              />
              Takoj prijavi na to edicijo
            </label>
          ) : null}
          <div className="row-actions">
            <button
              type="submit"
              className="border-frame border-frame--sm"
              disabled={busy}
            >
              {busy ? "Shranjujem…" : "Ustvari ekipo"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="team-transfer">
        <section className="team-transfer__box border-frame border-frame--md">
          <div className="team-transfer__head">
            <h2>Vse ekipe</h2>
            <span className="muted">{availableTeams.length}</span>
          </div>
          <input
            className="team-transfer__search"
            value={availableSearch}
            onChange={(e) => setAvailableSearch(e.target.value)}
            placeholder="Išči ekipe…"
          />
          {canRegister ? (
            <label className="checkbox-row team-transfer__select-all">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={
                  availableTeams.length > 0 &&
                  availableTeams.every((t) => availableSelected.has(t.id))
                }
                onChange={() => {
                  if (
                    availableTeams.length > 0 &&
                    availableTeams.every((t) => availableSelected.has(t.id))
                  ) {
                    setAvailableSelected(new Set());
                  } else {
                    setAvailableSelected(
                      new Set(availableTeams.map((t) => t.id)),
                    );
                  }
                }}
              />
              Izberi vse
            </label>
          ) : null}
          <ul className="team-transfer__list plain-list">
            {availableTeams.length === 0 ? (
              <li className="muted">Ni razpoložljivih ekip.</li>
            ) : (
              availableTeams.map((team) => (
                <li key={team.id} className="team-transfer__item">
                  <label className="checkbox-row">
                    <input
                      className="sketch-check border-frame border-frame--sm"
                      type="checkbox"
                      checked={availableSelected.has(team.id)}
                      disabled={!canRegister}
                      onChange={() =>
                        toggleSet(setAvailableSelected, team.id)
                      }
                    />
                    <span>
                      {team.name}
                      {team.city ? (
                        <span className="muted"> · {team.city}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="team-transfer__actions">
          {canRegister ? (
            <>
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={busy || availableSelected.size === 0}
                onClick={() => void registerSelected()}
              >
                Prijavi →
              </button>
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                disabled={busy || registeredSelected.size === 0}
                onClick={() => void unregisterSelected()}
              >
                ← Odstrani
              </button>
            </>
          ) : (
            <p className="muted">Nimaš pravice za prijavo ekip.</p>
          )}
        </div>

        <section className="team-transfer__box border-frame border-frame--md">
          <div className="team-transfer__head">
            <h2>Prijavljene</h2>
            <span className="muted">{participations.length}</span>
          </div>
          <input
            className="team-transfer__search"
            value={registeredSearch}
            onChange={(e) => setRegisteredSearch(e.target.value)}
            placeholder="Išči prijavljene…"
          />
          {canRegister ? (
            <label className="checkbox-row team-transfer__select-all">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={
                  registeredFiltered.length > 0 &&
                  registeredFiltered.every((p) =>
                    registeredSelected.has(p.id),
                  )
                }
                onChange={() => {
                  if (
                    registeredFiltered.length > 0 &&
                    registeredFiltered.every((p) =>
                      registeredSelected.has(p.id),
                    )
                  ) {
                    setRegisteredSelected(new Set());
                  } else {
                    setRegisteredSelected(
                      new Set(registeredFiltered.map((p) => p.id)),
                    );
                  }
                }}
              />
              Izberi vse
            </label>
          ) : null}
          <ul className="team-transfer__list plain-list">
            {registeredFiltered.length === 0 ? (
              <li className="muted">Še ni prijavljenih ekip.</li>
            ) : (
              registeredFiltered.map((part) => (
                <li key={part.id} className="team-transfer__item">
                  <label className="checkbox-row">
                    <input
                      className="sketch-check border-frame border-frame--sm"
                      type="checkbox"
                      checked={registeredSelected.has(part.id)}
                      disabled={!canRegister}
                      onChange={() =>
                        toggleSet(setRegisteredSelected, part.id)
                      }
                    />
                    <span>{part.participation_name}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}

function DetailView({
  editionId,
  participationId,
  canRegister,
  canAssignPlayers,
  onRemoved,
  onError,
}: {
  editionId: number;
  participationId: number;
  canRegister: boolean;
  canAssignPlayers: boolean;
  onRemoved: () => void;
  onError: (err: unknown) => void;
}) {
  const [detail, setDetail] = useState<TeamParticipationDetail | null>(null);
  const [statuses, setStatuses] = useState<TeamStatus[]>([]);
  const [persons, setPersons] = useState<
    Awaited<ReturnType<typeof personService.list>>["results"]
  >([]);
  const [roster, setRoster] = useState<TeamParticipationPlayerListItem[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerListItem[]>([]);
  const [priorPlayerIds, setPriorPlayerIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPlayerAssign, setShowPlayerAssign] = useState(false);

  const [form, setForm] = useState({
    participation_name: "",
    status: "",
    payment_status: false,
    contact_person: "",
    notes: "",
    registered_at: "",
  });

  const [availSelected, setAvailSelected] = useState<Set<number>>(new Set());
  const [rosterSelected, setRosterSelected] = useState<Set<number>>(new Set());
  const [availSearch, setAvailSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [part, teamStatuses, personPage, rosterPage, playersPage] =
        await Promise.all([
          teamParticipationService.get(participationId),
          teamService.listStatuses(),
          personService.list({ page_size: 300, ordering: "last_name" }),
          participationPlayerService.list({
            team_participation: participationId,
            page_size: 500,
          }),
          playerService.list({ page_size: 500, is_active: true }),
        ]);

      setDetail(part);
      setStatuses(teamStatuses);
      setPersons(personPage.results);
      setRoster(rosterPage.results);
      setAllPlayers(playersPage.results);
      setForm({
        participation_name: part.participation_name,
        status: part.status ? String(part.status.id) : "",
        payment_status: part.payment_status,
        contact_person: part.contact_person
          ? String(part.contact_person.id)
          : "",
        notes: part.notes || "",
        registered_at: toDateTimeLocal(part.registered_at),
      });

      try {
        const priorPage = await participationPlayerService.list({
          team: part.team.id,
          page_size: 1000,
        });
        setPriorPlayerIds(
          new Set(priorPage.results.map((r) => r.player.id)),
        );
      } catch {
        setPriorPlayerIds(new Set());
      }

      setAvailSelected(new Set());
      setRosterSelected(new Set());
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [onError, participationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rosterPlayerIds = useMemo(
    () => new Set(roster.map((r) => r.player.id)),
    [roster],
  );

  const availablePlayers = useMemo(() => {
    const q = availSearch.trim().toLowerCase();
    return allPlayers
      .filter((p) => !rosterPlayerIds.has(p.id))
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
  }, [allPlayers, availSearch, priorPlayerIds, rosterPlayerIds]);

  const rosterFiltered = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return roster.filter((r) => {
      if (!q) return true;
      return playerLabel(r.player).toLowerCase().includes(q);
    });
  }, [roster, rosterSearch]);

  async function onSaveParticipation(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setBusy(true);
    try {
      await teamParticipationService.update(participationId, {
        team: detail.team.id,
        tournament_edition: editionId,
        participation_name: form.participation_name.trim(),
        status: form.status ? Number(form.status) : undefined,
        payment_status: form.payment_status,
        contact_person: form.contact_person
          ? Number(form.contact_person)
          : null,
        notes: form.notes.trim(),
        registered_at: form.registered_at || undefined,
      });
      await load();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function assignSelected() {
    const ids = [...availSelected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const playerId of ids) {
        await participationPlayerService.create({
          team_participation: participationId,
          player: playerId,
        });
      }
      await load();
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
      await load();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeParticipation() {
    setBusy(true);
    try {
      await teamParticipationService.delete(participationId);
      onRemoved();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <StateMessage variant="loading" />;
  if (!detail) {
    return <StateMessage variant="empty" message="Prijava ne obstaja." />;
  }

  return (
    <div className="stack-gap">
      <section className="border-frame border-frame--md">
        <h2>{detail.participation_name}</h2>
        <p className="muted">
          Osnovna ekipa:{" "}
          <Link to={`/teams/${detail.team.id}`}>{detail.team.name}</Link>
          {detail.team.city ? ` · ${detail.team.city}` : ""}
        </p>

        {canRegister ? (
          <form className="stack-form" onSubmit={onSaveParticipation}>
            <label>
              Ime nastopa *
              <input
                value={form.participation_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    participation_name: e.target.value,
                  }))
                }
                required
              />
            </label>
            <StatusHelpHint
              label="Status"
              statuses={statuses}
              selectedId={form.status}
              helpByCode={TEAM_PARTICIPATION_STATUS_HELP}
              fallbackHelp="status prijave ekipe"
            >
              <label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </StatusHelpHint>
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={form.payment_status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payment_status: e.target.checked,
                  }))
                }
              />
              Plačano
            </label>
            <label>
              Kontaktna oseba
              <select
                value={form.contact_person}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contact_person: e.target.value,
                  }))
                }
              >
                <option value="">—</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name} {p.first_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Datum prijave
              <input
                type="datetime-local"
                value={form.registered_at}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    registered_at: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              Opombe
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
              />
            </label>
            <div className="row-actions">
              <button
                type="submit"
                className="border-frame border-frame--sm"
                disabled={busy}
              >
                {busy ? "Shranjujem…" : "Shrani prijavo"}
              </button>
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                disabled={busy}
                onClick={() => void removeParticipation()}
              >
                Odstrani s turnirja
              </button>
            </div>
          </form>
        ) : (
          <ul className="plain-list">
            <li>Status: {detail.status?.name ?? "—"}</li>
            <li>Plačilo: {detail.payment_status ? "da" : "ne"}</li>
            <li>
              Kontakt:{" "}
              {detail.contact_person
                ? `${detail.contact_person.first_name} ${detail.contact_person.last_name}`
                : "—"}
            </li>
            <li>Opombe: {detail.notes || "—"}</li>
          </ul>
        )}
      </section>

      <section className="border-frame border-frame--md">
        <div
          className="row-actions"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.65rem",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Igralci ({roster.length})</h2>
          {canAssignPlayers ? (
            <button
              type="button"
              className="border-frame border-frame--sm"
              aria-expanded={showPlayerAssign}
              aria-label={
                showPlayerAssign ? "Skrij dodajanje igralcev" : "Dodaj igralce"
              }
              title={
                showPlayerAssign ? "Skrij dodajanje" : "Dodaj igralce"
              }
              onClick={() => setShowPlayerAssign((v) => !v)}
            >
              {showPlayerAssign ? "−" : "+"}
            </button>
          ) : null}
        </div>

        {roster.length === 0 ? (
          <p className="muted">Še ni igralcev na tej ekipi.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Igralec</th>
                  <th>Pozicija</th>
                  <th>Vloga</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster
                  .slice()
                  .sort((a, b) => {
                    const aj = a.jersey_number ?? 9999;
                    const bj = b.jersey_number ?? 9999;
                    if (aj !== bj) return aj - bj;
                    return playerLabel(a.player).localeCompare(
                      playerLabel(b.player),
                      "sl",
                    );
                  })
                  .map((r) => (
                    <tr key={r.id}>
                      <td>{r.jersey_number ?? "—"}</td>
                      <td>
                        <Link to={`/players/${r.player.id}`}>
                          {playerLabel(r.player)}
                        </Link>
                      </td>
                      <td>{r.position || "—"}</td>
                      <td>
                        {r.is_captain
                          ? "kapetan"
                          : r.is_vice_captain
                            ? "podkapetan"
                            : "—"}
                      </td>
                      <td>{r.status?.name ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {showPlayerAssign && canAssignPlayers ? (
          <div className="team-transfer" style={{ marginTop: "1rem" }}>
            <section className="team-transfer__box border-frame border-frame--sm">
              <div className="team-transfer__head">
                <h3 style={{ margin: 0 }}>Vsi igralci</h3>
                <span className="muted">{availablePlayers.length}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                Najprej bivši igralci te ekipe, nato abeceda.
              </p>
              <input
                className="team-transfer__search"
                value={availSearch}
                onChange={(e) => setAvailSearch(e.target.value)}
                placeholder="Išči igralce…"
              />
              <ul className="team-transfer__list plain-list">
                {availablePlayers.map((p) => (
                  <li key={p.id} className="team-transfer__item">
                    <label className="checkbox-row">
                      <input
                        className="sketch-check border-frame border-frame--sm"
                        type="checkbox"
                        checked={availSelected.has(p.id)}
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
                ))}
              </ul>
            </section>

            <div className="team-transfer__actions">
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={busy || availSelected.size === 0}
                onClick={() => void assignSelected()}
              >
                Dodaj →
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
                <span className="muted">{roster.length}</span>
              </div>
              <input
                className="team-transfer__search"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Išči na ekipi…"
              />
              <ul className="team-transfer__list plain-list">
                {rosterFiltered.map((r) => (
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
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
