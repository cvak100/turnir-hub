import { Link } from "react-router-dom";
import { useMemo } from "react";
import { ErrorBanner, StateMessage } from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { isLiveMatchStatus } from "@/modules/live/matchStatuses";
import type { EditionListItem } from "@/modules/editions/services/editionService";
import type { MatchListItem } from "@/modules/matches/services/matchService";
import {
  editionBucket,
  publicApi,
} from "@/modules/public/services/publicApi";

const LIST_LIMIT = 5;

/** Stable DD.MM.YYYY — avoids broken locale output. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return iso.slice(0, 10);
}

function formatDateRange(start: string, end: string): string {
  const a = formatDate(start);
  const b = formatDate(end);
  if (!a && !b) return "";
  if (a === b) return a;
  return `${a} – ${b}`;
}

function livePeriodLabel(code: string | null | undefined, name?: string | null): string {
  const byCode: Record<string, string> = {
    match_warmup: "Ogretje",
    match_in_progress: "V teku",
    live: "V teku",
    match_first_half: "1. polčas",
    match_halftime: "Polčas",
    match_second_half: "2. polčas",
    match_extra_time: "Podaljški",
    match_penalties: "Penali",
  };
  if (code && byCode[code]) return byCode[code];
  if (name?.trim()) return name.trim();
  return "V teku";
}

function pickHighlightMatch(matches: MatchListItem[]): {
  match: MatchListItem;
  kind: "live" | "latest";
} | null {
  const live = matches.find((m) => isLiveMatchStatus(m.status?.code));
  if (live) return { match: live, kind: "live" };
  const withScore = [...matches]
    .filter((m) => m.home_score != null && m.away_score != null)
    .sort((a, b) => {
      const da = a.match_date ? new Date(a.match_date).getTime() : 0;
      const db = b.match_date ? new Date(b.match_date).getTime() : 0;
      return db - da;
    });
  if (withScore[0]) return { match: withScore[0], kind: "latest" };
  return null;
}

function ActiveEditionCard({
  edition,
  matches,
}: {
  edition: EditionListItem;
  matches: MatchListItem[];
}) {
  const highlight = pickHighlightMatch(matches);
  const base = `/editions/${edition.id}`;

  return (
    <article className="border-frame border-frame--md home-active-card">
      <div className="home-active-card__match">
        {highlight ? (
          <>
            <p
              className={
                highlight.kind === "live"
                  ? "home-active-card__badge"
                  : "home-active-card__badge muted"
              }
            >
              {highlight.kind === "live" ? (
                <>
                  <span className="public-live-pill">LIVE</span>
                  <span className="home-active-card__period">
                    {livePeriodLabel(
                      highlight.match.status?.code,
                      highlight.match.status?.name,
                    )}
                  </span>
                </>
              ) : (
                "zadnja odigrana tekma"
              )}
            </p>
            <Link
              className="home-active-card__score-link"
              to={`/live/matches/${highlight.match.id}`}
            >
              {highlight.match.home_score != null &&
              highlight.match.away_score != null ? (
                <>
                  <span className="home-active-card__team">
                    {highlight.match.home_team_name ?? "TBD"}
                  </span>
                  <span className="home-active-card__result">
                    {` ${highlight.match.home_score} : ${highlight.match.away_score} `}
                  </span>
                  <span className="home-active-card__team">
                    {highlight.match.away_team_name ?? "TBD"}
                  </span>
                </>
              ) : (
                <>
                  {(highlight.match.home_team_name ?? "TBD") +
                    " – " +
                    (highlight.match.away_team_name ?? "TBD")}
                </>
              )}
            </Link>
          </>
        ) : (
          <p className="muted">Še ni odigrane tekme.</p>
        )}
      </div>

      <div className="home-active-card__edition">
        <h3 className="home-active-card__title">
          <Link to={base}>{edition.name}</Link>
        </h3>
        <dl className="home-active-card__facts">
          <div>
            <dt>Kraj</dt>
            <dd>{edition.location?.trim() || "—"}</dd>
          </div>
          <div>
            <dt>Termin</dt>
            <dd>
              {formatDateRange(edition.start_date, edition.end_date) || "—"}
            </dd>
          </div>
          <div>
            <dt>Kategorija</dt>
            <dd>{edition.category?.name || "—"}</dd>
          </div>
        </dl>
      </div>

      <nav className="home-active-card__nav" aria-label={edition.name}>
        <Link to={`${base}#standings`}>Lestvica</Link>
        <Link to={`${base}#schedule`}>Razpored</Link>
        <Link to={`${base}#teams`}>Ekipe</Link>
        <Link to={`${base}#players`}>Igralci</Link>
      </nav>
    </article>
  );
}

/** Same markup for upcoming and past lists. */
function EditionSimpleList({ editions }: { editions: EditionListItem[] }) {
  if (editions.length === 0) {
    return <p className="muted home-simple-empty">Ni vnosov.</p>;
  }
  return (
    <div className="home-simple-wrap">
      <table className="home-simple-table">
        <thead>
          <tr>
            <th>Turnir</th>
            <th>Kraj</th>
            <th>Kategorija</th>
            <th>Termin</th>
          </tr>
        </thead>
        <tbody>
          {editions.map((ed) => (
            <tr key={ed.id} className="home-simple-table__row">
              <td>
                <Link
                  className="home-simple-table__row-link"
                  to={`/editions/${ed.id}`}
                >
                  <span className="home-simple-table__row-hit" aria-hidden />
                  {ed.name}
                </Link>
              </td>
              <td className="muted">{ed.location?.trim() || "—"}</td>
              <td className="muted">{ed.category?.name || "—"}</td>
              <td className="muted home-simple-table__dates">
                {formatDateRange(ed.start_date, ed.end_date) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HomePage() {
  const editions = useAsyncData(() => publicApi.listEditions(), []);
  const matches = useAsyncData(
    () => publicApi.listMatches({ page_size: 200 }),
    [],
  );

  const matchesByEdition = useMemo(() => {
    const map = new Map<number, MatchListItem[]>();
    for (const m of matches.data?.results ?? []) {
      const eid = m.edition_id;
      if (!eid) continue;
      const list = map.get(eid) ?? [];
      list.push(m);
      map.set(eid, list);
    }
    return map;
  }, [matches.data]);

  const buckets = useMemo(() => {
    const all = editions.data?.results ?? [];
    return {
      active: all.filter((e) => editionBucket(e.status?.code) === "active"),
      upcoming: all
        .filter((e) => editionBucket(e.status?.code) === "upcoming")
        .sort((a, b) =>
          String(a.start_date).localeCompare(String(b.start_date)),
        )
        .slice(0, LIST_LIMIT),
      finished: all
        .filter((e) => editionBucket(e.status?.code) === "finished")
        .sort((a, b) =>
          String(b.start_date).localeCompare(String(a.start_date)),
        )
        .slice(0, LIST_LIMIT),
    };
  }, [editions.data]);

  const loading = editions.loading || matches.loading;
  const error = editions.error ?? matches.error;

  return (
    <div className="page home-page">
      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      {!loading ? (
        <>
          {buckets.active.length > 0 ? (
            <section className="home-active-section">
              <h2 className="home-block-title">Aktivni turnirji</h2>
              <div className="home-active-stack">
                {buckets.active.map((ed) => (
                  <ActiveEditionCard
                    key={ed.id}
                    edition={ed}
                    matches={matchesByEdition.get(ed.id) ?? []}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="border-frame border-frame--md home-lists-section">
            <div className="home-section-bar" role="presentation">
              <span>Prihajajoči turnirji</span>
            </div>
            <EditionSimpleList editions={buckets.upcoming} />

            <div className="home-section-bar" role="presentation">
              <span>Pretekli turnirji</span>
            </div>
            <EditionSimpleList editions={buckets.finished} />

            <p className="home-archive-more">
              <Link to="/tournaments">Vsi turnirji →</Link>
            </p>
          </section>

          <section className="border-frame border-frame--md public-reserved">
            <h2>Chat / stave</h2>
            <p className="muted">Rezervirano za kasneje.</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
