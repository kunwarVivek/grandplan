// ============================================
// TEAM MODULE EXPORTS
// ============================================

export * from "./api/dto/create-team.dto.js";
export * from "./api/dto/update-team.dto.js";
export { teamRoutes } from "./api/routes.js";
export { teamService } from "./application/services/team.service.js";
export * from "./domain/entities/team.entity.js";
export * from "./domain/events/team.events.js";
export { teamRepository } from "./infrastructure/repositories/team.repository.js";
