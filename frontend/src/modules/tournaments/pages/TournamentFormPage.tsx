import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { tournamentService } from "../services/tournamentService";

type Mode = "create" | "edit";

export function TournamentFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournamentId = mode === "edit" ? Number(id) : null;

  const existing = useAsyncData(
    () =>
      tournamentId
        ? tournamentService.get(tournamentId)
        : Promise.resolve(null),
    [tournamentId],
  );

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (existing.data) {
      setName(existing.data.name);
      setSport(String(existing.data.sport?.id ?? ""));
      setDescription(existing.data.description ?? "");
    }
  }, [existing.data]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        sport: Number(sport),
        description,
      };
      if (mode === "create") {
        const created = await tournamentService.create(payload);
        navigate(`/tournaments/${created.id}`);
      } else if (tournamentId) {
        const updated = await tournamentService.update(tournamentId, payload);
        navigate(`/tournaments/${updated.id}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "edit" && existing.loading) {
    return <StateMessage variant="loading" />;
  }

  return (
    <div className="page narrow">
      <PageHeader
        title={mode === "create" ? "New tournament" : "Edit tournament"}
        subtitle="Name, sport id, and description."
        actions={<Link to="/tournaments">Back</Link>}
      />
      <ErrorBanner error={error ?? existing.error} />
      <form className="stack-form" onSubmit={onSubmit}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Sport id
          <input
            type="number"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
