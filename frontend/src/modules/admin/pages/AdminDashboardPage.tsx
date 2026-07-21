import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components";

const ADMIN_MODULES = [
  {
    id: "persons",
    label: "Persons",
    description: "Vsi ljudje: igralci, sodniki, kontakti…",
    path: "/dashboard_admin/persons",
  },
  {
    id: "teams",
    label: "Teams",
    description: "Ekipe, registracije na turnirje…",
    path: "/dashboard_admin/teams",
  },
  {
    id: "tournaments",
    label: "Tournaments",
    description: "Turnirji in njihove edicije…",
    path: "/dashboard_admin/tournaments",
  },
  {
    id: "generator",
    label: "Generator",
    description: "Generator A (turnir) in B (zgodovina igralca).",
    path: "/dashboard_admin/generator",
  },
] as const;

export function AdminDashboardPage() {
  return (
    <div className="page">
      <PageHeader
        title="Dashboard Admin"
        subtitle="Administracija sistema."
      />
      <section className="border-frame border-frame--md">
        <h2>Moduli</h2>
        <ul className="plain-list">
          {ADMIN_MODULES.map((mod) => (
            <li key={mod.id}>
              <Link to={mod.path}>{mod.label}</Link>
              <span className="muted"> — {mod.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
