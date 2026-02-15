// ============================================
// MATERIALIZED PATH VALUE OBJECT TESTS
// ============================================

import { describe, expect, it } from "vitest";
import {
	MaterializedPath,
	materializedPathUtils,
} from "./materialized-path.vo.js";

describe("MaterializedPath", () => {
	describe("create", () => {
		it("should create a root path when parentPath is null", () => {
			// Arrange
			const taskId = "task-123";

			// Act
			const path = MaterializedPath.create(taskId, null);

			// Assert
			expect(path.toString()).toBe("task-123");
			expect(path.depth).toBe(0);
			expect(path.parentId).toBeNull();
			expect(path.rootId).toBe("task-123");
		});

		it("should create a nested path when parentPath is provided", () => {
			// Arrange
			const taskId = "task-456";
			const parentPath = "parent-123";

			// Act
			const path = MaterializedPath.create(taskId, parentPath);

			// Assert
			expect(path.toString()).toBe("parent-123.task-456");
			expect(path.depth).toBe(1);
			expect(path.parentId).toBe("parent-123");
			expect(path.rootId).toBe("parent-123");
		});

		it("should handle deep nesting", () => {
			// Arrange
			const taskId = "task-789";
			const parentPath = "a.b.c";

			// Act
			const path = MaterializedPath.create(taskId, parentPath);

			// Assert
			expect(path.toString()).toBe("a.b.c.task-789");
			expect(path.depth).toBe(3);
			expect(path.parentId).toBe("c");
			expect(path.rootId).toBe("a");
		});
	});

	describe("fromString", () => {
		it("should parse a simple path", () => {
			// Arrange
			const pathStr = "root-task";

			// Act
			const path = MaterializedPath.fromString(pathStr);

			// Assert
			expect(path.toString()).toBe("root-task");
			expect(path.depth).toBe(0);
		});

		it("should parse a nested path", () => {
			// Arrange
			const pathStr = "grandparent.parent.child";

			// Act
			const path = MaterializedPath.fromString(pathStr);

			// Assert
			expect(path.depth).toBe(2);
			expect(path.id).toBe("child");
			expect(path.parentId).toBe("parent");
			expect(path.rootId).toBe("grandparent");
		});

		it("should throw when path is empty", () => {
			// Arrange
			const emptyPath = "";

			// Act & Assert
			expect(() => MaterializedPath.fromString(emptyPath)).toThrow(
				"Path cannot be empty",
			);
		});
	});

	describe("depth", () => {
		it("should return 0 for root task", () => {
			const path = MaterializedPath.fromString("task-1");
			expect(path.depth).toBe(0);
		});

		it("should return correct depth for nested tasks", () => {
			const path = MaterializedPath.fromString("a.b.c.d");
			expect(path.depth).toBe(3);
		});
	});

	describe("id", () => {
		it("should return the task ID from the path", () => {
			const path = MaterializedPath.fromString("a.b.c");
			expect(path.id).toBe("c");
		});
	});

	describe("parentPath", () => {
		it("should return null for root task", () => {
			const path = MaterializedPath.fromString("root");
			expect(path.parentPath).toBeNull();
		});

		it("should return parent path for nested task", () => {
			const path = MaterializedPath.fromString("a.b.c");
			expect(path.parentPath).toBe("a.b");
		});
	});

	describe("parentId", () => {
		it("should return null for root task", () => {
			const path = MaterializedPath.fromString("root");
			expect(path.parentId).toBeNull();
		});

		it("should return parent ID for nested task", () => {
			const path = MaterializedPath.fromString("a.b.c");
			expect(path.parentId).toBe("b");
		});
	});

	describe("ancestorIds", () => {
		it("should return empty array for root task", () => {
			const path = MaterializedPath.fromString("root");
			expect(path.ancestorIds).toEqual([]);
		});

		it("should return all ancestor IDs", () => {
			const path = MaterializedPath.fromString("a.b.c.d");
			expect(path.ancestorIds).toEqual(["a", "b", "c"]);
		});
	});

	describe("rootId", () => {
		it("should return the root ID", () => {
			const path = MaterializedPath.fromString("a.b.c");
			expect(path.rootId).toBe("a");
		});
	});

	describe("isDescendantOf", () => {
		it("should return true when path is descendant of ancestor", () => {
			const childPath = MaterializedPath.fromString("a.b.c");
			expect(childPath.isDescendantOf("a")).toBe(true);
			expect(childPath.isDescendantOf("a.b")).toBe(true);
		});

		it("should return false when path is not a descendant", () => {
			const childPath = MaterializedPath.fromString("x.y.z");
			expect(childPath.isDescendantOf("a")).toBe(false);
		});

		it("should return false when comparing same path", () => {
			const path = MaterializedPath.fromString("a.b");
			expect(path.isDescendantOf("a.b")).toBe(false);
		});
	});

	describe("isAncestorOf", () => {
		it("should return true when path is ancestor of descendant", () => {
			const ancestorPath = MaterializedPath.fromString("a.b");
			expect(ancestorPath.isAncestorOf("a.b.c")).toBe(true);
			expect(ancestorPath.isAncestorOf("a.b.c.d")).toBe(true);
		});

		it("should return false when not an ancestor", () => {
			const ancestorPath = MaterializedPath.fromString("x.y");
			expect(ancestorPath.isAncestorOf("a.b.c")).toBe(false);
		});
	});

	describe("isSiblingOf", () => {
		it("should return true for siblings with different IDs", () => {
			const path1 = MaterializedPath.fromString("a.b.child1");
			const path2 = MaterializedPath.fromString("a.b.child2");

			expect(path1.isSiblingOf(path2.toString())).toBe(true);
		});

		it("should return false for same node", () => {
			const path = MaterializedPath.fromString("a.b.c");

			expect(path.isSiblingOf(path.toString())).toBe(false);
		});

		it("should return false for nodes at different levels", () => {
			const path1 = MaterializedPath.fromString("a.b.c");
			const path2 = MaterializedPath.fromString("a.b");

			expect(path1.isSiblingOf(path2.toString())).toBe(false);
		});
	});

	describe("getDescendantPattern", () => {
		it("should return pattern for matching descendants", () => {
			const path = MaterializedPath.fromString("a.b");
			expect(path.getDescendantPattern()).toBe("a.b.%");
		});
	});

	describe("getSubtreePattern", () => {
		it("should return pattern for matching node and descendants", () => {
			const path = MaterializedPath.fromString("a.b");
			expect(path.getSubtreePattern()).toBe("a.b%");
		});
	});

	describe("moveTo", () => {
		it("should move to new parent path", () => {
			// Arrange
			const path = MaterializedPath.fromString("a.b.c");
			const newParentPath = "x.y";

			// Act
			const newPath = path.moveTo(newParentPath);

			// Assert
			expect(newPath.toString()).toBe("x.y.c");
			expect(newPath.id).toBe("c");
		});

		it("should move to root when newParentPath is null", () => {
			// Arrange
			const path = MaterializedPath.fromString("a.b.c");

			// Act
			const newPath = path.moveTo(null);

			// Assert
			expect(newPath.toString()).toBe("c");
		});
	});

	describe("updateAfterAncestorMove", () => {
		it("should update path when ancestor is moved", () => {
			// Arrange
			const path = MaterializedPath.fromString("old.parent.child");
			const oldAncestorPath = "old";
			const newAncestorPath = "new";

			// Act
			const updatedPath = path.updateAfterAncestorMove(
				oldAncestorPath,
				newAncestorPath,
			);

			// Assert
			expect(updatedPath.toString()).toBe("new.parent.child");
		});

		it("should throw when current path is not a descendant of old ancestor", () => {
			// Arrange
			const path = MaterializedPath.fromString("other.path");
			const oldAncestorPath = "old";
			const newAncestorPath = "new";

			// Act & Assert
			expect(() =>
				path.updateAfterAncestorMove(oldAncestorPath, newAncestorPath),
			).toThrow("Current path is not a descendant of the old ancestor path");
		});
	});

	describe("equals", () => {
		it("should return true for equal paths", () => {
			const path1 = MaterializedPath.fromString("a.b.c");
			const path2 = MaterializedPath.fromString("a.b.c");

			expect(path1.equals(path2)).toBe(true);
		});

		it("should return false for different paths", () => {
			const path1 = MaterializedPath.fromString("a.b.c");
			const path2 = MaterializedPath.fromString("a.b.d");

			expect(path1.equals(path2)).toBe(false);
		});
	});
});

