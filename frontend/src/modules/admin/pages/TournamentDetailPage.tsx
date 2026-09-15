import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  IntegerStepper,
  PageHeader,
  StateMessage,
  StatusHelpHint,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { personService } from "@/modules/admin/services/personService";
import {
  adminEditionService,
  adminTournamentService,
  sortRuleTemplates,
  type EditionListItem,
  type GlobalRuleTemplate,
  type TournamentCategory,
  type TournamentFormat,
  type TournamentStatus,
} from "@/modules/admin/services/tournamentService";
import {
  emptyNewRuleTemplateForm,
  NewRuleTemplateFormFields,
  rulesTextForTemplate,
  toRuleTemplateInput,
  type NewRuleTemplateFormState,
} from "@/modules/admin/components/NewRuleTemplateFormFields";

type EditionForm = {
  name: string;
  year: string;
  start_date: string;
  end_date: string;
  status: string;
  format: string;
  category: string;
  location: string;
  is_public: boolean;
  max_teams: string;
  max_players_per_team: string;
  registration_start: string;
  registration_end: string;
  contact_person: string;
  entry_fee: string;
  public_rules: string;
  global_rule_template: string;
};

const emptyEditionForm = (): EditionForm => ({
  name: "",
  year: String(new Date().getFullYear()),
  start_date: "",
  end_date: "",
  status: "",
  format: "",
  category: "",
  location: "",
  is_public: true,
  max_teams: "",
  max_players_per_team: "20",
  registration_start: "",
  registration_end: "",
  contact_person: "",
  entry_fee: "",
  public_rules: "",
  global_rule_template: "",
});

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRuleTemplatePreview(t: GlobalRuleTemplate): string {
  const parts: string[] = [];
  if (!t.is_system) parts.push("moja");
  if (t.players_per_team != null) parts.push(`${t.players_per_team} na igrišču`);
  if (t.match_duration_minutes != null) {
    parts.push(`${t.match_duration_minutes} min`);
  }
  if (t.ball_size != null) parts.push(`žoga ${t.ball_size}`);
  if (t.max_team_fouls != null) parts.push(`napake ${t.max_team_fouls}`);
  if (t.description.trim()) parts.push(t.description.trim());
  return parts.join(" · ") || t.name;
}

