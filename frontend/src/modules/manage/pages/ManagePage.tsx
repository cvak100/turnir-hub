import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components";
import { useAuth } from "@/shared/auth";

export function ManagePage() {
  const { hasPermission } = useAuth();

  return (
    <div className="page">
      <PageHeader
        title="Upravljanje"
        subtitle="Priprava turnirjev, ekip, igralcev in tekem."
      />
      <section className="border-frame border-frame--md">
        <h2>Orodja</h2>
        <ul className="plain-list">
          <li>
            <Link to="/tournaments">Turnirji</Link>
          </li>
          <li>
            <Link to="/teams">Ekipe</Link>
          </li>
          <li>
            <Link to="/players">Igralci</Link>
          </li>
          {hasPermission("tournament.create") ? (
            <li>
              <Link to="/tournaments/new">Nov turnir</Link>
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