describe("materializedPathUtils", () => {
	describe("buildPath", () => {
		it("should build root path", () => {
			expect(materializedPathUtils.buildPath(null, "task-1")).toBe("task-1");
		});

		it("should build nested path", () => {
			expect(materializedPathUtils.buildPath("parent", "child")).toBe(
				"parent.child",
			);
		});

		it("should build deeply nested path", () => {
			expect(materializedPathUtils.buildPath("a.b", "c")).toBe("a.b.c");
		});
	});

	describe("getAncestorIds", () => {
		it("should return empty array for root path", () => {
			expect(materializedPathUtils.getAncestorIds("root")).toEqual([]);
		});

		it("should return ancestor IDs", () => {
			expect(materializedPathUtils.getAncestorIds("a.b.c")).toEqual(["a", "b"]);
		});
	});

	describe("getDepth", () => {
		it("should return 0 for root path", () => {
			expect(materializedPathUtils.getDepth("root")).toBe(0);
		});

		it("should return correct depth", () => {
			expect(materializedPathUtils.getDepth("a.b.c")).toBe(2);
		});
	});

	describe("isDescendant", () => {
		it("should return true for descendant", () => {
			expect(materializedPathUtils.isDescendant("a.b.c", "a")).toBe(true);
			expect(materializedPathUtils.isDescendant("a.b.c", "a.b")).toBe(true);
		});

		it("should return false for non-descendant", () => {
			expect(materializedPathUtils.isDescendant("x.y.z", "a")).toBe(false);
		});

		it("should return false for same path", () => {
			expect(materializedPathUtils.isDescendant("a", "a")).toBe(false);
		});
	});

	describe("getTaskId", () => {
		it("should return the task ID from path", () => {
			expect(materializedPathUtils.getTaskId("a.b.c")).toBe("c");
		});
	});

	describe("getParentId", () => {
		it("should return parent ID for nested task", () => {
			expect(materializedPathUtils.getParentId("a.b.c")).toBe("b");
		});

		it("should return null for root task", () => {
			expect(materializedPathUtils.getParentId("root")).toBeNull();
		});
	});

	describe("calculateNewDescendantPaths", () => {
		it("should calculate new paths for descendants", () => {
			// Arrange
			const descendants = [
				{ id: "c", path: "a.b.c" },
				{ id: "d", path: "a.b.d" },
			];
			const oldParentPath = "a.b";
			const newParentPath = "x.y";

			// Act
			const result = materializedPathUtils.calculateNewDescendantPaths(
				descendants,
				oldParentPath,
				newParentPath,
			);

			// Assert
			expect(result).toEqual([
				{ id: "c", newPath: "x.y.c" },
				{ id: "d", newPath: "x.y.d" },
			]);
		});

		it("should handle deep descendants", () => {
			// Arrange
			const descendants = [{ id: "e", path: "a.b.c.d.e" }];
			const oldParentPath = "a";
			const newParentPath = "x";

			// Act
			const result = materializedPathUtils.calculateNewDescendantPaths(
				descendants,
				oldParentPath,
				newParentPath,
			);

			// Assert
			expect(result).toEqual([{ id: "e", newPath: "x.b.c.d.e" }]);
		});
	});
});
