import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { teamService } from "../services/teamService";

export function TeamListPage() {
  const list = useAsyncData(() => teamService.list(), []);

  return (
    <div className="page">
      <PageHeader
        title="Teams"
        subtitle="Long-lived base teams (not edition participations)."
        actions={
          <Link className="button-link border-frame border-frame--sm" to="/teams/new">
            New team
          </Link>
        }
      />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && list.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No teams yet." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Short</th>
              <th>City</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.data.results.map((team) => (
              <tr key={team.id}>
                <td>
                  <Link to={`/teams/${team.id}`}>{team.name}</Link>
                </td>
                <td>{team.short_name || "—"}</td>
                <td>{team.city || "—"}</td>
                <td>{team.status?.name ?? team.status?.code ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
