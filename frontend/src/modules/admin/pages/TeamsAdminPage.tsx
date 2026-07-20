import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  adminTeamService,
  type TeamListItem,
  type TeamStatus,
} from "@/modules/admin/services/teamService";

type SortKey = "id" | "name" | "short_name" | "city";
type SortDir = "asc" | "desc";

export function TeamsAdminPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState<TeamStatus[]>([]);
  const [bulkStatusId, setBulkStatusId] = useState("");

  const loadLookups = useCallback(async () => {
    setStatuses(await adminTeamService.listStatuses());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordering = `${sortDir === "desc" ? "-" : ""}${sortKey}`;
      const page = await adminTeamService.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        ordering,
        page_size: 100,
      });
      setRows(page.results);
      setSelected(new Set());
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
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteIds(ids: number[]) {
    if (ids.length === 0) return;
    const ok = window.confirm(
      ids.length === 1
        ? "Izbrišem to ekipo?"
        : `Izbrišem ${ids.length} ekip?`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        await adminTeamService.delete(id);
      }
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function applyBulkStatus(ids: number[], statusId: number) {
    if (ids.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        await adminTeamService.update(id, { status: statusId });
      }
      setBulkStatusId("");
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
    <div className="page">
      <PageHeader
        title="Teams"
        subtitle="Ekipe v sistemu (klubi / dolgoročne identity)."
        actions={
          <>
            {isAdmin ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to="/dashboard_admin/teams/new"
              >
                + Nova ekipa
              </Link>
            ) : null}
            <Link
              className="button-link border-frame border-frame--sm"
              to="/dashboard_admin"
            >
              ← Dashboard Admin
            </Link>
          </>
        }
      />

      <section className="border-frame border-frame--md">
        <form
          className="row-actions"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <label className="admin-search">
            Iskanje
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ime, kratko ime, mesto…"
            />
          </label>
          <label className="admin-search">
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
          <button
            type="submit"
            className="border-frame border-frame--sm"
            disabled={loading}
          >
            Išči
          </button>
          {search || statusFilter ? (
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setStatusFilter("");
              }}
            >
              Počisti
            </button>
          ) : null}
        </form>
      </section>

      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}
      {!loading && rows.length === 0 ? (
        <StateMessage variant="empty" message="Ni ekip." />
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          {isAdmin ? (
            <div className="row-actions admin-bulk">
              <label className="admin-search">
                Status za izbrane
                <select
                  value={bulkStatusId}
                  disabled={busy || selected.size === 0}
                  onChange={(e) => setBulkStatusId(e.target.value)}
                >
                  <option value="">— izberi status —</option>
                  {statuses.map((s) => (
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
                  void applyBulkStatus([...selected], Number(bulkStatusId))
                }
              >
                Spremeni status ({selected.size})
              </button>
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                disabled={busy || selected.size === 0}
                onClick={() => void deleteIds([...selected])}
              >
                Izbriši izbrane ({selected.size})
              </button>
            </div>
          ) : null}

          <div className="admin-table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  {isAdmin ? (
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
                      onClick={() => toggleSort("id")}
                    >
                      ID{sortMark("id")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("name")}
                    >
                      Ime{sortMark("name")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("short_name")}
                    >
                      Kratko{sortMark("short_name")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("city")}
                    >
                      Mesto{sortMark("city")}
                    </button>
                  </th>
                  <th>Status</th>
                  {isAdmin ? <th>Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((team) => (
                  <tr key={team.id}>
                    {isAdmin ? (
                      <td className="col-check">
                        <input
                          className="sketch-check border-frame border-frame--sm"
                          type="checkbox"
                          checked={selected.has(team.id)}
                          onChange={() => toggleOne(team.id)}
                          aria-label={`Izberi ${team.name}`}
                        />
                      </td>
                    ) : null}
                    <td>{team.id}</td>
                    <td>
                      <Link to={`/dashboard_admin/teams/${team.id}`}>
                        {team.name}
                      </Link>
                    </td>
                    <td>{team.short_name || "—"}</td>
                    <td>{team.city || "—"}</td>
                    <td>{team.status?.name ?? "—"}</td>
                    {isAdmin ? (
                      <td>
                        <div className="row-actions">
                          <Link
                            className="linkish"
                            to={`/dashboard_admin/teams/${team.id}/edit`}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => void deleteIds([team.id])}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