export function TournamentAdminDetailPage() {
  const { id } = useParams();
  const tournamentId = Number(id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const tournament = useAsyncData(
    () => adminTournamentService.get(tournamentId),
    [tournamentId],
  );

  const lookups = useAsyncData(async () => {
    const [statuses, persons, ruleTemplates, formats, categories] =
      await Promise.all([
        adminTournamentService.listStatuses(),
        personService.list({ page_size: 200, ordering: "last_name" }),
        adminTournamentService.listRuleTemplates(),
        adminTournamentService.listFormats(),
        adminTournamentService.listCategories(),
      ]);
    return {
      statuses,
      persons: persons.results,
      ruleTemplates,
      formats,
      categories,
    };
  }, []);

  const [editions, setEditions] = useState<EditionListItem[]>([]);
  const [editionsLoading, setEditionsLoading] = useState(true);
  const [editionsError, setEditionsError] = useState<unknown>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editionForm, setEditionForm] = useState<EditionForm>(emptyEditionForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [showNewRuleTemplate, setShowNewRuleTemplate] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState<NewRuleTemplateFormState>(
    emptyNewRuleTemplateForm,
  );

  const statuses: TournamentStatus[] = lookups.data?.statuses ?? [];
  const persons = lookups.data?.persons ?? [];
  const ruleTemplates: GlobalRuleTemplate[] = sortRuleTemplates(
    lookups.data?.ruleTemplates ?? [],
  );
  const formats: TournamentFormat[] = lookups.data?.formats ?? [];
  const categories: TournamentCategory[] = lookups.data?.categories ?? [];
  const selectedRuleTemplate = ruleTemplates.find(
    (t) => String(t.id) === editionForm.global_rule_template,
  );
  const selectedFormat = formats.find(
    (f) => String(f.id) === editionForm.format,
  );

  const loadEditions = useCallback(async () => {
    setEditionsLoading(true);
    setEditionsError(null);
    try {
      const page = await adminEditionService.list({
        tournament: tournamentId,
        page_size: 100,
        ordering: "-year",
      });
      setEditions(page.results);
    } catch (err) {
      setEditionsError(err);
    } finally {
      setEditionsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void loadEditions();
  }, [loadEditions]);

  function setEditionField<K extends keyof EditionForm>(
    key: K,
    value: EditionForm[K],
  ) {
    setEditionForm((f) => ({ ...f, [key]: value }));
  }

  function defaultStatusId() {
    const draft = statuses.find((s) => s.code === "draft");
    return draft
      ? String(draft.id)
      : statuses[0]
        ? String(statuses[0].id)
        : "";
  }

  function openAdd() {
    setEditingId(null);
    const year = new Date().getFullYear();
    const defaultFormat =
      formats.find((f) => f.code === "group_knockout") ?? formats[0];
    setEditionForm({
      ...emptyEditionForm(),
      name: tournament.data
        ? `${tournament.data.name} ${year}`
        : String(year),
      year: String(year),
      status: defaultStatusId(),
      format: defaultFormat ? String(defaultFormat.id) : "",
    });
    setShowAdd(true);
  }

  async function openEdit(editionId: number) {
    setActionError(null);
    setSaving(true);
    try {
      const detail = await adminEditionService.get(editionId);
      setEditingId(editionId);
      setEditionForm({
        name: detail.name,
        year: String(detail.year),
        start_date: detail.start_date || "",
        end_date: detail.end_date || "",
        status: detail.status ? String(detail.status.id) : "",
        format: detail.format ? String(detail.format.id) : "",
        category: detail.category ? String(detail.category.id) : "",
        location: detail.location || "",
        is_public: detail.is_public,
        max_teams:
          detail.max_teams != null ? String(detail.max_teams) : "",
        max_players_per_team:
          detail.max_players_per_team != null
            ? String(detail.max_players_per_team)
            : "",
        registration_start: toDateTimeLocal(detail.registration_start),
        registration_end: toDateTimeLocal(detail.registration_end),
        contact_person: detail.contact_person
          ? String(detail.contact_person.id)
          : "",
        entry_fee: detail.entry_fee || "",
        public_rules: detail.public_rules || "",
        global_rule_template: detail.global_rule_template
          ? String(detail.global_rule_template.id)
          : "",
      });
      setShowAdd(true);
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  }

  function closeEditionForm() {
    setShowAdd(false);
    setEditingId(null);
    setEditionForm(emptyEditionForm());
  }

  async function createNewRuleTemplate() {
    const payload = toRuleTemplateInput(newRuleForm);
    if (!payload.name) {
      setActionError(new Error("Vpiši ime novih pravil."));
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const created = await adminTournamentService.createRuleTemplate(payload);
      lookups.reload();
      setEditionForm((f) => ({
        ...f,
        global_rule_template: String(created.id),
        public_rules: created.full_rules_text || payload.full_rules_text || "",
        max_players_per_team:
          created.max_players_on_roster != null
            ? String(created.max_players_on_roster)
            : f.max_players_per_team,
      }));
      setShowNewRuleTemplate(false);
      setNewRuleForm(emptyNewRuleTemplateForm());
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdition(event: FormEvent) {
    event.preventDefault();
    if (!editionForm.status) {
      setActionError(new Error("Izberi status edicije."));
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const payload = {
        tournament: tournamentId,
        name: editionForm.name.trim(),
        year: Number(editionForm.year),
        start_date: editionForm.start_date,
        end_date: editionForm.end_date,
        status: Number(editionForm.status),
        format: editionForm.format ? Number(editionForm.format) : null,
        category: editionForm.category
          ? Number(editionForm.category)
          : null,
        location: editionForm.location.trim(),
        is_public: editionForm.is_public,
        max_teams: editionForm.max_teams
          ? Number(editionForm.max_teams)
          : null,
        max_players_per_team: editionForm.max_players_per_team
          ? Number(editionForm.max_players_per_team)
          : null,
        registration_start: editionForm.registration_start || null,
        registration_end: editionForm.registration_end || null,
        contact_person: editionForm.contact_person
          ? Number(editionForm.contact_person)
          : null,
        entry_fee: editionForm.entry_fee.trim() || null,
        public_rules: editionForm.public_rules.trim(),
        global_rule_template: editionForm.global_rule_template
          ? Number(editionForm.global_rule_template)
          : null,
        apply_format_phases: false,
      };
      if (editingId != null) {
        await adminEditionService.update(editingId, payload);
      } else {
        await adminEditionService.create(payload);
      }
      closeEditionForm();
      await loadEditions();
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteEdition(editionId: number) {
    const ok = window.confirm("Izbrišem to edicijo?");
    if (!ok) return;
    setActionError(null);
    try {
      await adminEditionService.delete(editionId);
      await loadEditions();
    } catch (err) {
      setActionError(err);
    }
  }

  async function onDeleteTournament() {
    if (!tournament.data) return;
    const ok = window.confirm(
      "Izbrišem / deaktiviram ta turnir? Če ima edicije, bo le deaktiviran.",
    );
    if (!ok) return;
    try {
      await adminTournamentService.delete(tournament.data.id);
      navigate("/dashboard_admin/tournaments");
    } catch (err) {
      setActionError(err);
    }
  }

  if (tournament.loading) return <StateMessage variant="loading" />;
  if (tournament.error) return <ErrorBanner error={tournament.error} />;
  if (!tournament.data) {
    return <StateMessage variant="empty" message="Turnir ne obstaja." />;
  }

  const data = tournament.data;

  return (
    <div className="page">
      <PageHeader
        title={data.name}
        subtitle={data.sport?.name}
        actions={
          <>
            <Link
              className="button-link border-frame border-frame--sm"
              to={`/dashboard_admin/tournaments/${data.id}/events`}
            >
              Dogodki
            </Link>
            {isAdmin ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to={`/dashboard_admin/tournaments/${data.id}/edit`}
              >
                Uredi
              </Link>
            ) : null}
            <Link
              className="button-link border-frame border-frame--sm"
              to="/dashboard_admin/tournaments"
            >
              ← Nazaj na seznam
            </Link>
          </>
        }
      />

      <section className="border-frame border-frame--md">
        <h2>Osnovni podatki</h2>
        <p>
          <strong>Šport:</strong> {data.sport?.name ?? "—"}
        </p>
        <p>
          <strong>Aktivno:</strong> {data.is_active ? "da" : "ne"}
        </p>
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
        {data.description ? (
          <p>
            <strong>Opis:</strong> {data.description}
          </p>
        ) : null}
      </section>

      <section className="border-frame border-frame--md">
        <div
          className="row-actions"
          style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}
        >
          <h2 style={{ margin: 0 }}>Edicije</h2>
          {isAdmin ? (
            <button
              type="button"
              className="border-frame border-frame--sm"
              onClick={openAdd}
            >
              + Nova edicija
            </button>
          ) : null}
        </div>

        <ErrorBanner error={editionsError ?? actionError} />
        {editionsLoading ? <StateMessage variant="loading" /> : null}
        {!editionsLoading && editions.length === 0 ? (
          <p className="muted">Ta turnir še nima edicij.</p>
        ) : null}

        {!editionsLoading && editions.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Leto</th>
                  <th>Ime</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th>Datum</th>
                  <th>Javno</th>
                  {isAdmin ? <th>Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {editions.map((ed) => (
                  <tr key={ed.id}>
                    <td>{ed.year}</td>
                    <td>
                      <Link to={`/editions/${ed.id}`}>{ed.name}</Link>
                    </td>
                    <td>{ed.format?.name ?? "—"}</td>
                    <td>{ed.status?.name ?? "—"}</td>
                    <td>
                      {ed.start_date} – {ed.end_date}
                    </td>
                    <td>{ed.is_public ? "da" : "ne"}</td>
                    {isAdmin ? (
                      <td>
                        <div className="row-actions">
                          <Link className="linkish" to={`/editions/${ed.id}/teams`}>
                            Ekipe
                          </Link>
                          <Link className="linkish" to={`/editions/${ed.id}/players`}>
                            Prijava igralcev
                          </Link>
                          <Link className="linkish" to={`/editions/${ed.id}/phases`}>
                            Faze
                          </Link>
                          <Link
                            className="linkish"
                            to={`/dashboard_admin/tournaments/${tournamentId}/events?edition=${ed.id}`}
                          >
                            Dogodki
                          </Link>
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void openEdit(ed.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void onDeleteEdition(ed.id)}
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
            onSubmit={onSaveEdition}
          >
            <h3>
              {editingId != null ? "Uredi edicijo" : "Nova edicija"}
            </h3>
            <label>
              Ime *
              <input
                value={editionForm.name}
                onChange={(e) => setEditionField("name", e.target.value)}
                required
              />
            </label>
            <label>
              Leto *
              <input
                type="number"
                min={1900}
                max={2100}
                value={editionForm.year}
                onChange={(e) => setEditionField("year", e.target.value)}
                required
              />
            </label>
            <label>
              Začetek *
              <input
                type="date"
                value={editionForm.start_date}
                onChange={(e) =>
                  setEditionField("start_date", e.target.value)
                }
                required
              />
            </label>
            <label>
              Konec *
              <input
                type="date"
                value={editionForm.end_date}
                onChange={(e) => setEditionField("end_date", e.target.value)}
                required
              />
            </label>
            <StatusHelpHint
              statuses={statuses}
              selectedId={editionForm.status}
            >
              <label>
                <select
                  value={editionForm.status}
                  onChange={(e) => setEditionField("status", e.target.value)}
                  required
                >
                  <option value="">Izberi…</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </StatusHelpHint>
            <label>
              Format turnirja
              <select
                value={editionForm.format}
                onChange={(e) => setEditionField("format", e.target.value)}
              >
                <option value="">— brez formata —</option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedFormat ? (
              <p className="muted rule-template-preview">
                {selectedFormat.description}
                {selectedFormat.default_phases.length > 0
                  ? ` · Faze: ${selectedFormat.default_phases
                      .map((p) => p.name)
                      .join(" → ")}`
                  : " · Faze dodaš ročno"}
                {editingId == null
                  ? " · Ob ustvarjanju se faze ustvarijo samodejno."
                  : " · Obstoječe faze uredi na strani Faze."}
              </p>
            ) : null}
            <label>
              Kategorija
              <select
                value={editionForm.category}
                onChange={(e) => setEditionField("category", e.target.value)}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lokacija
              <input
                value={editionForm.location}
                onChange={(e) => setEditionField("location", e.target.value)}
              />
            </label>
            <label>
              Max. ekip
              <IntegerStepper
                value={editionForm.max_teams}
                onChange={(v) => setEditionField("max_teams", v)}
                min={1}
                max={256}
                aria-label="Max. ekip"
              />
            </label>
            <label>
              Max. igralcev / ekipa
              <IntegerStepper
                value={editionForm.max_players_per_team}
                onChange={(v) => setEditionField("max_players_per_team", v)}
                min={1}
                max={99}
                aria-label="Max. igralcev na ekipo"
              />
            </label>
            <label>
              Registracija od
              <input
                type="datetime-local"
                value={editionForm.registration_start}
                onChange={(e) =>
                  setEditionField("registration_start", e.target.value)
                }
              />
            </label>
            <label>
              Registracija do
              <input
                type="datetime-local"
                value={editionForm.registration_end}
                onChange={(e) =>
                  setEditionField("registration_end", e.target.value)
                }
              />
            </label>
            <label>
              Kontakt
              <select
                value={editionForm.contact_person}
                onChange={(e) =>
                  setEditionField("contact_person", e.target.value)
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
              Prijava (entry fee)
              <input
                value={editionForm.entry_fee}
                onChange={(e) => setEditionField("entry_fee", e.target.value)}
                placeholder="npr. 50.00"
              />
            </label>
            <label>
              Javna pravila (predloga)
              <select
                value={editionForm.global_rule_template}
                onChange={(e) => {
                  const id = e.target.value;
                  const tpl = ruleTemplates.find((t) => String(t.id) === id);
                  setEditionForm((f) => ({
                    ...f,
                    global_rule_template: id,
                    max_players_per_team:
                      tpl?.max_players_on_roster != null
                        ? String(tpl.max_players_on_roster)
                        : f.max_players_per_team,
                    public_rules: tpl
                      ? rulesTextForTemplate(tpl)
                      : f.public_rules,
                  }));
                }}
              >
                <option value="">— izberi predlogo —</option>
                {ruleTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.is_system ? "" : " (moja)"}
                  </option>
                ))}
              </select>
            </label>
            {selectedRuleTemplate ? (
              <p className="muted rule-template-preview">
                {formatRuleTemplatePreview(selectedRuleTemplate)}
              </p>
            ) : null}
            <label>
              Besedilo pravil
              <textarea
                value={editionForm.public_rules}
                onChange={(e) =>
                  setEditionField("public_rules", e.target.value)
                }
                rows={8}
                placeholder="Besedilo iz predloge ali lastno…"
              />
            </label>
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              disabled={saving}
              onClick={() => setShowNewRuleTemplate((v) => !v)}
            >
              {showNewRuleTemplate
                ? "Skrij novo predlogo"
                : "Dodaj nova pravila"}
            </button>
            {showNewRuleTemplate ? (
              <div className="stack-form" style={{ gap: "0.5rem" }}>
                <NewRuleTemplateFormFields
                  value={newRuleForm}
                  onChange={setNewRuleForm}
                  disabled={saving}
                />
                <button
                  type="button"
                  className="border-frame border-frame--sm"
                  disabled={saving || !newRuleForm.name.trim()}
                  onClick={() => void createNewRuleTemplate()}
                >
                  Ustvari predlogo
                </button>
              </div>
            ) : null}
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={editionForm.is_public}
                onChange={(e) =>
                  setEditionField("is_public", e.target.checked)
                }
              />
              Javno vidno
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
                onClick={closeEditionForm}
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
            onClick={() => void onDeleteTournament()}
          >
            Izbriši / deaktiviraj turnir
          </button>
        </div>
      ) : null}
    </div>
  );
}
