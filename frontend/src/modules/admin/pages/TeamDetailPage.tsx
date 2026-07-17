import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  KitPreview,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { editionService } from "@/modules/editions/services/editionService";
import { personService } from "@/modules/admin/services/personService";
import {
  adminTeamParticipationService,
  adminTeamService,
  type TeamParticipationListItem,
  type TeamStatus,
} from "@/modules/admin/services/teamService";

type PartForm = {
  tournament_edition: string;
  participation_name: string;
  status: string;
  payment_status: boolean;
  contact_person: string;
  notes: string;
};

const emptyPartForm = (): PartForm => ({
  tournament_edition: "",
  participation_name: "",
  status: "",
  payment_status: false,
  contact_person: "",
  notes: "",
});

export function TeamAdminDetailPage() {
  const { id } = useParams();
  const teamId = Number(id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const team = useAsyncData(() => adminTeamService.get(teamId), [teamId]);

  const lookups = useAsyncData(async () => {
    const [statuses, editions, persons] = await Promise.all([
      adminTeamService.listStatuses(),
      editionService.list({ page_size: 200, ordering: "-year" }),
      personService.list({ page_size: 200, ordering: "last_name" }),
    ]);
    return {
      statuses,
      editions: editions.results,
      persons: persons.results,
    };
  }, []);

  const [parts, setParts] = useState<TeamParticipationListItem[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [partsError, setPartsError] = useState<unknown>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [partForm, setPartForm] = useState<PartForm>(emptyPartForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const statuses: TeamStatus[] = lookups.data?.statuses ?? [];
  const editions = lookups.data?.editions ?? [];
  const persons = lookups.data?.persons ?? [];

  const loadParts = useCallback(async () => {
    setPartsLoading(true);
    setPartsError(null);
    try {
      const page = await adminTeamParticipationService.list({
        team: teamId,
        page_size: 100,
        ordering: "-registered_at",
      });
      setParts(page.results);
    } catch (err) {
      setPartsError(err);
    } finally {
      setPartsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadParts();
  }, [loadParts]);

  function setPartField<K extends keyof PartForm>(key: K, value: PartForm[K]) {
    setPartForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setPartForm({
      ...emptyPartForm(),
      participation_name: team.data?.name ?? "",
      status: statuses.find((s) => s.code === "pending")
        ? String(statuses.find((s) => s.code === "pending")!.id)
        : statuses[0]
          ? String(statuses[0].id)
          : "",
    });
    setShowAdd(true);
  }

  async function openEdit(partId: number) {
    setActionError(null);
    setSaving(true);
    try {
      const detail = await adminTeamParticipationService.get(partId);
      setEditingId(partId);
      setPartForm({
        tournament_edition: String(detail.tournament_edition.id),
        participation_name: detail.participation_name,
        status: detail.status ? String(detail.status.id) : "",
        payment_status: detail.payment_status,
        contact_person: detail.contact_person
          ? String(detail.contact_person.id)
          : "",
        notes: detail.notes || "",
      });
      setShowAdd(true);
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  }

  function closePartForm() {
    setShowAdd(false);
    setEditingId(null);
    setPartForm(emptyPartForm());
  }

  async function onSavePart(event: FormEvent) {
    event.preventDefault();
    if (!partForm.tournament_edition) {
      setActionError(new Error("Izberi turnirsko edicijo."));
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const payload = {
        team: teamId,
        tournament_edition: Number(partForm.tournament_edition),
        participation_name: partForm.participation_name.trim(),
        status: partForm.status ? Number(partForm.status) : undefined,
        payment_status: partForm.payment_status,
        contact_person: partForm.contact_person
          ? Number(partForm.contact_person)
          : null,
        notes: partForm.notes.trim(),
      };
      if (editingId != null) {
        await adminTeamParticipationService.update(editingId, payload);
      } else {
        await adminTeamParticipationService.create(payload);
      }
      closePartForm();
      await loadParts();
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  }

  async function onDeletePart(partId: number) {
    const ok = window.confirm("Odstranim nastop te ekipe na turnirju?");
    if (!ok) return;
    setActionError(null);
    try {
      await adminTeamParticipationService.delete(partId);
      await loadParts();
    } catch (err) {
      setActionError(err);
    }
  }

  async function onDeleteTeam() {
    if (!team.data) return;
    const ok = window.confirm("Izbrišem to ekipo?");
    if (!ok) return;
    try {
      await adminTeamService.delete(team.data.id);
      navigate("/dashboard_admin/teams");
    } catch (err) {
      setActionError(err);
    }
  }

  if (team.loading) return <StateMessage variant="loading" />;
  if (team.error) return <ErrorBanner error={team.error} />;
  if (!team.data) {
    return <StateMessage variant="empty" message="Ekipa ne obstaja." />;
  }

  const data = team.data;

  return (
    <div className="page">
      <PageHeader
        title={data.name}
        subtitle={
          data.short_name
            ? `${data.short_name}${data.city ? ` · ${data.city}` : ""}`
            : data.city || undefined
        }
        actions={
          <>
            {isAdmin ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to={`/dashboard_admin/teams/${data.id}/edit`}
              >
                Uredi
              </Link>
            ) : null}
            <Link
              className="button-link border-frame border-frame--sm"
              to="/dashboard_admin/teams"
            >
              ← Nazaj na seznam
            </Link>
          </>
        }
      />

      <section className="border-frame border-frame--md">
        <h2>Osnovni podatki</h2>
        <p>
          <strong>Status:</strong> {data.status?.name ?? "—"}
        </p>
        <p>
          <strong>Leto ustanovitve:</strong> {data.founded_year ?? "—"}
        </p>
        <div>
          <strong>Dres:</strong>
          <KitPreview
            topCode={data.shirt_top}
            bottomCode={data.shirt_bottom}
          />
        </div>
        <p>
          <strong>Kontakt:</strong>{" "}
          {data.contact_person ? (
            <Link to={`/dashboard_admin/persons/${data.contact_person.id}`}>
              {data.contact_person.first_name} {data.contact_person.last_name}
              {data.contact_person.nickname
                ? ` (${data.contact_person.nickname})`
                : ""}
            </Link>
          ) : (
            "—"
          )}
        </p>
        {data.notes ? (
          <p>
            <strong>Opombe:</strong> {data.notes}
          </p>
        ) : null}
      </section>

      <section className="border-frame border-frame--md">
        <div
          className="row-actions"
          style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}
        >
          <h2 style={{ margin: 0 }}>Nastopi na turnirjih</h2>
          {isAdmin ? (
            <button
              type="button"
              className="border-frame border-frame--sm"
              onClick={openAdd}
            >
              + Dodaj nastop
            </button>
          ) : null}
        </div>

        <ErrorBanner error={partsError ?? actionError} />
        {partsLoading ? <StateMessage variant="loading" /> : null}
        {!partsLoading && parts.length === 0 ? (
          <p className="muted">Ekipa še ni nastopila na nobenem turnirju.</p>
        ) : null}

        {!partsLoading && parts.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Edicija</th>
                  <th>Ime nastopa</th>
                  <th>Status</th>
                  <th>Plačilo</th>
                  <th>Registracija</th>
                  {isAdmin ? <th>Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/editions/${p.tournament_edition.id}`}>
                        {p.tournament_edition.name} ({p.tournament_edition.year})
                      </Link>
                    </td>
                    <td>{p.participation_name}</td>
                    <td>{p.status?.name ?? "—"}</td>
                    <td>{p.payment_status ? "da" : "ne"}</td>
                    <td>
                      {p.registered_at
                        ? new Date(p.registered_at).toLocaleDateString()
                        : "—"}
                    </td>
                    {isAdmin ? (
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void openEdit(p.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void onDeletePart(p.id)}
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
        ) : null}

        {showAdd && isAdmin ? (
          <form
            className="stack-form border-frame border-frame--md"
            style={{ marginTop: "1rem" }}
            onSubmit={onSavePart}
          >
            <h3>
              {editingId != null ? "Uredi nastop" : "Nov nastop na turnirju"}
            </h3>
            <label>
              Turnirska edicija *
              <select
                value={partForm.tournament_edition}
                onChange={(e) =>
                  setPartField("tournament_edition", e.target.value)
                }
                required
                disabled={editingId != null}
              >
                <option value="">Izberi…</option>
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.tournament_name
                      ? `${ed.tournament_name} — `
                      : ""}
                    {ed.name} ({ed.year})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ime nastopa
              <input
                value={partForm.participation_name}
                onChange={(e) =>
                  setPartField("participation_name", e.target.value)
                }
                placeholder={data.name}
              />
            </label>
            <label>
              Status
              <select
                value={partForm.status}
                onChange={(e) => setPartField("status", e.target.value)}
              >
                <option value="">—</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={partForm.payment_status}
                onChange={(e) =>
                  setPartField("payment_status", e.target.checked)
                }
              />
              Plačano
            </label>
            <label>
              Kontakt za ta nastop
              <select
                value={partForm.contact_person}
                onChange={(e) =>
                  setPartField("contact_person", e.target.value)
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
              Opombe
              <textarea
                value={partForm.notes}
                onChange={(e) => setPartField("notes", e.target.value)}
                rows={2}
              />
            </label>
            <div className="row-actions">
              <button
                type="submit"
                className="border-frame border-frame--sm"
                disabled={saving}
              >
                {saving ? "Shranjujem…" : "Shrani"}
              </button>
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                disabled={saving}
                onClick={closePartForm}
              >
                Prekliči
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {isAdmin ? (
        <div className="row-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={() => void onDeleteTeam()}
          >
            Izbriši ekipo
          </button>
        </div>
      ) : null}
    </div>
  );
}
