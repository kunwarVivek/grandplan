// ============================================
// WORKSPACE MODULE EXPORTS
// ============================================

export * from "./api/dto/create-workspace.dto.js";
export * from "./api/dto/update-workspace.dto.js";
export { workspaceRoutes } from "./api/routes.js";
export { workspaceService } from "./application/services/workspace.service.js";
export * from "./domain/entities/workspace.entity.js";
export * from "./domain/events/workspace.events.js";
export { workspaceRepository } from "./infrastructure/repositories/workspace.repository.js";
