import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { publicApi } from "@/modules/public/services/publicApi";

export function TeamListPage() {
  const list = useAsyncData(() => publicApi.listTeams(), []);

  return (
    <div className="page">
      <PageHeader
        title="Ekipe"
        subtitle="Javni seznam ekip (udeležene na javnih edicijah)."
      />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && list.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="Ni javnih ekip." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ime</th>
                <th>Kratko</th>
                <th>Mesto</th>
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
        </div>
      ) : null}
    </div>
  );
}
