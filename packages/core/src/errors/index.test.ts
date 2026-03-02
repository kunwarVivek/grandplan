import { describe, expect, it } from "vitest";
import {
	AppError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "./index.js";

describe("Core Errors", () => {
	describe("AppError", () => {
		it("should create error with message and default values", () => {
			const error = new AppError("Test error");
			expect(error.message).toBe("Test error");
			expect(error.statusCode).toBe(500);
			expect(error.code).toBe("INTERNAL_ERROR");
			expect(error.isOperational).toBe(true);
		});

		it("should accept custom status code and code", () => {
			const error = new AppError("Test error", 400, "BAD_REQUEST");
			expect(error.message).toBe("Test error");
			expect(error.statusCode).toBe(400);
			expect(error.code).toBe("BAD_REQUEST");
		});

		it("should accept isOperational flag", () => {
			const error = new AppError("Test", 500, "ERROR", false);
			expect(error.isOperational).toBe(false);
		});
	});

	describe("ValidationError", () => {
		it("should create validation error", () => {
			const error = new ValidationError("Invalid input", {
				field: ["must be string"],
			});
			expect(error.message).toBe("Invalid input");
			expect(error.statusCode).toBe(400);
			expect(error.code).toBe("VALIDATION_ERROR");
			expect(error.errors).toEqual({ field: ["must be string"] });
		});

		it("should create validation error with empty errors", () => {
			const error = new ValidationError("Invalid input");
			expect(error.errors).toEqual({});
		});
	});

	describe("NotFoundError", () => {
		it("should create not found error", () => {
			const error = new NotFoundError("User", "user_123");
			expect(error.message).toContain("User");
			expect(error.message).toContain("user_123");
			expect(error.statusCode).toBe(404);
			expect(error.code).toBe("NOT_FOUND");
		});
	});

	describe("ConflictError", () => {
		it("should create conflict error", () => {
			const error = new ConflictError("Resource already exists");
			expect(error.statusCode).toBe(409);
			expect(error.code).toBe("CONFLICT");
		});
	});

	describe("ForbiddenError", () => {
		it("should create forbidden error", () => {
			const error = new ForbiddenError("Access denied");
			expect(error.statusCode).toBe(403);
			expect(error.code).toBe("FORBIDDEN");
		});
	});

	describe("UnauthorizedError", () => {
		it("should create unauthorized error", () => {
			const error = new UnauthorizedError("Not authenticated");
			expect(error.statusCode).toBe(401);
			expect(error.code).toBe("UNAUTHORIZED");
		});
	});
});
