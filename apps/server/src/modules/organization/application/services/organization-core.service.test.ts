// ============================================
// ORGANIZATION CORE SERVICE TESTS
// ============================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationStatus } from "@grandplan/db";
import { OrganizationCoreService } from "./organization-core.service.js";

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
	tryGetCurrentTenant: vi.fn(),
}));

vi.mock("@grandplan/db", () => ({
	default: {
		role: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
	},
}));

vi.mock("@grandplan/core/utils", () => ({
	slugify: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
}));

vi.mock("../../infrastructure/repositories/organization.repository.js", () => ({
	organizationRepository: {
		create: vi.fn(),
		findByIdWithMembers: vi.fn(),
		findBySlug: vi.fn(),
		findAll: vi.fn(),
		findById: vi.fn(),
		update: vi.fn(),
		updateBranding: vi.fn(),
		delete: vi.fn(),
		slugExists: vi.fn(),
		customDomainExists: vi.fn(),
	},
}));

// Import mocks after defining them
import { auditService } from "@grandplan/audit";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant, tryGetCurrentTenant } from "@grandplan/tenant";
import db from "@grandplan/db";
import { slugify } from "@grandplan/core/utils";
import { organizationRepository } from "../../infrastructure/repositories/organization.repository.js";

describe("OrganizationCoreService", () => {
	let service: OrganizationCoreService;

	const mockTenant = {
		userId: "user-123",
		organizationId: "org-123",
		isOrganizationAdmin: () => false,
		hasPermission: vi.fn().mockReturnValue(false),
	};

	const mockOrganization = {
		id: "org-123",
		name: "Test Organization",
		slug: "test-organization",
		description: null,
		logo: null,
		status: "ACTIVE" as OrganizationStatus,
		customDomain: null,
		branding: {},
		createdById: "user-123",
		createdAt: new Date(),
		updatedAt: new Date(),
		members: [],
	};

	beforeEach(() => {
		service = new OrganizationCoreService();
		vi.clearAllMocks();
		vi.mocked(getCurrentTenant).mockReturnValue(mockTenant as never);
	});

	describe("create", () => {
		it("should create an organization successfully", async () => {
			// Arrange
			const dto = {
				name: "New Organization",
				description: "A test organization",
			};

			vi.mocked(organizationRepository.slugExists).mockResolvedValue(false);
			vi.mocked(db.role.findFirst).mockResolvedValue(null);
			vi.mocked(db.role.create).mockResolvedValue({
				id: "role-1",
				name: "OWNER",
			} as never);
			vi.mocked(organizationRepository.create).mockResolvedValue({
				...mockOrganization,
				name: dto.name,
				slug: dto.name.toLowerCase().replace(/\s+/g, "-"),
			} as never);

			// Act
			const result = await service.create(dto, "user-123");

			// Assert
			expect(result.name).toBe(dto.name);
			expect(eventBus.emit).toHaveBeenCalled();
			expect(auditService.log).toHaveBeenCalled();
		});

		it("should throw ConflictError when slug already exists", async () => {
			// Arrange
			const dto = {
				name: "Existing Organization",
				slug: "existing",
			};

			vi.mocked(organizationRepository.slugExists).mockResolvedValue(true);

			// Act & Assert
			await expect(service.create(dto, "user-123")).rejects.toThrow(
				"already exists",
			);
		});

		it("should use provided slug instead of generating one", async () => {
			// Arrange
			const dto = {
				name: "New Organization",
				slug: "custom-slug",
			};

			vi.mocked(organizationRepository.slugExists).mockResolvedValue(false);
			vi.mocked(db.role.findFirst).mockResolvedValue(null);
			vi.mocked(db.role.create).mockResolvedValue({
				id: "role-1",
				name: "OWNER",
			} as never);
			vi.mocked(organizationRepository.create).mockResolvedValue({
				...mockOrganization,
				slug: dto.slug,
			} as never);

			// Act
			const result = await service.create(dto, "user-123");

			// Assert
			expect(result.slug).toBe(dto.slug);
			expect(slugify).not.toHaveBeenCalled();
		});
	});

	describe("findById", () => {
		it("should return organization when found", async () => {
			// Arrange
			vi.mocked(organizationRepository.findByIdWithMembers).mockResolvedValue(
				mockOrganization as never,
			);

			// Act
			const result = await service.findById("org-123");

			// Assert
			expect(result).toEqual(mockOrganization);
		});

		it("should throw NotFoundError when organization not found", async () => {
			// Arrange
			vi.mocked(organizationRepository.findByIdWithMembers).mockResolvedValue(
				null,
			);

			// Act & Assert
			await expect(service.findById("non-existent")).rejects.toThrow(
				"Organization",
			);
		});
	});

	describe("findBySlug", () => {
		it("should return organization by slug", async () => {
			// Arrange
			vi.mocked(organizationRepository.findBySlug).mockResolvedValue(
				mockOrganization as never,
			);

			// Act
			const result = await service.findBySlug("test-organization");

			// Assert
			expect(result).toEqual(mockOrganization);
		});

		it("should throw NotFoundError when slug not found", async () => {
			// Arrange
			vi.mocked(organizationRepository.findBySlug).mockResolvedValue(null);

			// Act & Assert
			await expect(service.findBySlug("non-existent")).rejects.toThrow(
				"Organization",
			);
		});
	});

	describe("list", () => {
		it("should allow platform admin to list all organizations", async () => {
			// Arrange
			const adminTenant = {
				...mockTenant,
				hasPermission: vi.fn().mockReturnValue(true),
			};
			vi.mocked(tryGetCurrentTenant).mockReturnValue(adminTenant as never);
			vi.mocked(organizationRepository.findAll).mockResolvedValue([
				mockOrganization,
			] as never);

			// Act
			const result = await service.list();

			// Assert
			expect(result).toEqual([mockOrganization]);
		});

		it("should throw ForbiddenError for non-admin users", async () => {
			// Arrange
			vi.mocked(tryGetCurrentTenant).mockReturnValue(mockTenant as never);

			// Act & Assert
			await expect(service.list()).rejects.toThrow(
				"Only platform admins can list organizations",
			);
		});
	});

	describe("update", () => {
		it("should update organization successfully", async () => {
			// Arrange
			const updateDto = { name: "Updated Name" };
			const updatedOrg = { ...mockOrganization, name: "Updated Name" };

			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);
			vi.mocked(organizationRepository.update).mockResolvedValue(
				updatedOrg as never,
			);

			// Act
			const result = await service.update("org-123", updateDto);

			// Assert
			expect(result.name).toBe("Updated Name");
		});

		it("should check for slug conflicts when updating slug", async () => {
			// Arrange
			const updateDto = { slug: "existing-slug" };

			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);
			vi.mocked(organizationRepository.slugExists).mockResolvedValue(true);

			// Act & Assert
			await expect(service.update("org-123", updateDto)).rejects.toThrow(
				"already exists",
			);
		});

		it("should emit events when organization is updated", async () => {
			// Arrange
			const updateDto = { name: "Updated Name" };

			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);
			vi.mocked(organizationRepository.update).mockResolvedValue({
				...mockOrganization,
				...updateDto,
			} as never);

			// Act
			await service.update("org-123", updateDto);

			// Assert
			expect(eventBus.emit).toHaveBeenCalled();
		});
	});

	describe("updateBranding", () => {
		it("should update branding successfully", async () => {
			// Arrange
			const brandingDto = {
				primaryColor: "#ff0000",
				logo: "https://example.com/logo.png",
			};

			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);
			vi.mocked(organizationRepository.customDomainExists).mockResolvedValue(
				false,
			);
			vi.mocked(organizationRepository.updateBranding).mockResolvedValue({
				...mockOrganization,
				branding: brandingDto,
			} as never);

			// Act
			const result = await service.updateBranding("org-123", brandingDto);

			// Assert
			expect(organizationRepository.updateBranding).toHaveBeenCalled();
		});

		it("should check for custom domain conflicts", async () => {
			// Arrange
			const brandingDto = {
				customDomain: "existing-domain.com",
			};

			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);
			vi.mocked(organizationRepository.customDomainExists).mockResolvedValue(
				true,
			);

			// Act & Assert
			await expect(
				service.updateBranding("org-123", brandingDto),
			).rejects.toThrow("already in use");
		});
	});

	describe("delete", () => {
		it("should delete organization successfully", async () => {
			// Arrange
			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);
			vi.mocked(organizationRepository.delete).mockResolvedValue(undefined);

			// Act
			await service.delete("org-123");

			// Assert
			expect(organizationRepository.delete).toHaveBeenCalledWith("org-123");
			expect(eventBus.emit).toHaveBeenCalled();
			expect(auditService.log).toHaveBeenCalled();
		});

		it("should throw ForbiddenError when user does not have access", async () => {
			// Arrange
			vi.mocked(organizationRepository.findById).mockResolvedValue(
				mockOrganization as never,
			);

			// Act & Assert
			await expect(service.delete("different-org")).rejects.toThrow(
				"Access denied to this organization",
			);
		});

		it("should throw NotFoundError when organization not found", async () => {
			// Arrange - set up tenant to have access to org-123
			const accessingTenant = {
				...mockTenant,
				organizationId: "org-123",
			};
			vi.mocked(getCurrentTenant).mockReturnValue(accessingTenant as never);
			vi.mocked(organizationRepository.findById).mockResolvedValue(null);

			// Act & Assert
			await expect(service.delete("org-123")).rejects.toThrow("Organization");
		});
	});
});
