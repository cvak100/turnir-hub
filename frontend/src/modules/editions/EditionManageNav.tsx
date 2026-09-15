import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/auth";

type Props = {
  editionId: number;
};

type NavLink = {
  to: string;
  label: string;
};

export function EditionManageNav({ editionId }: Props) {
  const { hasPermission, isAdmin } = useAuth();
  const location = useLocation();
  const base = `/editions/${editionId}`;

  const canTeams =
    isAdmin || hasPermission("team.participation.manage", editionId);
  const canPlayers = isAdmin || hasPermission("player.assign", editionId);
  const canEdit =
    isAdmin ||
    hasPermission("edition.edit", editionId) ||
    hasPermission("edition.manage", editionId);
  const canMatches =
    isAdmin ||
    hasPermission("match.manage", editionId) ||
    hasPermission("edition.manage", editionId);

  const links: NavLink[] = [];
  if (canTeams) links.push({ to: `${base}/teams`, label: "Prijava ekip" });
  if (canPlayers) links.push({ to: `${base}/players`, label: "Prijava igralcev" });
  if (canEdit) links.push({ to: `${base}/phases`, label: "Faze" });
  if (canMatches) links.push({ to: `${base}/matches`, label: "Tekme" });
  if (canEdit) links.push({ to: `${base}/edit`, label: "Uredi" });

  if (links.length === 0) return null;

  return (
    <nav className="edition-manage-nav" aria-label="Upravljanje edicije">
      <span className="edition-manage-nav__label">Upravljanje</span>
      {links.map((item) => {
        const active =
          location.pathname === item.to ||
          location.pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
