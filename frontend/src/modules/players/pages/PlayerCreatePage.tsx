import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorBanner, PageHeader } from "@/shared/components";
import { playerService } from "../services/playerService";

export function PlayerCreatePage() {
  const navigate = useNavigate();
  const [personId, setPersonId] = useState("");
  const [statusId, setStatusId] = useState("1");
  const [position, setPosition] = useState("");
  const [jersey, setJersey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await playerService.create({
        person: Number(personId),
        status: Number(statusId),
        position: position.trim() || undefined,
        preferred_jersey_number:
          jersey.trim() === "" ? null : Number(jersey),
      });
      navigate(`/players/${created.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page narrow">
      <PageHeader
        title="New player"
        subtitle="Players require an existing Person record."
        actions={<Link to="/players">Back</Link>}
      />
      <p className="panel muted">
        Note: creating a player needs a valid <code>person</code> id. If you do
        not have one yet, create the person via the backend/admin first. For
        edition workflows, prefer assigning an existing player on the edition
        Players page.
      </p>
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={onSubmit}>
        <label>
          Person id
          <input
            type="number"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            required
          />
        </label>
        <label>
          Status id
          <input
            type="number"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            required
          />
        </label>
        <label>
          Position
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </label>
        <label>
          Preferred jersey
          <input
            type="number"
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create player"}
        </button>
      </form>
    </div>
  );
}
