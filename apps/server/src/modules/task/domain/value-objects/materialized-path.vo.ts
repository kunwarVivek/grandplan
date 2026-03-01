// ============================================
// MATERIALIZED PATH VALUE OBJECT
// ============================================

/**
 * MaterializedPath represents a task's position in the hierarchy
 * Format: "parentId1.parentId2.taskId"
 *
 * This enables efficient queries like:
 * - Get all descendants: path LIKE 'parent.%'
 * - Get all ancestors: split path and query
 * - Get depth: count dots in path
 */
export class MaterializedPath {
	private readonly segments: string[];

	private constructor(segments: string[]) {
		this.segments = segments;
	}

	static create(id: string, parentPath: string | null): MaterializedPath {
		if (!parentPath) {
			return new MaterializedPath([id]);
		}
		const parentSegments = parentPath.split(".");
		return new MaterializedPath([...parentSegments, id]);
	}

	static fromString(path: string): MaterializedPath {
		if (!path) {
			throw new Error("Path cannot be empty");
		}
		return new MaterializedPath(path.split("."));
	}

	toString(): string {
		return this.segments.join(".");
	}

	get depth(): number {
		return this.segments.length - 1;
	}

	get id(): string {
		return this.segments[this.segments.length - 1] ?? "";
	}

	get parentPath(): string | null {
		if (this.segments.length <= 1) {
			return null;
		}
		return this.segments.slice(0, -1).join(".");
	}

	get parentId(): string | null {
		if (this.segments.length <= 1) {
			return null;
		}
		return this.segments[this.segments.length - 2] ?? null;
	}

	get ancestorIds(): string[] {
		return this.segments.slice(0, -1);
	}

	get rootId(): string {
		return this.segments[0] ?? "";
	}

	isDescendantOf(ancestorPath: string): boolean {
		return this.toString().startsWith(`${ancestorPath}.`);
	}

	isAncestorOf(descendantPath: string): boolean {
		return descendantPath.startsWith(`${this.toString()}.`);
	}

	isSiblingOf(otherPath: string): boolean {
		const otherMp = MaterializedPath.fromString(otherPath);
		return this.parentPath === otherMp.parentPath && this.id !== otherMp.id;
	}

	/**
	 * Get the descendant pattern for SQL LIKE queries
	 * Returns 'path.%' to match all descendants
	 */
	getDescendantPattern(): string {
		return `${this.toString()}.%`;
	}

	/**
	 * Get the subtree pattern for SQL LIKE queries
	 * Returns 'path%' to match the node itself and all descendants
	 */
	getSubtreePattern(): string {
		return `${this.toString()}%`;
	}

	/**
	 * Move the path to a new parent
	 */
	moveTo(newParentPath: string | null): MaterializedPath {
		return MaterializedPath.create(this.id, newParentPath);
	}

	/**
	 * Update descendant path when an ancestor is moved
	 */
	updateAfterAncestorMove(
		oldAncestorPath: string,
		newAncestorPath: string,
	): MaterializedPath {
		const currentPath = this.toString();
		if (!currentPath.startsWith(oldAncestorPath)) {
			throw new Error(
				"Current path is not a descendant of the old ancestor path",
			);
		}
		const suffix = currentPath.slice(oldAncestorPath.length);
		return MaterializedPath.fromString(newAncestorPath + suffix);
	}

	equals(other: MaterializedPath): boolean {
		return this.toString() === other.toString();
	}
}

/**
 * Utility functions for working with materialized paths in queries
 */
export const materializedPathUtils = {
	/**
	 * Build a path from a parent path and task ID
	 */
	buildPath(parentPath: string | null, id: string): string {
		return parentPath ? `${parentPath}.${id}` : id;
	},

	/**
	 * Get ancestor IDs from a path
	 */
	getAncestorIds(path: string): string[] {
		const parts = path.split(".");
		return parts.slice(0, -1);
	},

	/**
	 * Get depth from a path (0-indexed)
	 */
	getDepth(path: string): number {
		return path.split(".").length - 1;
	},

	/**
	 * Check if a path is a descendant of another
	 */
	isDescendant(childPath: string, parentPath: string): boolean {
		return childPath.startsWith(`${parentPath}.`);
	},

	/**
	 * Get the task ID from a path
	 */
	getTaskId(path: string): string {
		const parts = path.split(".");
		return parts[parts.length - 1] ?? "";
	},

	/**
	 * Get the parent ID from a path
	 */
	getParentId(path: string): string | null {
		const parts = path.split(".");
		return parts.length > 1 ? (parts[parts.length - 2] ?? null) : null;
	},

	/**
	 * Calculate new paths for descendants when moving a task
	 */
	calculateNewDescendantPaths(
		descendants: Array<{ id: string; path: string }>,
		oldParentPath: string,
		newParentPath: string,
	): Array<{ id: string; newPath: string }> {
		return descendants.map(({ id, path }) => {
			const suffix = path.slice(oldParentPath.length);
			return {
				id,
				newPath: newParentPath + suffix,
			};
		});
	},
};
