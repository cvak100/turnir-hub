import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  ShirtColorPicker,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { personService } from "@/modules/admin/services/personService";
import {
  adminTeamService,
  type TeamDetail,
  type TeamStatus,
} from "@/modules/admin/services/teamService";

type Mode = "create" | "edit";

type FormState = {
  name: string;
  short_name: string;
  city: string;
  founded_year: string;
  shirt_top: string;
  shirt_bottom: string;
  status: string;
  contact_person: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  short_name: "",
  city: "",
  founded_year: "",
  shirt_top: "",
  shirt_bottom: "",
  status: "",
  contact_person: "",
  notes: "",
});

function detailToForm(team: TeamDetail): FormState {
  return {
    name: team.name,
    short_name: team.short_name || "",
    city: team.city || "",
    founded_year:
      team.founded_year != null ? String(team.founded_year) : "",
    shirt_top: team.shirt_top || "",
    shirt_bottom: team.shirt_bottom || "",
    status: team.status ? String(team.status.id) : "",
    contact_person: team.contact_person
      ? String(team.contact_person.id)
      : "",
    notes: team.notes || "",
  };
}

export function TeamFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const teamId = mode === "edit" ? Number(id) : null;

  const existing = useAsyncData(
    () => (teamId ? adminTeamService.get(teamId) : Promise.resolve(null)),
    [teamId],
  );

  const lookups = useAsyncData(async () => {
    const [statuses, persons] = await Promise.all([
      adminTeamService.listStatuses(),
      personService.list({ page_size: 200, ordering: "last_name" }),
    ]);
    return { statuses, persons: persons.results };
  }, []);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [initialized, setInitialized] = useState(mode === "create");

  const statuses: TeamStatus[] = lookups.data?.statuses ?? [];
  const persons = lookups.data?.persons ?? [];

  const defaultStatusId = useMemo(() => {
    const active = statuses.find((s) => s.code === "active");
    return active ? String(active.id) : statuses[0] ? String(statuses[0].id) : "";
  }, [statuses]);

  useEffect(() => {
    if (mode === "create" && defaultStatusId && !form.status) {
      setForm((f) => ({ ...f, status: defaultStatusId }));
    }
  }, [defaultStatusId, form.status, mode]);

  useEffect(() => {
    if (mode === "edit" && existing.data) {
      setForm(detailToForm(existing.data));
      setInitialized(true);
    }
  }, [existing.data, mode]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        city: form.city.trim(),
        founded_year: form.founded_year.trim()
          ? Number(form.founded_year)
          : null,
        shirt_top: form.shirt_top.trim(),
        shirt_bottom: form.shirt_bottom.trim(),
        status: form.status ? Number(form.status) : null,
        contact_person: form.contact_person
          ? Number(form.contact_person)
          : null,
        notes: form.notes.trim(),
      };

      if (mode === "create") {
        const created = await adminTeamService.create(payload);
        navigate(`/dashboard_admin/teams/${created.id}`);
      } else if (teamId) {
        await adminTeamService.update(teamId, payload);
        navigate(`/dashboard_admin/teams/${teamId}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const backTo =
    mode === "edit" && teamId
      ? `/dashboard_admin/teams/${teamId}`
      : "/dashboard_admin/teams";

  if (mode === "edit" && (existing.loading || !initialized)) {
    return <StateMessage variant="loading" />;
  }

  if (lookups.loading && statuses.length === 0) {
    return <StateMessage variant="loading" />;
  }

  return (
    <div className="page narrow">
      <PageHeader
        title={mode === "create" ? "Nova ekipa" : "Uredi ekipo"}
        subtitle="Osnovni podatki ekipe (Team identity)."
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={backTo}
          >
            ← Nazaj
          </Link>
        }
      />
      <ErrorBanner error={error ?? existing.error ?? lookups.error} />
      <form
        className="stack-form border-frame border-frame--md"
        onSubmit={onSubmit}
      >
        <label>
          Ime *
          <input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
        </label>
        <label>
          Kratko ime
          <input
            value={form.short_name}
            onChange={(e) => setField("short_name", e.target.value)}
          />
        </label>
        <label>
          Mesto
          <input
            value={form.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </label>
        <label>
          Leto ustanovitve
          <input
            type="number"
            min={1800}
            max={2100}
            value={form.founded_year}
            onChange={(e) => setField("founded_year", e.target.value)}
          />
        </label>
        <ShirtColorPicker
          label="Dres (zgornji)"
          name="shirt_top"
          value={form.shirt_top}
          onChange={(code) => setField("shirt_top", code)}
        />
        <ShirtColorPicker
          label="Dres (spodnji)"
          name="shirt_bottom"
          value={form.shirt_bottom}
          onChange={(code) => setField("shirt_bottom", code)}
        />
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            <option value="">—</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kontaktna oseba
          <select
            value={form.contact_person}
            onChange={(e) => setField("contact_person", e.target.value)}
          >
            <option value="">—</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name} {p.first_name}
                {p.nickname ? ` (${p.nickname})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Opombe
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={3}
          />
        </label>
        <div className="row-actions">
          <button
            type="submit"
            className="border-frame border-frame--sm"
            disabled={submitting}
          >
            {submitting ? "Shranjujem…" : "Shrani"}
          </button>
          <Link
            className="button-link button-secondary border-frame border-frame--sm"
            to={backTo}
          >
            Prekliči
          </Link>
        </div>
      </form>
    </div>
  );
}
