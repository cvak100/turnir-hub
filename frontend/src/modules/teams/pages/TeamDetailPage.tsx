import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { teamService } from "../services/teamService";

export function TeamDetailPage() {
  const { id } = useParams();
  const teamId = Number(id);
  const team = useAsyncData(() => teamService.get(teamId), [teamId]);

  if (!Number.isFinite(teamId)) {
    return <StateMessage variant="error" message="Invalid team id." />;
  }

  return (
    <div className="page">
      <PageHeader
        title={team.data?.name ?? "Team"}
        subtitle="Base team record"
        actions={<Link to="/teams">Back to list</Link>}
      />
      <ErrorBanner error={team.error} />
      {team.loading ? <StateMessage variant="loading" /> : null}
      {team.data ? (
        <section className="border-frame border-frame--md">
          <ul className="plain-list">
            <li>Id: {team.data.id}</li>
            <li>Short name: {team.data.short_name || "—"}</li>
            <li>City: {team.data.city || "—"}</li>
            <li>Status: {team.data.status?.name ?? "—"}</li>
            <li>Notes: {team.data.notes || "—"}</li>
          </ul>
          <p className="muted">
            To register this team into an edition, open the edition Teams page
            and create a participation.
          </p>
        </section>
      ) : null}
    </div>
  );
}
