// ============================================
// ORGANIZATION CORE SERVICE
// ============================================
// Handles organization CRUD operations only (SRP)

import { auditService } from "@grandplan/audit";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "@grandplan/core/errors";
import { slugify } from "@grandplan/core/utils";
import db from "@grandplan/db";
import { eventBus } from "@grandplan/events";
import { getCurrentTenant, tryGetCurrentTenant } from "@grandplan/tenant";
import type { OrganizationStatus } from "@prisma/client";
import type { CreateOrganizationDto } from "../../api/dto/create-organization.dto.js";
import type {
	UpdateBrandingDto,
	UpdateOrganizationDto,
} from "../../api/dto/update-organization.dto.js";
import { ORGANIZATION_EVENTS } from "../../domain/events/organization.events.js";
import type {
	IOrganizationRepository,
	OrganizationQueryOptions,
} from "../../infrastructure/repositories/interfaces/index.js";
import { organizationRepository } from "../../infrastructure/repositories/organization.repository.js";

export class OrganizationCoreService {
	constructor(private readonly repository: IOrganizationRepository = organizationRepository) {}

	async create(dto: CreateOrganizationDto, userId: string) {
		const slug = dto.slug || slugify(dto.name);

		// Check for duplicate slug
		const exists = await this.repository.slugExists(slug);
		if (exists) {
			throw new ConflictError(
				`Organization with slug '${slug}' already exists`,
			);
		}

		// Get or create owner role
		let ownerRole = await db.role.findFirst({
			where: { name: "OWNER", scope: "ORGANIZATION", isSystem: true },
		});

		if (!ownerRole) {
			ownerRole = await db.role.create({
				data: {
					name: "OWNER",
					description: "Organization owner with full access",
					scope: "ORGANIZATION",
					isSystem: true,
				},
			});
		}

		const organization = await this.repository.create({
			name: dto.name,
			slug,
			description: dto.description,
			logo: dto.logo,
			createdById: userId,
			initialRoleId: ownerRole.id,
		});

		await eventBus.emit(ORGANIZATION_EVENTS.CREATED, {
			organizationId: organization.id,
			name: organization.name,
			slug: organization.slug,
			createdById: userId,
			createdAt: organization.createdAt,
		});

		await auditService.log({
			action: "organization.created",
			resourceType: "organization",
			resourceId: organization.id,
			userId,
			organizationId: organization.id,
			metadata: { name: organization.name, slug: organization.slug },
		});

		return organization;
	}

	async findById(id: string) {
		const tenant = tryGetCurrentTenant();
		const organization = await this.repository.findByIdWithMembers(id);

		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		// If there's a tenant context, verify access
		if (
			tenant &&
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		return organization;
	}

	async findBySlug(slug: string) {
		const organization = await this.repository.findBySlug(slug);
		if (!organization) {
			throw new NotFoundError("Organization");
		}
		return organization;
	}

	async list(options: OrganizationQueryOptions = {}) {
		const tenant = tryGetCurrentTenant();

		// Only platform admins can list all organizations
		if (!tenant?.hasPermission("platform:admin")) {
			throw new ForbiddenError("Only platform admins can list organizations");
		}

		return this.repository.findAll(options);
	}

	async update(id: string, dto: UpdateOrganizationDto) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await this.repository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		// Check for slug conflict if updating slug
		if (dto.slug && dto.slug !== organization.slug) {
			const exists = await this.repository.slugExists(dto.slug, id);
			if (exists) {
				throw new ConflictError(
					`Organization with slug '${dto.slug}' already exists`,
				);
			}
		}

		const previousValues: Record<string, unknown> = {};
		const changes: Record<string, unknown> = {};

		const trackableFields = [
			"name",
			"slug",
			"description",
			"logo",
			"status",
		] as const;
		for (const field of trackableFields) {
			if (dto[field] !== undefined && dto[field] !== organization[field]) {
				previousValues[field] = organization[field];
				changes[field] = dto[field];
			}
		}

		const updated = await this.repository.update(
			id,
			dto as Partial<{
				name: string;
				slug: string;
				description: string | null;
				logo: string | null;
				status: OrganizationStatus;
			}>,
		);

		if (Object.keys(changes).length > 0) {
			await eventBus.emit(ORGANIZATION_EVENTS.UPDATED, {
				organizationId: id,
				changes,
				previousValues,
				updatedById: tenant.userId,
			});

			if (changes.status) {
				await eventBus.emit(ORGANIZATION_EVENTS.STATUS_CHANGED, {
					organizationId: id,
					previousStatus: previousValues.status as string,
					newStatus: changes.status as string,
					changedById: tenant.userId,
				});
			}

			await auditService.log({
				action: "organization.updated",
				resourceType: "organization",
				resourceId: id,
				userId: tenant.userId,
				organizationId: id,
				metadata: { changes, previousValues },
			});
		}

		return updated;
	}

	async updateBranding(id: string, dto: UpdateBrandingDto) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await this.repository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		// Check custom domain conflict
		if (dto.customDomain && dto.customDomain !== organization.customDomain) {
			const exists = await this.repository.customDomainExists(
				dto.customDomain,
				id,
			);
			if (exists) {
				throw new ConflictError(
					`Custom domain '${dto.customDomain}' is already in use`,
				);
			}
		}

		const brandingConfig = {
			primaryColor: dto.primaryColor,
			secondaryColor: dto.secondaryColor,
			fontFamily: dto.fontFamily,
			logo: dto.logo,
			favicon: dto.favicon,
		};

		const updated = await this.repository.updateBranding(
			id,
			brandingConfig,
			dto.customDomain,
		);

		await eventBus.emit(ORGANIZATION_EVENTS.BRANDING_UPDATED, {
			organizationId: id,
			changes: dto,
			updatedById: tenant.userId,
		});

		await auditService.log({
			action: "organization.branding_updated",
			resourceType: "organization",
			resourceId: id,
			userId: tenant.userId,
			organizationId: id,
			metadata: { branding: brandingConfig, customDomain: dto.customDomain },
		});

		return updated;
	}

	async delete(id: string) {
		const tenant = getCurrentTenant();

		if (
			tenant.organizationId !== id &&
			!tenant.hasPermission("platform:admin")
		) {
			throw new ForbiddenError("Access denied to this organization");
		}

		const organization = await this.repository.findById(id);
		if (!organization) {
			throw new NotFoundError("Organization", id);
		}

		await this.repository.delete(id);

		await eventBus.emit(ORGANIZATION_EVENTS.DELETED, {
			organizationId: id,
			name: organization.name,
			deletedById: tenant.userId,
		});

		await auditService.log({
			action: "organization.deleted",
			resourceType: "organization",
			resourceId: id,
			userId: tenant.userId,
			organizationId: id,
			metadata: { name: organization.name },
		});
	}
}

export const organizationCoreService = new OrganizationCoreService();
