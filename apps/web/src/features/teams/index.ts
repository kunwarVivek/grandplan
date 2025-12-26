// Types
export type {
	Team,
	TeamMember,
	TeamRole,
	CreateTeamInput,
	UpdateTeamInput,
} from "./types";

export { TEAM_ROLE_CONFIG, TEAM_COLORS } from "./types";

// Hooks
export {
	useTeams,
	useMyTeams,
	useTeam,
	useCreateTeam,
	useUpdateTeam,
	useDeleteTeam,
	useTeamMembers,
	useAddTeamMember,
	useRemoveTeamMember,
	useUpdateTeamMemberRole,
} from "./hooks/use-teams";

// Components
export { TeamCard } from "./components/team-card";
export { TeamForm } from "./components/team-form";
