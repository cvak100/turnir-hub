import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  adminTournamentService,
  type Sport,
  type TournamentListItem,
} from "@/modules/admin/services/tournamentService";

type SortKey = "id" | "name" | "created_at";
type SortDir = "asc" | "desc";

export function TournamentsAdminPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);

  const loadLookups = useCallback(async () => {
    setSports(await adminTournamentService.listSports());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordering = `${sortDir === "desc" ? "-" : ""}${sortKey}`;
      const page = await adminTournamentService.list({
        search: search.trim() || undefined,
        sport: sportFilter || undefined,
        is_active:
          activeFilter === ""
            ? undefined
            : activeFilter === "1"
              ? true
              : false,
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
  }, [activeFilter, search, sortDir, sortKey, sportFilter]);

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
        ? "Izbrišem / deaktiviram ta turnir?"
        : `Izbrišem / deaktiviram ${ids.length} turnirjev?`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        await adminTournamentService.delete(id);
      }
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
        title="Tournaments"
        subtitle="Dolgoročni turnirji (ne posamezne edicije)."
        actions={
          <>
            {isAdmin ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to="/dashboard_admin/tournaments/new"
              >
                + Nov turnir
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
              placeholder="ime turnirja…"
            />
          </label>
          <label className="admin-search">
            Šport
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="">Vsi</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-search">
            Aktivnost
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">Vsi</option>
              <option value="1">Aktivni</option>
              <option value="0">Neaktivni</option>
            </select>
          </label>
          <button
            type="submit"
            className="border-frame border-frame--sm"
            disabled={loading}
          >
            Išči
          </button>
          {search || sportFilter || activeFilter ? (
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setSportFilter("");
                setActiveFilter("");
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
        <StateMessage variant="empty" message="Ni turnirjev." />
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          {isAdmin ? (
            <div className="row-actions admin-bulk">
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={busy || selected.size === 0}
                onClick={() => void deleteIds([...selected])}
              >
                Izbriši / deaktiviraj ({selected.size})
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
                  <th>Šport</th>
                  <th>Aktivno</th>
                  {isAdmin ? <th>Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    {isAdmin ? (
                      <td className="col-check">
                        <input
                          className="sketch-check border-frame border-frame--sm"
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                          aria-label={`Izberi ${t.name}`}
                        />
                      </td>
                    ) : null}
                    <td>{t.id}</td>
                    <td>
                      <Link to={`/dashboard_admin/tournaments/${t.id}`}>
                        {t.name}
                      </Link>
                    </td>
                    <td>{t.sport?.name ?? "—"}</td>
                    <td>{t.is_active ? "da" : "ne"}</td>
                    {isAdmin ? (
                      <td>
                        <div className="row-actions">
                          <Link
                            className="linkish"
                            to={`/dashboard_admin/tournaments/${t.id}/edit`}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => void deleteIds([t.id])}
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
