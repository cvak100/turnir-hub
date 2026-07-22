import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  CATALOG_GROUPS,
  catalogAdminService,
  type CatalogEntityConfig,
  type CatalogField,
  type CatalogRow,
} from "@/modules/admin/services/catalogService";

function emptyDraft(fields: CatalogField[]): Record<string, string | boolean> {
  const draft: Record<string, string | boolean> = {};
  for (const field of fields) {
    if (field.type === "checkbox") draft[field.key] = true;
    else if (field.type === "number") draft[field.key] = "0";
    else draft[field.key] = "";
  }
  return draft;
}

function rowToDraft(
  row: CatalogRow,
  fields: CatalogField[],
): Record<string, string | boolean> {
  const draft = emptyDraft(fields);
  for (const field of fields) {
    const value = row[field.key];
    if (field.type === "checkbox") {
      draft[field.key] = Boolean(value);
    } else if (value == null) {
      draft[field.key] = field.type === "number" ? "0" : "";
    } else {
      draft[field.key] = String(value);
    }
  }
  return draft;
}

function draftToPayload(
  draft: Record<string, string | boolean>,
  fields: CatalogField[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = draft[field.key];
    if (field.type === "checkbox") {
      body[field.key] = Boolean(raw);
      continue;
    }
    if (field.type === "number") {
      const n = Number(raw);
      body[field.key] = Number.isFinite(n) ? n : 0;
      continue;
    }
    body[field.key] = typeof raw === "string" ? raw.trim() : raw;
  }
  return body;
}

function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "da" : "ne";
  if (value == null || value === "") return "—";
  return String(value);
}

function CatalogEntityPanel({
  entity,
  canEdit,
}: {
  entity: CatalogEntityConfig;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft(entity.fields));

  const displayKeys = useMemo(() => {
    if (entity.displayKeys?.length) return entity.displayKeys;
    return entity.fields
      .map((f) => f.key)
      .filter((k) => k !== "description")
      .slice(0, 5);
  }, [entity]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await catalogAdminService.list(entity.endpoint, {
        search: search.trim() || undefined,
        ordering: entity.fields.some((f) => f.key === "order")
          ? "order"
          : "name",
      });
      setRows(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [entity.endpoint, entity.fields, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft(entity.fields));
  }

  function startEdit(row: CatalogRow) {
    setCreating(false);
    setEditingId(row.id);
    setDraft(rowToDraft(row, entity.fields));
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyDraft(entity.fields));
  }

  async function saveForm() {
    setBusy(true);
    setError(null);
    try {
      const body = draftToPayload(draft, entity.fields);
      if (creating) {
        await catalogAdminService.create(entity.endpoint, body);
      } else if (editingId != null) {
        await catalogAdminService.update(entity.endpoint, editingId, body);
      }
      cancelForm();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(id: number) {
    const ok = window.confirm("Izbrišem ta vnos?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await catalogAdminService.delete(entity.endpoint, id);
      if (editingId === id) cancelForm();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const showForm = creating || editingId != null;

  return (
    <div className="border-frame border-frame--sm" style={{ padding: "0.75rem" }}>
      <div
        className="row-actions"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{entity.label}</h3>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {entity.description}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="border-frame border-frame--sm"
            disabled={busy}
            onClick={startCreate}
          >
            + Dodaj
          </button>
        ) : null}
      </div>

      <form
        className="row-actions"
        style={{ marginTop: "0.75rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="admin-search">
          Iskanje
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ime, koda…"
          />
        </label>
        <button type="submit" className="border-frame border-frame--sm">
          Išči
        </button>
      </form>

      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      {showForm ? (
        <div className="stack-form" style={{ marginTop: "0.75rem" }}>
          <h4 style={{ margin: 0 }}>
            {creating ? "Nov vnos" : `Uredi #${editingId}`}
          </h4>
          <div className="row-actions row-actions--fields">
            {entity.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    className="sketch-check border-frame border-frame--sm"
                    checked={Boolean(draft[field.key])}
                    disabled={busy}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [field.key]: e.target.checked,
                      }))
                    }
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    value={String(draft[field.key] ?? "")}
                    disabled={busy}
                    rows={2}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                    }
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(draft[field.key] ?? "")}
                    disabled={busy}
                    placeholder={field.placeholder}
                    required={field.required}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => void saveForm()}
            >
              {busy ? "Shranjujem…" : "Shrani"}
            </button>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={cancelForm}
            >
              Prekliči
            </button>
          </div>
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="muted">Ni vnosov.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="admin-table-wrap" style={{ marginTop: "0.75rem" }}>
          <table className="data-table admin-table">
            <thead>
              <tr>
                <th>ID</th>
                {displayKeys.map((key) => (
                  <th key={key}>
                    {entity.fields.find((f) => f.key === key)?.label ?? key}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  {displayKeys.map((key) => (
                    <td key={key}>{displayValue(row[key])}</td>
                  ))}
                  <td>
                    <div className="row-actions">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            className="border-frame border-frame--sm"
                            disabled={busy}
                            onClick={() => startEdit(row)}
                          >
                            Uredi
                          </button>
                          <button
                            type="button"
                            className="border-frame border-frame--sm"
                            disabled={busy}
                            onClick={() => void removeRow(row.id)}
                          >
                            Izbriši
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function CatalogAdminPage() {
  const { isAdmin } = useAuth();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(CATALOG_GROUPS.map((g) => g.id)),
  );

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Katalog / šifranti"
        subtitle="Urejanje statusov, nagrad, tipov dogodkov in drugih atributov (ne main entitete)."
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to="/dashboard_admin"
          >
            ← Dashboard Admin
          </Link>
        }
      />

      {!isAdmin ? (
        <StateMessage variant="error" message="Samo admin lahko ureja katalog." />
      ) : null}

      {CATALOG_GROUPS.map((group) => {
        const open = openGroups.has(group.id);
        return (
          <section
            key={group.id}
            className="border-frame border-frame--md"
            style={{ marginBottom: "1rem" }}
          >
            <div
              className="row-actions"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: open ? "0.75rem" : 0,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{group.title}</h2>
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  {group.description}
                </p>
              </div>
              <button
                type="button"
                className="border-frame border-frame--sm"
                onClick={() => toggleGroup(group.id)}
              >
                {open ? "Skrij" : "Prikaži"}
              </button>
            </div>
            {open ? (
              <div className="stack-form">
                {group.entities.map((entity) => (
                  <CatalogEntityPanel
                    key={entity.key}
                    entity={entity}
                    canEdit={isAdmin}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
