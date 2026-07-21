import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { AppProviders } from "@/app/providers/AppProviders";
import { RequireAdmin } from "@/app/router/RequireAdmin";
import { RequireAuth } from "@/app/router/RequireAuth";
import { RequirePermission } from "@/app/router/RequirePermission";
import { AdminDashboardPage } from "@/modules/admin/pages/AdminDashboardPage";
import { GeneratorAdminPage } from "@/modules/admin/pages/GeneratorAdminPage";
import { PersonDetailPage } from "@/modules/admin/pages/PersonDetailPage";
import { PersonFormPage } from "@/modules/admin/pages/PersonFormPage";
import { PersonsAdminPage } from "@/modules/admin/pages/PersonsAdminPage";
import { TeamAdminDetailPage } from "@/modules/admin/pages/TeamDetailPage";
import { TeamFormPage } from "@/modules/admin/pages/TeamFormPage";
import { TeamsAdminPage } from "@/modules/admin/pages/TeamsAdminPage";
import { TournamentAdminDetailPage } from "@/modules/admin/pages/TournamentDetailPage";
import { TournamentEventsAdminPage } from "@/modules/admin/pages/TournamentEventsAdminPage";
import { TournamentAdminFormPage } from "@/modules/admin/pages/TournamentFormPage";
import { TournamentsAdminPage } from "@/modules/admin/pages/TournamentsAdminPage";
import { AccountPage } from "@/modules/account/pages/AccountPage";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { UnauthorizedPage } from "@/modules/auth/pages/UnauthorizedPage";
import { DashboardPage } from "@/modules/dashboard/pages/DashboardPage";
import { EditionDetailPage } from "@/modules/editions/pages/EditionDetailPage";
import { EditionEditPage } from "@/modules/editions/pages/EditionEditPage";
import { EditionEventsPage } from "@/modules/editions/pages/EditionEventsPage";
import { EditionMatchesPage } from "@/modules/editions/pages/EditionMatchesPage";
import { EditionPhasesPage } from "@/modules/editions/pages/EditionPhasesPage";
import { EditionPlayersPage } from "@/modules/editions/pages/EditionPlayersPage";
import { EditionTeamsPage } from "@/modules/editions/pages/EditionTeamsPage";
import { HomePage } from "@/modules/home/pages/HomePage";
import { LiveIndexPage } from "@/modules/live/pages/LiveIndexPage";
import { LiveMatchPage } from "@/modules/live/pages/LiveMatchPage";
import { ManagePage } from "@/modules/manage/pages/ManagePage";
import { MatchDetailPage } from "@/modules/matches/pages/MatchDetailPage";
import { MatchEventEditPage } from "@/modules/matches/pages/MatchEventEditPage";
import { PlayerCreatePage } from "@/modules/players/pages/PlayerCreatePage";
import { PlayerDetailPage } from "@/modules/players/pages/PlayerDetailPage";
import { PlayerEditPage } from "@/modules/players/pages/PlayerEditPage";
import { PlayerListPage } from "@/modules/players/pages/PlayerListPage";
import { StatsPage } from "@/modules/stats/pages/StatsPage";
import { TeamCreatePage } from "@/modules/teams/pages/TeamCreatePage";
import { TeamDetailPage } from "@/modules/teams/pages/TeamDetailPage";
import { TeamListPage } from "@/modules/teams/pages/TeamListPage";
import { TournamentDetailPage } from "@/modules/tournaments/pages/TournamentDetailPage";
import { TournamentFormPage } from "@/modules/tournaments/pages/TournamentFormPage";
import { TournamentListPage } from "@/modules/tournaments/pages/TournamentListPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route path="/tournaments" element={<TournamentListPage />} />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

            <Route path="/live" element={<LiveIndexPage />} />
            <Route path="/live/matches/:id" element={<LiveMatchPage />} />
            <Route path="/stats" element={<StatsPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/account" element={<AccountPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route element={<RequireAdmin />}>
                <Route
                  path="/dashboard_admin"
                  element={<AdminDashboardPage />}
                />
                <Route
                  path="/dashboard_admin/generator"
                  element={<GeneratorAdminPage />}
                />
                <Route
                  path="/dashboard_admin/persons"
                  element={<PersonsAdminPage />}
                />
                <Route
                  path="/dashboard_admin/persons/new"
                  element={<PersonFormPage mode="create" />}
                />
                <Route
                  path="/dashboard_admin/persons/:id"
                  element={<PersonDetailPage />}
                />
                <Route
                  path="/dashboard_admin/persons/:id/edit"
                  element={<PersonFormPage mode="edit" />}
                />
                <Route
                  path="/dashboard_admin/teams"
                  element={<TeamsAdminPage />}
                />
                <Route
                  path="/dashboard_admin/teams/new"
                  element={<TeamFormPage mode="create" />}
                />
                <Route
                  path="/dashboard_admin/teams/:id"
                  element={<TeamAdminDetailPage />}
                />
                <Route
                  path="/dashboard_admin/teams/:id/edit"
                  element={<TeamFormPage mode="edit" />}
                />
                <Route
                  path="/dashboard_admin/tournaments"
                  element={<TournamentsAdminPage />}
                />
                <Route
                  path="/dashboard_admin/tournaments/new"
                  element={<TournamentAdminFormPage mode="create" />}
                />
                <Route
                  path="/dashboard_admin/tournaments/:id"
                  element={<TournamentAdminDetailPage />}
                />
                <Route
                  path="/dashboard_admin/tournaments/:id/events"
                  element={<TournamentEventsAdminPage />}
                />
                <Route
                  path="/dashboard_admin/tournaments/:id/edit"
                  element={<TournamentAdminFormPage mode="edit" />}
                />
              </Route>
              <Route
                element={<RequirePermission code="edition.manage" />}
              >
                <Route path="/manage" element={<ManagePage />} />
              </Route>
              <Route
                element={<RequirePermission code="tournament.create" />}
              >
                <Route
                  path="/tournaments/new"
                  element={<TournamentFormPage mode="create" />}
                />
              </Route>
              <Route
                path="/tournaments/:id/edit"
                element={<TournamentFormPage mode="edit" />}
              />
              <Route path="/editions/:id/edit" element={<EditionEditPage />} />
              <Route path="/teams/new" element={<TeamCreatePage />} />
              <Route path="/players/new" element={<PlayerCreatePage />} />
            </Route>

            <Route path="/editions/:id" element={<EditionDetailPage />} />
            <Route path="/editions/:id/teams" element={<EditionTeamsPage />} />
            <Route
              path="/editions/:id/players"
              element={<EditionPlayersPage />}
            />
            <Route
              path="/editions/:id/phases"
              element={<EditionPhasesPage />}
            />
            <Route
              path="/editions/:id/matches"
              element={<EditionMatchesPage />}
            />
            <Route
              path="/editions/:id/events"
              element={<EditionEventsPage />}
            />

            <Route path="/teams" element={<TeamListPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />

            <Route path="/players" element={<PlayerListPage />} />
            <Route path="/players/:id" element={<PlayerDetailPage />} />
            <Route path="/players/:id/edit" element={<PlayerEditPage />} />

            <Route path="/matches/:id" element={<MatchDetailPage />} />
            <Route
              path="/match-events/:eventId/edit"
              element={<MatchEventEditPage />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
