import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { formatPersonName } from "@/shared/utils/format";
import { playerService } from "../services/playerService";

export function PlayerListPage() {
  const list = useAsyncData(() => playerService.list(), []);

  return (
    <div className="page">
      <PageHeader
        title="Players"
        subtitle="Global player list."
        actions={
          <Link className="button-link border-frame border-frame--sm" to="/players/new">
            New player
          </Link>
        }
      />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && list.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No players yet." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Jersey</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {list.data.results.map((player) => (
              <tr key={player.id}>
                <td>
                  <Link to={`/players/${player.id}`}>
                    {formatPersonName(player.person)}
                  </Link>
                </td>
                <td>{player.position || "—"}</td>
                <td>{player.preferred_jersey_number ?? "—"}</td>
                <td>{player.is_active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
