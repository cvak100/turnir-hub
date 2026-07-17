import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorBanner, PageHeader } from "@/shared/components";
import { teamService } from "../services/teamService";

export function TeamCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [city, setCity] = useState("");
  const [statusId, setStatusId] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await teamService.create({
        name: name.trim(),
        short_name: shortName.trim(),
        city: city.trim(),
        status: Number(statusId),
      });
      navigate(`/teams/${created.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page narrow">
      <PageHeader
        title="New team"
        subtitle="Creates a long-lived base Team."
        actions={<Link to="/teams">Back</Link>}
      />
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={onSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Short name
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
          />
        </label>
        <label>
          City
          <input value={city} onChange={(e) => setCity(e.target.value)} />
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
        <p className="muted">
          Status is required by the API. Use a valid TeamStatus id from the
          backend.
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create team"}
        </button>
      </form>
    </div>
  );
}
