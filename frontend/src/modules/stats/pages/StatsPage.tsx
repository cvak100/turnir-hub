import { PageHeader, StateMessage } from "@/shared/components";

export function StatsPage() {
  return (
    <div className="page">
      <PageHeader
        title="Statistika"
        subtitle="Javni pregledi statistik turnirjev."
      />
      <StateMessage
        variant="empty"
        title="Kmalu"
        message="Statistika bo povezana v naslednjih korakih."
      />
    </div>
  );
}
