import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import {
  teamParticipationService,
} from "@/modules/teams/services/teamService";

export function EditionTeamsPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission } = useAuth();
  const list = useAsyncData(
    () => teamParticipationService.list({ tournament_edition: editionId }),
    [editionId],
  );

  const [teamId, setTeamId] = useState("");
  const [participationName, setParticipationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const canRegister = hasPermission(
    "team.participation.manage",
    editionId,
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await teamParticipationService.create({
        team: Number(teamId),
        tournament_edition: editionId,
        participation_name: participationName.trim() || undefined,
      });
      setTeamId("");
      setParticipationName("");
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
        title="Edition teams"
        subtitle="Team participations for this edition."
        actions={<Link to={`/editions/${editionId}`}>Back to edition</Link>}
      />
      <ErrorBanner error={error ?? list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && list.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No teams registered yet." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Participation</th>
              <th>Base team</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {list.data.results.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.participation_name}{" "}
                  <span className="muted">(id {item.id})</span>
                </td>
                <td>
                  <Link to={`/teams/${item.team.id}`}>{item.team.name}</Link>
                </td>
                <td>{item.payment_status ? "paid" : "unpaid"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {canRegister ? (
        <section className="border-frame border-frame--md">
          <h2>Register existing team</h2>
          <p className="muted">
            This creates a TeamParticipation for the edition (not a new base
            Team).
          </p>
          <form className="stack-form border-frame border-frame--md" onSubmit={onSubmit}>
            <label>
              Team id
              <input
                type="number"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
              />
            </label>
            <label>
              Participation name
              <input
                value={participationName}
                onChange={(e) => setParticipationName(e.target.value)}
                placeholder="Defaults to team name if empty"
              />
            </label>
            <button type="submit" className="border-frame border-frame--sm" disabled={submitting}>
              {submitting ? "Registering…" : "Register team"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
