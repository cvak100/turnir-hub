import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { editionService } from "../services/editionService";

export function EditionEditPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const navigate = useNavigate();
  const existing = useAsyncData(
    () => editionService.get(editionId),
    [editionId],
  );

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusId, setStatusId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!existing.data) return;
    setName(existing.data.name);
    setYear(String(existing.data.year));
    setLocation(existing.data.location ?? "");
    setCategory(existing.data.category ?? "");
    setStartDate(existing.data.start_date ?? "");
    setEndDate(existing.data.end_date ?? "");
    setStatusId(String(existing.data.status?.id ?? ""));
    setIsPublic(existing.data.is_public);
  }, [existing.data]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await editionService.update(editionId, {
        name: name.trim(),
        year: Number(year),
        location,
        category,
        start_date: startDate,
        end_date: endDate,
        status: Number(statusId),
        is_public: isPublic,
      });
      navigate(`/editions/${editionId}`);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Invalid edition id." />;
  }

  if (existing.loading) return <StateMessage variant="loading" />;

  return (
    <div className="page narrow">
      <PageHeader
        title="Edit edition"
        subtitle="Basic edition fields."
        actions={<Link to={`/editions/${editionId}`}>Back</Link>}
      />
      <ErrorBanner error={error ?? existing.error} />
      <form className="stack-form border-frame border-frame--md" onSubmit={onSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
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
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>
        <label>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public
        </label>
        <button type="submit" className="border-frame border-frame--sm" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
