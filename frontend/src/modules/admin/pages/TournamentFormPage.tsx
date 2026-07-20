import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { personService } from "@/modules/admin/services/personService";
import {
  adminTournamentService,
  type Sport,
  type TournamentDetail,
} from "@/modules/admin/services/tournamentService";

type Mode = "create" | "edit";

type FormState = {
  name: string;
  sport: string;
  description: string;
  contact_person: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  sport: "",
  description: "",
  contact_person: "",
  is_active: true,
});

function detailToForm(tournament: TournamentDetail): FormState {
  return {
    name: tournament.name,
    sport: tournament.sport ? String(tournament.sport.id) : "",
    description: tournament.description || "",
    contact_person: tournament.contact_person
      ? String(tournament.contact_person.id)
      : "",
    is_active: tournament.is_active,
  };
}

export function TournamentAdminFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournamentId = mode === "edit" ? Number(id) : null;

  const existing = useAsyncData(
    () =>
      tournamentId
        ? adminTournamentService.get(tournamentId)
        : Promise.resolve(null),
    [tournamentId],
  );

  const lookups = useAsyncData(async () => {
    const [sports, persons] = await Promise.all([
      adminTournamentService.listSports(),
      personService.list({ page_size: 200, ordering: "last_name" }),
    ]);
    return { sports, persons: persons.results };
  }, []);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [initialized, setInitialized] = useState(mode === "create");

  const sports: Sport[] = lookups.data?.sports ?? [];
  const persons = lookups.data?.persons ?? [];

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
    if (!form.sport) {
      setError(new Error("Izberi šport."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        sport: Number(form.sport),
        description: form.description.trim(),
        is_active: form.is_active,
        contact_person: form.contact_person
          ? Number(form.contact_person)
          : null,
      };

      if (mode === "create") {
        const created = await adminTournamentService.create(payload);
        navigate(`/dashboard_admin/tournaments/${created.id}`);
      } else if (tournamentId) {
        await adminTournamentService.update(tournamentId, payload);
        navigate(`/dashboard_admin/tournaments/${tournamentId}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const backTo =
    mode === "edit" && tournamentId
      ? `/dashboard_admin/tournaments/${tournamentId}`
      : "/dashboard_admin/tournaments";

  if (mode === "edit" && (existing.loading || !initialized)) {
    return <StateMessage variant="loading" />;
  }

  if (lookups.loading && sports.length === 0) {
    return <StateMessage variant="loading" />;
  }

  return (
    <div className="page narrow">
      <PageHeader
        title={mode === "create" ? "Nov turnir" : "Uredi turnir"}
        subtitle="Dolgoročna identiteta turnirja (ne posamezna edicija)."
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
          Šport *
          <select
            value={form.sport}
            onChange={(e) => setField("sport", e.target.value)}
            required
          >
            <option value="">Izberi…</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Opis
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4}
          />
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
        <label className="checkbox-row">
          <input
            className="sketch-check border-frame border-frame--sm"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setField("is_active", e.target.checked)}
          />
          Aktivno
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
