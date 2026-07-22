import { useParams } from "react-router-dom";
import {
  ErrorBanner,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { editionService } from "@/modules/editions/services/editionService";
import { EventsAdminPage } from "@/modules/admin/pages/TournamentEventsAdminPage";

export function EditionEventsPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const edition = useAsyncData(
    () => editionService.get(editionId),
    [editionId],
  );

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljavna edicija." />;
  }

  if (edition.loading) {
    return <StateMessage variant="loading" />;
  }

  if (edition.error) {
    return <ErrorBanner error={edition.error} />;
  }

  if (!edition.data) {
    return <StateMessage variant="empty" message="Edicija ne obstaja." />;
  }

  return (
    <EventsAdminPage
      tournamentId={edition.data.tournament.id}
      fixedEditionId={editionId}
      title={`Dogodki · ${edition.data.name}`}
      backHref={`/editions/${editionId}`}
      backLabel="Nazaj na edicijo"
      listHref={`/editions/${editionId}/events`}
    />
  );
}
