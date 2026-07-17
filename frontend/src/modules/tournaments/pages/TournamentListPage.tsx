import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { tournamentService } from "../services/tournamentService";

export function TournamentListPage() {
  const { hasPermission, user } = useAuth();
  const { data, loading, error } = useAsyncData(
    () => tournamentService.list(),
    [],
  );

  return (
    <div className="page">
      <PageHeader
        title="Tournaments"
        subtitle="Public tournament list."
        actions={
          user && hasPermission("tournament.create") ? (
            <Link className="button-link border-frame border-frame--sm" to="/tournaments/new">
              New tournament
            </Link>
          ) : null
        }
      />
      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}
      {!loading && !error && data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No tournaments yet." />
      ) : null}
      {!loading && data && data.results.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sport</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/tournaments/${item.id}`}>{item.name}</Link>
                </td>
                <td>{item.sport?.name ?? "—"}</td>
                <td>{item.is_active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
