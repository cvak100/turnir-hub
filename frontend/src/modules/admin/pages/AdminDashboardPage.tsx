import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components";

type AdminModule = {
  id: string;
  label: string;
  description: string;
  path: string;
  children?: { id: string; label: string; description: string; path: string }[];
};

const ADMIN_MODULES: AdminModule[] = [
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
    id: "matches",
    label: "Matches",
    description: "Seznam tekem, masovni statusi, urejanje in brisanje.",
    path: "/dashboard_admin/matches",
    children: [
      {
        id: "live-edit",
        label: "Live Edit",
        description: "Live tekme — klik odpre live urejanje.",
        path: "/dashboard_admin/live",
      },
    ],
  },
  {
    id: "catalog",
    label: "Katalog / šifranti",
    description: "Nagrade, statusi, tipi dogodkov, kategorije…",
    path: "/dashboard_admin/catalog",
  },
  {
    id: "roles",
    label: "Urejanje pravic / vlog",
    description: "Dodeljevanje vlog uporabnikom in urejanje pravic.",
    path: "/dashboard_admin/roles",
  },
  {
    id: "generator",
    label: "Generator",
    description: "Generator A (turnir) in B (zgodovina igralca).",
    path: "/dashboard_admin/generator",
  },
];

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
              {mod.children?.length ? (
                <ul className="plain-list admin-module-children">
                  {mod.children.map((child) => (
                    <li key={child.id}>
                      <Link to={child.path}>{child.label}</Link>
                      <span className="muted"> — {child.description}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
