// ============================================
// TASK MODULE EXPORTS
// ============================================

export * from "./api/dto/create-task.dto.js";
export * from "./api/dto/update-task.dto.js";
export { taskRoutes } from "./api/routes.js";
export { registerTaskEventHandlers } from "./application/handlers/task-event.handler.js";
export { taskService } from "./application/services/task.service.js";
export { taskCascadeService } from "./application/services/task-cascade.service.js";
export * from "./domain/entities/task-node.entity.js";
export * from "./domain/events/task.events.js";
export * from "./domain/value-objects/materialized-path.vo.js";
export { taskRepository } from "./infrastructure/repositories/task.repository.js";
