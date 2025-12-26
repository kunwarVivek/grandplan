// ============================================
// MODULES INDEX - Central export for all modules
// ============================================

export {
	organizationRoutes,
	organizationService,
} from "./organization/index.js";
export { projectRoutes, projectService } from "./project/index.js";
export {
	registerTaskEventHandlers,
	taskCascadeService,
	taskRoutes,
	taskService,
} from "./task/index.js";
export { teamRoutes, teamService } from "./team/index.js";
export { workspaceRoutes, workspaceService } from "./workspace/index.js";
