// Types
export type {
	Project,
	ProjectMember,
	ProjectStatus,
	ProjectVisibility,
	ProjectStats,
	CreateProjectInput,
	UpdateProjectInput,
} from "./types";

export {
	PROJECT_STATUS_CONFIG,
	PROJECT_VISIBILITY_CONFIG,
	PROJECT_COLORS,
} from "./types";

// Hooks
export {
	useProjects,
	useProject,
	useCreateProject,
	useUpdateProject,
	useDeleteProject,
	useProjectStats,
	useProjectMembers,
	useAddProjectMember,
	useRemoveProjectMember,
	useArchiveProject,
	useDuplicateProject,
} from "./hooks/use-projects";

// Components
export { ProjectCard } from "./components/project-card";
export { ProjectForm } from "./components/project-form";
export { ProjectStats as ProjectStatsComponent, ProjectStatsDisplay } from "./components/project-stats";
