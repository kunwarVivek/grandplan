import { describe, expect, it } from "vitest";
import {
	slugify,
	chunk,
	unique,
	groupBy,
	omit,
	pick,
	deepClone,
	safeJsonParse,
	buildMaterializedPath,
	getAncestorIds,
	getDepthFromPath,
	isDescendantOf,
	addDays,
	addHours,
	isExpired,
	generateId,
	generateShortId,
	hashToken,
	verifyToken,
} from "./index.js";

describe("Core Utils", () => {
	describe("slugify", () => {
		it("should convert text to slug", () => {
			expect(slugify("Hello World")).toBe("hello-world");
			expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
			expect(slugify("Special @#$ Characters!")).toBe("special-characters");
			expect(slugify("UPPERCASE")).toBe("uppercase");
		});

		it("should handle empty string", () => {
			expect(slugify("")).toBe("");
		});
	});

	describe("chunk", () => {
		it("should split array into chunks", () => {
			expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
			expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
			expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
		});

		it("should handle empty array", () => {
			expect(chunk([], 2)).toEqual([]);
		});
	});

	describe("unique", () => {
		it("should remove duplicates", () => {
			expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
			expect(unique(["a", "b", "a"])).toEqual(["a", "b"]);
		});
	});

	describe("groupBy", () => {
		it("should group items by key", () => {
			const items = [
				{ type: "a", value: 1 },
				{ type: "b", value: 2 },
				{ type: "a", value: 3 },
			];
			const grouped = groupBy(items, (item) => item.type);
			expect(grouped.a).toHaveLength(2);
			expect(grouped.b).toHaveLength(1);
		});
	});

	describe("omit", () => {
		it("should remove specified keys", () => {
			const obj = { a: 1, b: 2, c: 3 };
			expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
			expect(omit(obj, ["a", "c"])).toEqual({ b: 2 });
		});
	});

	describe("pick", () => {
		it("should keep only specified keys", () => {
			const obj = { a: 1, b: 2, c: 3 };
			expect(pick(obj, ["a", "b"])).toEqual({ a: 1, b: 2 });
			expect(pick(obj, ["c"])).toEqual({ c: 3 });
		});
	});

	describe("deepClone", () => {
		it("should create a deep copy", () => {
			const obj = { a: { b: { c: 1 } } };
			const clone = deepClone(obj);
			clone.a.b.c = 2;
			expect(obj.a.b.c).toBe(1);
		});
	});

	describe("safeJsonParse", () => {
		it("should parse valid JSON", () => {
			expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
		});

		it("should return fallback for invalid JSON", () => {
			expect(safeJsonParse("invalid", { default: true })).toEqual({ default: true });
		});
	});

	describe("Materialized Path Utils", () => {
		it("should build path correctly", () => {
			expect(buildMaterializedPath(null, "abc")).toBe("abc");
			expect(buildMaterializedPath("abc", "def")).toBe("abc.def");
			expect(buildMaterializedPath("abc.def", "ghi")).toBe("abc.def.ghi");
		});

		it("should get ancestor IDs", () => {
			expect(getAncestorIds("abc")).toEqual([]);
			expect(getAncestorIds("abc.def")).toEqual(["abc"]);
			expect(getAncestorIds("abc.def.ghi")).toEqual(["abc", "def"]);
		});

		it("should calculate depth from path", () => {
			expect(getDepthFromPath("abc")).toBe(0);
			expect(getDepthFromPath("abc.def")).toBe(1);
			expect(getDepthFromPath("abc.def.ghi")).toBe(2);
		});

		it("should check descendant relationship", () => {
			expect(isDescendantOf("abc.def", "abc")).toBe(true);
			expect(isDescendantOf("abc.def.ghi", "abc")).toBe(true);
			expect(isDescendantOf("abc", "abc")).toBe(false);
			expect(isDescendantOf("xyz", "abc")).toBe(false);
		});
	});

	describe("Date Utils", () => {
		it("should add days correctly", () => {
			const date = new Date("2024-01-01");
			const result = addDays(date, 5);
			expect(result.getDate()).toBe(6);
		});

		it("should add hours correctly", () => {
			const date = new Date("2024-01-01T10:00:00");
			const result = addHours(date, 3);
			expect(result.getHours()).toBe(13);
		});

		it("should check expiration", () => {
			const pastDate = new Date(Date.now() - 1000);
			const futureDate = new Date(Date.now() + 100000);
			expect(isExpired(pastDate)).toBe(true);
			expect(isExpired(futureDate)).toBe(false);
		});
	});

	describe("ID Generation", () => {
		it("should generate unique IDs", () => {
			const id1 = generateId();
			const id2 = generateId();
			expect(id1).not.toBe(id2);
			expect(id1).toHaveLength(21);
		});

		it("should generate short IDs", () => {
			const id = generateShortId();
			expect(id).toHaveLength(10);
		});
	});

	describe("Token Utils", () => {
		it("should hash and verify tokens", () => {
			const token = "my-secret-token";
			const hashed = hashToken(token);
			expect(verifyToken(token, hashed)).toBe(true);
			expect(verifyToken("wrong-token", hashed)).toBe(false);
		});

		it("should produce consistent hashes", () => {
			const token = "test-token";
			expect(hashToken(token)).toBe(hashToken(token));
		});
	});
});
