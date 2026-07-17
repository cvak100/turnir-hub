export const Permissions = {
  TournamentCreate: "tournament.create",
  TournamentEdit: "tournament.edit",
  EditionEdit: "edition.edit",
  EditionManage: "edition.manage",
  MatchLiveManage: "match.live.manage",
  MatchEventAdd: "match.event.add",
  MatchEventEdit: "match.event.edit",
  MatchFinish: "match.finish",
  TeamManage: "team.manage",
  TeamParticipationManage: "team.participation.manage",
  PlayerAssign: "player.assign",
  PhaseManage: "phase.manage",
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions] | string;
