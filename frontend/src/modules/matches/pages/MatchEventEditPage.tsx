import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader, StateMessage } from "@/shared/components";
import { MatchEventEditForm } from "@/modules/matches/components/MatchEventEditForm";

export function MatchEventEditPage() {
  const { eventId: eventIdParam } = useParams();
  const eventId = Number(eventIdParam);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const returnTo = searchParams.get("return") || "/";

  if (!Number.isFinite(eventId)) {
    return <StateMessage variant="error" message="Neveljaven dogodek." />;
  }

  return (
    <div className="page">
      <PageHeader
        title={`Uredi dogodek #${eventId}`}
        subtitle="Corner case urejanje"
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={returnTo}
          >
            Nazaj na seznam
          </Link>
        }
      />
      <MatchEventEditForm
        eventId={eventId}
        onCancel={() => navigate(returnTo)}
        onSaved={() => navigate(returnTo)}
      />
    </div>
  );
}
