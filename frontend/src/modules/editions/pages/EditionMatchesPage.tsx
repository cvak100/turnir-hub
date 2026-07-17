import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { matchService } from "@/modules/matches/services/matchService";

export function EditionMatchesPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const list = useAsyncData(
    () => matchService.list({ tournament_edition: editionId }),
    [editionId],
  );

  return (
    <div className="page">
      <PageHeader
        title="Edition matches"
        subtitle={`Matches for edition #${editionId}`}
        actions={<Link to={`/editions/${editionId}`}>Back to edition</Link>}
      />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && list.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No matches created yet." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Home</th>
              <th>Away</th>
              <th>Score</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.data.results.map((match) => (
              <tr key={match.id}>
                <td>{match.match_number ?? match.id}</td>
                <td>{match.home_team_name ?? "—"}</td>
                <td>{match.away_team_name ?? "—"}</td>
                <td>
                  {match.home_score ?? 0} : {match.away_score ?? 0}
                </td>
                <td>{match.status?.code ?? "—"}</td>
                <td>
                  <Link to={`/matches/${match.id}`}>Detail</Link>
                  {" · "}
                  <Link to={`/live/matches/${match.id}`}>Live</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
