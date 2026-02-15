// ============================================
// TASK NODE ENTITY TESTS
// ============================================

import { describe, expect, it } from "vitest";
import {
	canTransitionTo,
	getDefaultNodeTypeForDepth,
	isTaskCompleted,
	isTaskBlocking,
	calculateProgress,
	TASK_NODE_TYPES,
	TASK_STATUSES,
	TASK_PRIORITIES,
	COMPLETED_STATUSES,
	BLOCKING_STATUSES,
} from "./task-node.entity.js";

describe("TaskNodeEntity", () => {
	describe("TASK_NODE_TYPES", () => {
		it("should contain expected node types", () => {
			expect(TASK_NODE_TYPES).toContain("EPIC");
			expect(TASK_NODE_TYPES).toContain("STORY");
			expect(TASK_NODE_TYPES).toContain("TASK");
			expect(TASK_NODE_TYPES).toContain("SUBTASK");
			expect(TASK_NODE_TYPES).toContain("BUG");
			expect(TASK_NODE_TYPES).toContain("SPIKE");
		});
	});

	describe("TASK_STATUSES", () => {
		it("should contain expected statuses", () => {
			expect(TASK_STATUSES).toContain("DRAFT");
			expect(TASK_STATUSES).toContain("PENDING");
			expect(TASK_STATUSES).toContain("IN_PROGRESS");
			expect(TASK_STATUSES).toContain("BLOCKED");
			expect(TASK_STATUSES).toContain("IN_REVIEW");
			expect(TASK_STATUSES).toContain("COMPLETED");
			expect(TASK_STATUSES).toContain("CANCELLED");
		});
	});

	describe("TASK_PRIORITIES", () => {
		it("should contain expected priorities", () => {
			expect(TASK_PRIORITIES).toContain("CRITICAL");
			expect(TASK_PRIORITIES).toContain("HIGH");
			expect(TASK_PRIORITIES).toContain("MEDIUM");
			expect(TASK_PRIORITIES).toContain("LOW");
		});
	});

	describe("COMPLETED_STATUSES", () => {
		it("should include COMPLETED and CANCELLED", () => {
			expect(COMPLETED_STATUSES).toContain("COMPLETED");
			expect(COMPLETED_STATUSES).toContain("CANCELLED");
		});
	});

	describe("BLOCKING_STATUSES", () => {
		it("should include all non-completed statuses", () => {
			expect(BLOCKING_STATUSES).toContain("DRAFT");
			expect(BLOCKING_STATUSES).toContain("PENDING");
			expect(BLOCKING_STATUSES).toContain("IN_PROGRESS");
			expect(BLOCKING_STATUSES).toContain("BLOCKED");
			expect(BLOCKING_STATUSES).toContain("IN_REVIEW");
		});

		it("should not include COMPLETED or CANCELLED", () => {
			expect(BLOCKING_STATUSES).not.toContain("COMPLETED");
			expect(BLOCKING_STATUSES).not.toContain("CANCELLED");
		});
	});

	describe("isTaskCompleted", () => {
		it("should return true for COMPLETED status", () => {
			expect(isTaskCompleted("COMPLETED")).toBe(true);
		});

		it("should return true for CANCELLED status", () => {
			expect(isTaskCompleted("CANCELLED")).toBe(true);
		});

		it("should return false for in-progress statuses", () => {
			expect(isTaskCompleted("DRAFT")).toBe(false);
			expect(isTaskCompleted("PENDING")).toBe(false);
			expect(isTaskCompleted("IN_PROGRESS")).toBe(false);
			expect(isTaskCompleted("BLOCKED")).toBe(false);
			expect(isTaskCompleted("IN_REVIEW")).toBe(false);
		});
	});

	describe("isTaskBlocking", () => {
		it("should return true for blocking statuses", () => {
			expect(isTaskBlocking("DRAFT")).toBe(true);
			expect(isTaskBlocking("PENDING")).toBe(true);
			expect(isTaskBlocking("IN_PROGRESS")).toBe(true);
			expect(isTaskBlocking("BLOCKED")).toBe(true);
			expect(isTaskBlocking("IN_REVIEW")).toBe(true);
		});

		it("should return false for completed statuses", () => {
			expect(isTaskBlocking("COMPLETED")).toBe(false);
			expect(isTaskBlocking("CANCELLED")).toBe(false);
		});
	});

	describe("canTransitionTo", () => {
		describe("DRAFT transitions", () => {
			it("can transition from DRAFT to PENDING", () => {
				expect(canTransitionTo("DRAFT", "PENDING")).toBe(true);
			});

			it("can transition from DRAFT to CANCELLED", () => {
				expect(canTransitionTo("DRAFT", "CANCELLED")).toBe(true);
			});

			it("cannot transition from DRAFT to IN_PROGRESS", () => {
				expect(canTransitionTo("DRAFT", "IN_PROGRESS")).toBe(false);
			});

			it("cannot transition from DRAFT to COMPLETED", () => {
				expect(canTransitionTo("DRAFT", "COMPLETED")).toBe(false);
			});
		});

		describe("PENDING transitions", () => {
			it("can transition from PENDING to IN_PROGRESS", () => {
				expect(canTransitionTo("PENDING", "IN_PROGRESS")).toBe(true);
			});

			it("can transition from PENDING to BLOCKED", () => {
				expect(canTransitionTo("PENDING", "BLOCKED")).toBe(true);
			});

			it("can transition from PENDING to CANCELLED", () => {
				expect(canTransitionTo("PENDING", "CANCELLED")).toBe(true);
			});

			it("cannot transition from PENDING directly to COMPLETED", () => {
				expect(canTransitionTo("PENDING", "COMPLETED")).toBe(false);
			});
		});

		describe("IN_PROGRESS transitions", () => {
			it("can transition from IN_PROGRESS to PENDING", () => {
				expect(canTransitionTo("IN_PROGRESS", "PENDING")).toBe(true);
			});

			it("can transition from IN_PROGRESS to BLOCKED", () => {
				expect(canTransitionTo("IN_PROGRESS", "BLOCKED")).toBe(true);
			});

			it("can transition from IN_PROGRESS to IN_REVIEW", () => {
				expect(canTransitionTo("IN_PROGRESS", "IN_REVIEW")).toBe(true);
			});

			it("can transition from IN_PROGRESS to COMPLETED", () => {
				expect(canTransitionTo("IN_PROGRESS", "COMPLETED")).toBe(true);
			});

			it("can transition from IN_PROGRESS to CANCELLED", () => {
				expect(canTransitionTo("IN_PROGRESS", "CANCELLED")).toBe(true);
			});
		});

		describe("BLOCKED transitions", () => {
			it("can transition from BLOCKED to PENDING", () => {
				expect(canTransitionTo("BLOCKED", "PENDING")).toBe(true);
			});

			it("can transition from BLOCKED to IN_PROGRESS", () => {
				expect(canTransitionTo("BLOCKED", "IN_PROGRESS")).toBe(true);
			});

			it("can transition from BLOCKED to CANCELLED", () => {
				expect(canTransitionTo("BLOCKED", "CANCELLED")).toBe(true);
			});
		});

		describe("IN_REVIEW transitions", () => {
			it("can transition from IN_REVIEW to IN_PROGRESS", () => {
				expect(canTransitionTo("IN_REVIEW", "IN_PROGRESS")).toBe(true);
			});

			it("can transition from IN_REVIEW to COMPLETED", () => {
				expect(canTransitionTo("IN_REVIEW", "COMPLETED")).toBe(true);
			});

			it("can transition from IN_REVIEW to CANCELLED", () => {
				expect(canTransitionTo("IN_REVIEW", "CANCELLED")).toBe(true);
			});
		});

		describe("COMPLETED transitions (reopening)", () => {
			it("can transition from COMPLETED to IN_PROGRESS (reopen)", () => {
				expect(canTransitionTo("COMPLETED", "IN_PROGRESS")).toBe(true);
			});

			it("cannot transition from COMPLETED to other non-IN_PROGRESS statuses", () => {
				expect(canTransitionTo("COMPLETED", "PENDING")).toBe(false);
				expect(canTransitionTo("COMPLETED", "BLOCKED")).toBe(false);
				expect(canTransitionTo("COMPLETED", "CANCELLED")).toBe(false);
			});
		});

		describe("CANCELLED transitions (restoring)", () => {
			it("can transition from CANCELLED to DRAFT", () => {
				expect(canTransitionTo("CANCELLED", "DRAFT")).toBe(true);
			});

			it("can transition from CANCELLED to PENDING", () => {
				expect(canTransitionTo("CANCELLED", "PENDING")).toBe(true);
			});

			it("cannot transition from CANCELLED to IN_PROGRESS", () => {
				expect(canTransitionTo("CANCELLED", "IN_PROGRESS")).toBe(false);
			});
		});
	});

	describe("getDefaultNodeTypeForDepth", () => {
		it("should return EPIC for depth 0", () => {
			expect(getDefaultNodeTypeForDepth(0)).toBe("EPIC");
		});

		it("should return STORY for depth 1", () => {
			expect(getDefaultNodeTypeForDepth(1)).toBe("STORY");
		});

		it("should return TASK for depth 2", () => {
			expect(getDefaultNodeTypeForDepth(2)).toBe("TASK");
		});

		it("should return SUBTASK for depth >= 3", () => {
			expect(getDefaultNodeTypeForDepth(3)).toBe("SUBTASK");
			expect(getDefaultNodeTypeForDepth(4)).toBe("SUBTASK");
			expect(getDefaultNodeTypeForDepth(10)).toBe("SUBTASK");
		});
	});

	describe("calculateProgress", () => {
		it("should return 0 for empty array", () => {
			expect(calculateProgress([])).toBe(0);
		});

		it("should return 0 when no tasks are completed", () => {
			const tasks = [
				{ status: "DRAFT" as const },
				{ status: "PENDING" as const },
				{ status: "IN_PROGRESS" as const },
			];
			expect(calculateProgress(tasks)).toBe(0);
		});

		it("should return 100 when all tasks are completed", () => {
			const tasks = [
				{ status: "COMPLETED" as const },
				{ status: "COMPLETED" as const },
				{ status: "COMPLETED" as const },
			];
			expect(calculateProgress(tasks)).toBe(100);
		});

		it("should return 100 when all tasks are cancelled", () => {
			const tasks = [
				{ status: "CANCELLED" as const },
				{ status: "CANCELLED" as const },
			];
			expect(calculateProgress(tasks)).toBe(100);
		});

		it("should calculate correct percentage for mixed statuses", () => {
			const tasks = [
				{ status: "COMPLETED" as const },
				{ status: "IN_PROGRESS" as const },
				{ status: "PENDING" as const },
				{ status: "CANCELLED" as const },
			];
			// 2 completed (COMPLETED, CANCELLED) out of 4 = 50%
			expect(calculateProgress(tasks)).toBe(50);
		});

		it("should round to nearest integer", () => {
			const tasks = [
				{ status: "COMPLETED" as const },
				{ status: "IN_PROGRESS" as const },
				{ status: "PENDING" as const },
			];
			// 1 completed out of 3 = 33.33...%, rounded to 33%
			expect(calculateProgress(tasks)).toBe(33);
		});
	});
});
