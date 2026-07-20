import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { formatPersonName } from "@/shared/utils/format";
import { playerService } from "../services/playerService";

export function PlayerDetailPage() {
  const { id } = useParams();
  const playerId = Number(id);
  const player = useAsyncData(() => playerService.get(playerId), [playerId]);

  if (!Number.isFinite(playerId)) {
    return <StateMessage variant="error" message="Invalid player id." />;
  }

  return (
    <div className="page">
      <PageHeader
        title={
          player.data
            ? formatPersonName(player.data.person)
            : "Player"
        }
        subtitle="Player detail"
        actions={<Link to="/players">Back to list</Link>}
      />
      <ErrorBanner error={player.error} />
      {player.loading ? <StateMessage variant="loading" /> : null}
      {player.data ? (
        <section className="border-frame border-frame--md">
          <ul className="plain-list">
            <li>Id: {player.data.id}</li>
            <li>Person id: {player.data.person.id}</li>
            <li>Position: {player.data.position || "—"}</li>
            <li>
              Preferred jersey: {player.data.preferred_jersey_number ?? "—"}
            </li>
            <li>Nationality: {player.data.nationality || "—"}</li>
            <li>Active: {player.data.is_active ? "yes" : "no"}</li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
