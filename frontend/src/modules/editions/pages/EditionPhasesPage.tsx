import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { groupService, phaseService } from "@/modules/matches/services/matchService";

export function EditionPhasesPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const phases = useAsyncData(
    () => phaseService.list({ tournament_edition: editionId }),
    [editionId],
  );

  return (
    <div className="page">
      <PageHeader
        title="Phases"
        subtitle={`Edition #${editionId}`}
        actions={<Link to={`/editions/${editionId}`}>Back to edition</Link>}
      />
      <ErrorBanner error={phases.error} />
      {phases.loading ? <StateMessage variant="loading" /> : null}
      {!phases.loading && phases.data?.results.length === 0 ? (
        <StateMessage variant="empty" message="No phases created yet." />
      ) : null}
      {phases.data?.results.map((phase) => (
        <PhaseGroupsBlock key={phase.id} phaseId={phase.id} phaseName={phase.name} phaseType={phase.phase_type} status={phase.status} />
      ))}
    </div>
  );
}

function PhaseGroupsBlock({
  phaseId,
  phaseName,
  phaseType,
  status,
}: {
  phaseId: number;
  phaseName: string;
  phaseType: string;
  status: string;
}) {
  const groups = useAsyncData(
    () => groupService.list({ tournament_phase: phaseId }),
    [phaseId],
  );

  return (
    <section className="panel">
      <h2>
        {phaseName}{" "}
        <span className="muted">
          ({phaseType} · {status})
        </span>
      </h2>
      {groups.loading ? <p className="muted">Loading groups…</p> : null}
      {!groups.loading && groups.data?.results.length === 0 ? (
        <p className="muted">No groups.</p>
      ) : null}
      <ul className="plain-list">
        {groups.data?.results.map((group) => (
          <li key={group.id}>
            {group.name} (order {group.order})
          </li>
        ))}
      </ul>
    </section>
  );
}
