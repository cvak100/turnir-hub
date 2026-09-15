import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { isApiError } from "@/shared/api";
import { editionService } from "@/modules/editions/services/editionService";
import {
  rbacService,
  type AuthUserBrief,
  type PermissionItem,
  type RoleItem,
  type UserRoleItem,
} from "../services/rbacService";

function normalizeList<T>(data: { results: T[] } | T[] | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

type TabKey = "assignments" | "roles";

export function RolesAdminPage() {
  const [tab, setTab] = useState<TabKey>("assignments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [users, setUsers] = useState<AuthUserBrief[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([]);
  const [editions, setEditions] = useState<
    { id: number; name: string; year: number }[]
  >([]);

  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [editionId, setEditionId] = useState("");

  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
  const [draftPermIds, setDraftPermIds] = useState<Set<number>>(new Set());
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData, usersData, assignments, editionsPage] =
        await Promise.all([
          rbacService.listRoles(),
          rbacService.listPermissions(),
          rbacService.listUsers(),
          rbacService.listUserRoles(),
          editionService.list({ page_size: 100 }),
        ]);
      setRoles(rolesData);
      setPermissions(permsData);
      setUsers(usersData);
      setUserRoles(normalizeList(assignments));
      setEditions(
        (editionsPage.results ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          year: e.year,
        })),
      );
      setSelectedRoleId((prev) => {
        if (prev !== "") return prev;
        return rolesData[0]?.id ?? "";
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  useEffect(() => {
    if (!selectedRole) return;
    setDraftPermIds(new Set(selectedRole.permission_ids ?? []));
    setSaveMsg(null);
  }, [selectedRole]);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    if (!userId || !roleId) {
      setError(new Error("Izberi uporabnika in vlogo."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await rbacService.createUserRole({
        user: Number(userId),
        role: Number(roleId),
        tournament_edition: editionId ? Number(editionId) : null,
      });
      setUserId("");
      setRoleId("");
      setEditionId("");
      const assignments = await rbacService.listUserRoles();
      setUserRoles(normalizeList(assignments));
    } catch (err) {
      setError(isApiError(err) ? new Error(err.message) : err);
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveAssignment(id: number) {
    const ok = window.confirm("Odstranim to dodelitev vloge?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await rbacService.deleteUserRole(id);
      setUserRoles((rows) => rows.filter((r) => r.id !== id));
    } catch (err) {
      setError(isApiError(err) ? new Error(err.message) : err);
    } finally {
      setBusy(false);
    }
  }

  function togglePerm(id: number) {
    setDraftPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaveMsg(null);
  }

  async function saveRolePermissions() {
    if (!selectedRole) return;
    setBusy(true);
    setError(null);
    setSaveMsg(null);
    try {
      const updated = await rbacService.updateRole(selectedRole.id, {
        permission_ids: [...draftPermIds],
      });
      setRoles((rows) =>
        rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
      setSaveMsg("Pravice shranjene.");
    } catch (err) {
      setError(isApiError(err) ? new Error(err.message) : err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Urejanje pravic / vlog"
        subtitle="Dodeljevanje vlog uporabnikom in urejanje pravic vlog."
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to="/dashboard_admin"
          >
            Nazaj
          </Link>
        }
      />
      <ErrorBanner error={error} />

      <div className="public-filter-row row-actions">
        <button
          type="button"
          className={
            tab === "assignments"
              ? "border-frame border-frame--sm"
              : "button-secondary border-frame border-frame--sm"
          }
          onClick={() => setTab("assignments")}
        >
          Dodelitve
        </button>
        <button
          type="button"
          className={
            tab === "roles"
              ? "border-frame border-frame--sm"
              : "button-secondary border-frame border-frame--sm"
          }
          onClick={() => setTab("roles")}
        >
          Vloge in pravice
        </button>
      </div>

      {loading ? <StateMessage variant="loading" /> : null}

      {!loading && tab === "assignments" ? (
        <>
          <section className="border-frame border-frame--md">
            <h2>Nova dodelitev</h2>
            <form className="stack-form" onSubmit={onAssign}>
              <label>
                Uporabnik
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— izberi —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                      {u.is_superuser ? " (admin)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Vloga
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— izberi —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Edicija (opcijsko — prazno = globalno)
                <select
                  value={editionId}
                  onChange={(e) => setEditionId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— globalno —</option>
                  {editions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name} ({ed.year})
                    </option>
                  ))}
                </select>
              </label>
              <div className="row-actions">
                <button
                  type="submit"
                  className="border-frame border-frame--sm"
                  disabled={busy}
                >
                  {busy ? "Shranjujem…" : "Dodeli vlogo"}
                </button>
              </div>
            </form>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Obstoječe dodelitve</h2>
            {userRoles.length === 0 ? (
              <p className="muted">Ni dodelitev.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Uporabnik</th>
                      <th>Vloga</th>
                      <th>Obseg</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {userRoles.map((row) => (
                      <tr key={row.id}>
                        <td>{row.user_username}</td>
                        <td>
                          {row.role_name}{" "}
                          <span className="muted">({row.role_slug})</span>
                        </td>
                        <td>
                          {row.tournament_edition == null
                            ? "Globalno"
                            : row.tournament_edition_name ||
                              `Edicija #${row.tournament_edition}`}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button-link border-frame border-frame--sm"
                            disabled={busy}
                            onClick={() => void onRemoveAssignment(row.id)}
                          >
                            Odstrani
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {!loading && tab === "roles" ? (
        <section className="border-frame border-frame--md">
          <h2>Pravice vloge</h2>
          <label className="stack-form" style={{ maxWidth: "24rem" }}>
            Vloga
            <select
              value={selectedRoleId === "" ? "" : String(selectedRoleId)}
              onChange={(e) =>
                setSelectedRoleId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— izberi —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.slug})
                </option>
              ))}
            </select>
          </label>

          {selectedRole ? (
            <>
              {selectedRole.description ? (
                <p className="muted">{selectedRole.description}</p>
              ) : null}
              {saveMsg ? <p className="account-success">{saveMsg}</p> : null}
              <ul className="plain-list roles-perm-list">
                {permissions.map((p) => (
                  <li key={p.id}>
                    <label className="roles-perm-item">
                      <input
                        type="checkbox"
                        checked={draftPermIds.has(p.id)}
                        onChange={() => togglePerm(p.id)}
                        disabled={busy}
                      />
                      <span>
                        <strong>{p.code}</strong>
                        {p.name ? ` — ${p.name}` : ""}
                        {p.description ? (
                          <span className="muted"> · {p.description}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="row-actions">
                <button
                  type="button"
                  className="border-frame border-frame--sm"
                  disabled={busy}
                  onClick={() => void saveRolePermissions()}
                >
                  {busy ? "Shranjujem…" : "Shrani pravice"}
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Izberi vlogo.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
