// ============================================
// TASK SERVICE TESTS
// ============================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskStatus } from "@grandplan/db";
import { TaskService } from "./task.service.js";

// Mock dependencies
vi.mock("@grandplan/audit", () => ({
	auditService: {
		log: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock("@grandplan/events", () => ({
	eventBus: {
		emit: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock("@grandplan/tenant", () => ({
	getCurrentTenant: vi.fn(),
}));

vi.mock(
	"../../infrastructure/repositories/task.repository.js",
	() => ({
		taskRepository: {
			findById: vi.fn(),
			findByIdWithRelations: vi.fn(),
			findByProject: vi.fn(),
			createWithPath: vi.fn(),
			update: vi.fn(),
			deleteWithDescendants: vi.fn(),
			bulkUpdateStatus: vi.fn(),
			addHistory: vi.fn(),
			getNextPosition: vi.fn(),
			findDependency: vi.fn(),
			move: vi.fn(),
		},
	}),
);

vi.mock(
	"../../../project/infrastructure/repositories/project.repository.js",
	() => ({
		projectRepository: {
			findByIdWithWorkspace: vi.fn(),
		},
	}),
);

vi.mock(
	"../../../workspace/infrastructure/repositories/workspace.repository.js",
	() => ({
		workspaceRepository: {
			isMember: vi.fn(),
		},
	}),
);

vi.mock("./task-cascade.service.js", () => ({
	taskCascadeService: {
		onTaskCompleted: vi.fn().mockResolvedValue(undefined),
		onChildReopened: vi.fn().mockResolvedValue(undefined),
		validateHierarchyAfterMove: vi.fn().mockResolvedValue(undefined),
		wouldCreateCycle: vi.fn().mockResolvedValue(false),
	},
}));

// Import mocks after defining them
import { auditService } from "@grandplan/audit";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant } from "@grandplan/tenant";
import { taskRepository } from "../../infrastructure/repositories/task.repository.js";
import { projectRepository } from "../../../project/infrastructure/repositories/project.repository.js";
import { workspaceRepository } from "../../../workspace/infrastructure/repositories/workspace.repository.js";
import { taskCascadeService } from "./task-cascade.service.js";

describe("TaskService", () => {
	let service: TaskService;

	const mockTenant = {
		userId: "user-123",
		organizationId: "org-123",
		isOrganizationAdmin: vi.fn().mockReturnValue(false),
		hasPermission: vi.fn().mockReturnValue(false),
	};

	const mockProject = {
		id: "project-123",
		workspaceId: "workspace-123",
		workspace: {
			organizationId: "org-123",
		},
	};

	const mockTask = {
		id: "task-123",
		title: "Test Task",
		description: null,
		projectId: "project-123",
		parentId: null,
		path: "task-123",
		depth: 0,
		nodeType: "TASK" as const,
		status: "DRAFT" as const,
		priority: "MEDIUM" as const,
		position: 0,
		assigneeId: null,
		createdById: "user-123",
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		service = new TaskService();
		vi.clearAllMocks();

		// Default mock implementations
		vi.mocked(getCurrentTenant).mockReturnValue(mockTenant as never);
		vi.mocked(projectRepository.findByIdWithWorkspace).mockResolvedValue(
			mockProject as never,
		);
		vi.mocked(workspaceRepository.isMember).mockResolvedValue(true);
	});

	describe("create", () => {
		it("should create a root task successfully", async () => {
			// Arrange
			const dto = {
				title: "New Task",
				projectId: "project-123",
			};

			vi.mocked(taskRepository.createWithPath).mockResolvedValue(
				mockTask as never,
			);
			vi.mocked(taskRepository.getNextPosition).mockResolvedValue(0);

			// Act
			const result = await service.create(dto);

			// Assert
			expect(result).toEqual(mockTask);
			expect(taskRepository.createWithPath).toHaveBeenCalled();
			expect(eventBus.emit).toHaveBeenCalled();
			expect(auditService.log).toHaveBeenCalled();
		});

		it("should create a child task with parent path", async () => {
			// Arrange
			const parentTask = {
				...mockTask,
				id: "parent-task",
				path: "parent-task",
				depth: 0,
			};

			const dto = {
				title: "Child Task",
				projectId: "project-123",
				parentId: "parent-task",
			};

			vi.mocked(taskRepository.findById).mockResolvedValue(parentTask as never);
			vi.mocked(taskRepository.createWithPath).mockResolvedValue({
				...mockTask,
				parentId: "parent-task",
				path: "parent-task.task-123",
				depth: 1,
			} as never);
			vi.mocked(taskRepository.getNextPosition).mockResolvedValue(0);

			// Act
			const result = await service.create(dto);

			// Assert
			expect(result.depth).toBe(1);
			expect(result.path).toBe("parent-task.task-123");
		});

		it("should throw NotFoundError when parent task not found", async () => {
			// Arrange
			const dto = {
				title: "Child Task",
				projectId: "project-123",
				parentId: "non-existent",
			};

			vi.mocked(taskRepository.findById).mockResolvedValue(null);

			// Act & Assert
			await expect(service.create(dto)).rejects.toThrow("Parent task");
		});

		it("should throw ValidationError when parent is in different project", async () => {
			// Arrange
			const parentTask = {
				...mockTask,
				id: "parent-task",
				projectId: "different-project",
			};

			const dto = {
				title: "Child Task",
				projectId: "project-123",
				parentId: "parent-task",
			};

			vi.mocked(taskRepository.findById).mockResolvedValue(parentTask as never);

			// Act & Assert
			await expect(service.create(dto)).rejects.toThrow(
				"same project",
			);
		});
	});

	describe("findById", () => {
		it("should return task when found", async () => {
			// Arrange
			vi.mocked(taskRepository.findByIdWithRelations).mockResolvedValue(
				mockTask as never,
			);

			// Act
			const result = await service.findById("task-123");

			// Assert
			expect(result).toEqual(mockTask);
		});

		it("should throw NotFoundError when task not found", async () => {
			// Arrange
			vi.mocked(taskRepository.findByIdWithRelations).mockResolvedValue(null);

			// Act & Assert
			await expect(service.findById("non-existent")).rejects.toThrow("Task");
		});
	});

	describe("list", () => {
		it("should return tasks for valid project", async () => {
			// Arrange
			const tasks = [mockTask];
			vi.mocked(taskRepository.findByProject).mockResolvedValue(tasks as never);

			// Act
			const result = await service.list({ projectId: "project-123" });

			// Assert
			expect(result).toEqual(tasks);
		});

		it("should throw ValidationError when projectId is missing", async () => {
			// Act & Assert
			await expect(service.list({})).rejects.toThrow("Project ID is required");
		});
	});

	describe("update", () => {
		it("should update task successfully", async () => {
			// Arrange
			const updateDto = { title: "Updated Title" };
			const updatedTask = { ...mockTask, title: "Updated Title" };

			vi.mocked(taskRepository.findById).mockResolvedValue(mockTask as never);
			vi.mocked(taskRepository.update).mockResolvedValue(updatedTask as never);

			// Act
			const result = await service.update("task-123", updateDto);

			// Assert
			expect(result.title).toBe("Updated Title");
			expect(auditService.log).toHaveBeenCalled();
		});

		it("should throw ValidationError for invalid status transition", async () => {
			// Arrange
			const updateDto = { status: "COMPLETED" as TaskStatus };

			vi.mocked(taskRepository.findById).mockResolvedValue(mockTask as never);

			// Act & Assert
			await expect(service.update("task-123", updateDto)).rejects.toThrow(
				"Invalid status transition",
			);
		});

		it("should allow valid status transition from DRAFT to PENDING", async () => {
			// Arrange
			const updateDto = { status: "PENDING" as TaskStatus };
			const updatedTask = { ...mockTask, status: "PENDING" as TaskStatus };

			vi.mocked(taskRepository.findById).mockResolvedValue(mockTask as never);
			vi.mocked(taskRepository.update).mockResolvedValue(updatedTask as never);
			vi.mocked(taskRepository.addHistory).mockResolvedValue(undefined as never);

			// Act
			const result = await service.update("task-123", updateDto);

			// Assert
			expect(result.status).toBe("PENDING");
		});

		it("should emit events on status change", async () => {
			// Arrange
			const updateDto = { status: "PENDING" as TaskStatus };
			const updatedTask = { ...mockTask, status: "PENDING" as TaskStatus };

			vi.mocked(taskRepository.findById).mockResolvedValue(mockTask as never);
			vi.mocked(taskRepository.update).mockResolvedValue(updatedTask as never);
			vi.mocked(taskRepository.addHistory).mockResolvedValue(undefined as never);

			// Act
			await service.update("task-123", updateDto);

			// Assert
			expect(eventBus.emit).toHaveBeenCalled();
		});
	});

	describe("delete", () => {
		it("should delete task and descendants", async () => {
			// Arrange
			vi.mocked(taskRepository.findById).mockResolvedValue(mockTask as never);
			vi.mocked(taskRepository.deleteWithDescendants).mockResolvedValue(1);

			// Act
			const result = await service.delete("task-123");

			// Assert
			expect(result.deletedCount).toBe(1);
			expect(eventBus.emit).toHaveBeenCalled();
			expect(auditService.log).toHaveBeenCalled();
		});

		it("should throw NotFoundError when task not found", async () => {
			// Arrange
			vi.mocked(taskRepository.findById).mockResolvedValue(null);

			// Act & Assert
			await expect(service.delete("non-existent")).rejects.toThrow("Task");
		});
	});

	describe("bulkUpdateStatus", () => {
		it("should bulk update task statuses", async () => {
			// Arrange
			const dto = {
				taskIds: ["task-1", "task-2"],
				status: "COMPLETED" as TaskStatus,
			};

			vi.mocked(taskRepository.findById)
				.mockResolvedValueOnce({ ...mockTask, id: "task-1" } as never)
				.mockResolvedValueOnce({ ...mockTask, id: "task-2" } as never);
			vi.mocked(taskRepository.bulkUpdateStatus).mockResolvedValue(2);
			vi.mocked(taskRepository.addHistory).mockResolvedValue(undefined as never);

			// Act
			const result = await service.bulkUpdateStatus(dto);

			// Assert
			expect(result.updated).toBe(2);
		});

		it("should throw NotFoundError when any task not found", async () => {
			// Arrange
			const dto = {
				taskIds: ["task-1", "non-existent"],
				status: "COMPLETED" as TaskStatus,
			};

			vi.mocked(taskRepository.findById)
				.mockResolvedValueOnce({ ...mockTask, id: "task-1" } as never)
				.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(service.bulkUpdateStatus(dto)).rejects.toThrow("Task");
		});
	});

	describe("move", () => {
		it("should move task to new parent", async () => {
			// Arrange
			const newParent = {
				...mockTask,
				id: "new-parent",
				path: "new-parent",
			};

			const movedTask = {
				...mockTask,
				parentId: "new-parent",
				path: "new-parent.task-123",
			};

			const dto = { parentId: "new-parent" };

			vi.mocked(taskRepository.findById).mockResolvedValue(mockTask as never);
			vi.mocked(taskRepository.findById)
				.mockResolvedValueOnce(mockTask as never)
				.mockResolvedValueOnce(newParent as never);
			vi.mocked(taskRepository.move).mockResolvedValue({
				task: movedTask,
				descendants: [],
			} as never);
			vi.mocked(taskRepository.addHistory).mockResolvedValue(undefined as never);

			// Act
			const result = await service.move("task-123", dto);

			// Assert
			expect(result.task.parentId).toBe("new-parent");
			expect(taskCascadeService.validateHierarchyAfterMove).toHaveBeenCalled();
		});

		it("should throw ValidationError when moving to descendant", async () => {
			// Arrange
			const descendantTask = {
				...mockTask,
				id: "descendant",
				path: "task-123.descendant",
			};

			const dto = { parentId: "descendant" };

			vi.mocked(taskRepository.findById)
				.mockResolvedValueOnce(mockTask as never)
				.mockResolvedValueOnce(descendantTask as never);

			// Act & Assert
			await expect(service.move("task-123", dto)).rejects.toThrow(
				"Cannot move task to its own descendant",
			);
		});
	});
});
