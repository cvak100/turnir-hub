import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { formatPersonName } from "@/shared/utils/format";
import { participationPlayerService } from "@/modules/players/services/playerService";

export function EditionPlayersPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission } = useAuth();
  const list = useAsyncData(
    () =>
      participationPlayerService.list({ tournament_edition: editionId }),
    [editionId],
  );

  const [playerId, setPlayerId] = useState("");
  const [participationId, setParticipationId] = useState("");
  const [jersey, setJersey] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const canAssign = hasPermission("player.assign", editionId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await participationPlayerService.create({
        player: Number(playerId),
        team_participation: Number(participationId),
        jersey_number: jersey.trim() === "" ? null : Number(jersey),
        is_captain: isCaptain,
        status: statusId.trim() === "" ? undefined : Number(statusId),
      });
      setPlayerId("");
      setParticipationId("");
      setJersey("");
      setIsCaptain(false);
      list.reload();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Edition players"
        subtitle="Assignments for this tournament edition."
        actions={<Link to={`/editions/${editionId}`}>Back to edition</Link>}
      />
      <ErrorBanner error={error ?? list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && list.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No players assigned yet." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Participation</th>
              <th>Jersey</th>
              <th>Captain</th>
            </tr>
          </thead>
          <tbody>
            {list.data.results.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/players/${item.player.id}`}>
                    {formatPersonName(item.player.person)}
                  </Link>
                </td>
                <td>{item.team_participation}</td>
                <td>{item.jersey_number ?? "—"}</td>
                <td>{item.is_captain ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {canAssign ? (
        <section className="border-frame border-frame--md">
          <h2>Assign player</h2>
          <form className="stack-form border-frame border-frame--md" onSubmit={onSubmit}>
            <label>
              Player id
              <input
                type="number"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                required
              />
            </label>
            <label>
              Team participation id
              <input
                type="number"
                value={participationId}
                onChange={(e) => setParticipationId(e.target.value)}
                required
              />
            </label>
            <label>
              Jersey number
              <input
                type="number"
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
              />
            </label>
            <label>
              Status id (optional if backend allows default)
              <input
                type="number"
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isCaptain}
                onChange={(e) => setIsCaptain(e.target.checked)}
              />
              Captain
            </label>
            <button type="submit" className="border-frame border-frame--sm" disabled={submitting}>
              {submitting ? "Assigning…" : "Assign player"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
