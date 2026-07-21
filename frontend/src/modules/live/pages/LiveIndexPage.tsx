import { Link } from "react-router-dom";
import { PageHeader, StateMessage } from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { matchService } from "@/modules/matches/services/matchService";
import { isLiveMatchStatus } from "../matchStatuses";

export function LiveIndexPage() {
  const list = useAsyncData(async () => {
    const page = await matchService.list({ page_size: 50 });
    const live = page.results.filter((m) => isLiveMatchStatus(m.status?.code));
    return {
      ...page,
      results: live,
      count: live.length,
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="Live"
        subtitle="Tekme, ki trenutno tečejo."
      />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {list.error ? (
        <StateMessage
          variant="error"
          message={list.error.message}
        />
      ) : null}
      {!list.loading && list.data && list.data.results.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Ni live tekem"
          message="Ko se tekma začne, se prikaže tukaj."
        />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <section className="border-frame border-frame--md">
          <ul className="plain-list">
            {list.data.results.map((match) => (
              <li key={match.id}>
                <Link to={`/live/matches/${match.id}`}>
                  {match.home_team_name ?? "Home"} vs{" "}
                  {match.away_team_name ?? "Away"}{" "}
                  ({match.home_score ?? 0}:{match.away_score ?? 0})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
