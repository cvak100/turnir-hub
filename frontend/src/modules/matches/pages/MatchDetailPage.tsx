import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { useState } from "react";
import {
  matchService,
  phaseService,
} from "../services/matchService";
import {
  isFinishedMatchStatus,
  isLiveMatchStatus,
} from "@/modules/live/matchStatuses";

export function MatchDetailPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const { hasPermission } = useAuth();
  const match = useAsyncData(() => matchService.get(matchId), [matchId]);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const phase = useAsyncData(async () => {
    if (!match.data?.tournament_phase) return null;
    return phaseService.get(match.data.tournament_phase);
  }, [match.data?.tournament_phase]);

  const editionId = phase.data?.tournament_edition ?? null;
  const canStart = hasPermission("match.live.manage", editionId);

  async function startMatch() {
    setBusy(true);
    setActionError(null);
    try {
      await matchService.start(matchId);
      match.reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Invalid match id." />;
  }

  return (
    <div className="page">
      <PageHeader
        title={
          match.data
            ? `${match.data.home_team_name ?? "Home"} vs ${match.data.away_team_name ?? "Away"}`
            : "Match"
        }
        subtitle="Match detail"
        actions={
          <Link className="button-link border-frame border-frame--sm" to={`/live/matches/${matchId}`}>
            Open live
          </Link>
        }
      />
      <ErrorBanner error={actionError ?? match.error ?? phase.error} />
      {match.loading ? <StateMessage variant="loading" /> : null}
      {match.data ? (
        <section className="border-frame border-frame--md">
          <p className="scoreline">
            {match.data.home_score ?? 0} : {match.data.away_score ?? 0}
          </p>
          <ul className="plain-list">
            <li>Status: {match.data.status?.name ?? match.data.status?.code}</li>
            <li>Date: {match.data.match_date ?? "—"}</li>
            <li>Phase id: {match.data.tournament_phase}</li>
            <li>
              Home participation: {match.data.home_team_participation ?? "—"}
            </li>
            <li>
              Away participation: {match.data.away_team_participation ?? "—"}
            </li>
            {editionId != null ? (
              <li>
                Edition:{" "}
                <Link to={`/editions/${editionId}`}>#{editionId}</Link>
              </li>
            ) : null}
          </ul>
          {canStart &&
          !isLiveMatchStatus(match.data.status?.code) &&
          !isFinishedMatchStatus(match.data.status?.code) ? (
            <button type="button" className="border-frame border-frame--sm" onClick={() => void startMatch()} disabled={busy}>
              {busy ? "Starting…" : "Start match"}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
