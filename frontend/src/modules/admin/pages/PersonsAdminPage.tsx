import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  personService,
  type PersonListItem,
  type PersonRoleType,
} from "@/modules/admin/services/personService";

type SortKey =
  | "id"
  | "first_name"
  | "last_name"
  | "nickname"
  | "email"
  | "roles";

type SortDir = "asc" | "desc";

function rolesLabel(roles: { code: string; name: string }[]): string {
  return roles.map((r) => r.name).join(", ");
}

export function PersonsAdminPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<PersonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [roleTypes, setRoleTypes] = useState<PersonRoleType[]>([]);

  const loadLookups = useCallback(async () => {
    setRoleTypes(await personService.listRoleTypes());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordering = `${sortDir === "desc" ? "-" : ""}${sortKey === "roles" ? "last_name" : sortKey}`;
      const page = await personService.list({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        ordering: sortKey === "roles" ? "last_name" : ordering,
        page_size: 100,
      });
      setRows(page.results);
      setSelected(new Set());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, sortDir, sortKey]);

  useEffect(() => {
    void loadLookups().catch((err) => setError(err));
  }, [loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayed = useMemo(() => {
    if (sortKey !== "roles") return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = rolesLabel(a.roles).toLowerCase();
      const bv = rolesLabel(b.roles).toLowerCase();
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortDir, sortKey]);

  const allSelected =
    displayed.length > 0 && displayed.every((r) => selected.has(r.id));

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
    setSelected(new Set(displayed.map((r) => r.id)));
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
        ? "Izbrišem to osebo?"
        : `Izbrišem ${ids.length} oseb?`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        await personService.delete(id);
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
        title="Persons"
        subtitle="Vsi ljudje v sistemu — vloge so ločene od auth pravic."
        actions={
          <>
            {isAdmin ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to="/dashboard_admin/persons/new"
              >
                + Nova oseba
              </Link>
            ) : null}
            <Link className="button-link border-frame border-frame--sm" to="/dashboard_admin">
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
              placeholder="ime, priimek, email…"
            />
          </label>
          <label className="admin-search">
            Vloga
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Vse</option>
              {roleTypes.map((rt) => (
                <option key={rt.id} value={rt.code}>
                  {rt.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="border-frame border-frame--sm" disabled={loading}>
            Išči
          </button>
          {search || roleFilter ? (
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setRoleFilter("");
              }}
            >
              Počisti
            </button>
          ) : null}
        </form>
      </section>

      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      {!loading && displayed.length === 0 ? (
        <StateMessage variant="empty" message="Ni oseb." />
      ) : null}

      {!loading && displayed.length > 0 ? (
        <section className="border-frame border-frame--md">
          {isAdmin ? (
            <div className="row-actions admin-bulk">
              <button
                type="button"
                className="border-frame border-frame--sm"
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
                      onClick={() => toggleSort("last_name")}
                    >
                      Priimek{sortMark("last_name")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("first_name")}
                    >
                      Ime{sortMark("first_name")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("nickname")}
                    >
                      Vzdevek{sortMark("nickname")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("email")}
                    >
                      Email{sortMark("email")}
                    </button>
                  </th>
                  <th>User</th>
                  <th>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => toggleSort("roles")}
                    >
                      Roles{sortMark("roles")}
                    </button>
                  </th>
                  <th>Status</th>
                  {isAdmin ? <th>Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {displayed.map((person) => (
                  <tr key={person.id}>
                    {isAdmin ? (
                      <td className="col-check">
                        <input
                          className="sketch-check border-frame border-frame--sm"
                          type="checkbox"
                          checked={selected.has(person.id)}
                          onChange={() => toggleOne(person.id)}
                          aria-label={`Izberi ${person.first_name} ${person.last_name}`}
                        />
                      </td>
                    ) : null}
                    <td>{person.id}</td>
                    <td>
                      <Link to={`/dashboard_admin/persons/${person.id}`}>
                        {person.last_name}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/dashboard_admin/persons/${person.id}`}>
                        {person.first_name}
                      </Link>
                    </td>
                    <td>{person.nickname || "—"}</td>
                    <td>{person.email || "—"}</td>
                    <td>
                      {person.user
                        ? `${person.user.username} (#${person.user.id})`
                        : "—"}
                    </td>
                    <td>
                      <div className="role-badges">
                        {person.roles.length === 0
                          ? "—"
                          : person.roles.map((r) => (
                              <span
                                key={r.id}
                                className="role-badge border-frame border-frame--sm"
                              >
                                {r.name}
                              </span>
                            ))}
                      </div>
                    </td>
                    <td>{person.status?.name ?? "—"}</td>
                    {isAdmin ? (
                      <td>
                        <div className="row-actions">
                          <Link
                            className="linkish"
                            to={`/dashboard_admin/persons/${person.id}/edit`}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => void deleteIds([person.id])}
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
