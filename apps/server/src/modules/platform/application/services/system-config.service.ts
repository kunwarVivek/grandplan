// ============================================
// SYSTEM CONFIG SERVICE
// ============================================

import { NotFoundError } from "@grandplan/core";
import { db } from "@grandplan/db";

export interface SystemSettings {
	// General
	platformName: string;
	platformUrl: string;
	supportEmail: string;
	maintenanceMode: boolean;
	maintenanceMessage: string | null;

	// Registration
	registrationEnabled: boolean;
	inviteOnly: boolean;
	emailVerificationRequired: boolean;
	allowedDomains: string[];

	// Limits
	defaultAICreditsPerMonth: number;
	maxOrganizationsPerUser: number;
	maxMembersPerOrganization: number;
	maxProjectsPerOrganization: number;

	// Features
	aiEnabled: boolean;
	slackIntegrationEnabled: boolean;
	webhooksEnabled: boolean;

	// Security
	mfaRequired: boolean;
	sessionTimeoutMinutes: number;
	maxLoginAttempts: number;
	passwordMinLength: number;
	passwordRequireSpecialChar: boolean;
}

export interface FeatureFlag {
	id: string;
	key: string;
	name: string;
	description: string | null;
	enabled: boolean;
	rolloutPercentage: number | null;
	targetOrganizations: string[];
	targetUsers: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Announcement {
	id: string;
	title: string;
	content: string;
	type:
		| "info"
		| "warning"
		| "success"
		| "error"
		| "critical"
		| "maintenance"
		| "new_feature"
		| "promotion";
	targetAudience: string[];
	startsAt: Date;
	endsAt: Date | null;
	dismissible: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const DEFAULT_SETTINGS: SystemSettings = {
	platformName: "GrandPlan",
	platformUrl: "https://grandplan.app",
	supportEmail: "support@grandplan.app",
	maintenanceMode: false,
	maintenanceMessage: null,
	registrationEnabled: true,
	inviteOnly: false,
	emailVerificationRequired: true,
	allowedDomains: [],
	defaultAICreditsPerMonth: 100,
	maxOrganizationsPerUser: 5,
	maxMembersPerOrganization: 50,
	maxProjectsPerOrganization: 20,
	aiEnabled: true,
	slackIntegrationEnabled: true,
	webhooksEnabled: true,
	mfaRequired: false,
	sessionTimeoutMinutes: 1440, // 24 hours
	maxLoginAttempts: 5,
	passwordMinLength: 8,
	passwordRequireSpecialChar: true,
};

export class SystemConfigService {
	/**
	 * Get all system settings
	 */
	async getSettings(): Promise<SystemSettings> {
		const configs = await db.systemConfig.findMany();

		const settings = { ...DEFAULT_SETTINGS };

		for (const config of configs) {
			if (config.key in settings) {
				const value = this.parseValue(
					config.value,
					typeof settings[config.key as keyof SystemSettings],
				);
				(settings as Record<string, unknown>)[config.key] = value;
			}
		}

		return settings;
	}

	/**
	 * Get a single setting
	 */
	async getSetting<K extends keyof SystemSettings>(
		key: K,
	): Promise<SystemSettings[K]> {
		const config = await db.systemConfig.findUnique({
			where: { key },
		});

		if (!config) {
			return DEFAULT_SETTINGS[key];
		}

		return this.parseValue(
			config.value,
			typeof DEFAULT_SETTINGS[key],
		) as SystemSettings[K];
	}

	/**
	 * Update system settings
	 */
	async updateSettings(updates: Partial<SystemSettings>): Promise<void> {
		const operations = Object.entries(updates).map(([key, value]) =>
			db.systemConfig.upsert({
				where: { key },
				create: {
					key,
					value: JSON.stringify(value),
				},
				update: {
					value: JSON.stringify(value),
				},
			}),
		);

		await db.$transaction(operations);
	}

	/**
	 * Enable maintenance mode
	 */
	async enableMaintenanceMode(message: string): Promise<void> {
		await this.updateSettings({
			maintenanceMode: true,
			maintenanceMessage: message,
		});
	}

	/**
	 * Disable maintenance mode
	 */
	async disableMaintenanceMode(): Promise<void> {
		await this.updateSettings({
			maintenanceMode: false,
			maintenanceMessage: null,
		});
	}

	// ============================================
	// FEATURE FLAGS
	// ============================================

	/**
	 * List all feature flags
	 */
	async listFeatureFlags(): Promise<FeatureFlag[]> {
		const flags = await db.featureFlag.findMany({
			orderBy: { key: "asc" },
		});

		return flags.map((f) => ({
			id: f.id,
			key: f.key,
			name: f.name,
			description: f.description,
			enabled: f.defaultEnabled,
			rolloutPercentage: null,
			targetOrganizations: [],
			targetUsers: [],
			createdAt: f.createdAt,
			updatedAt: f.updatedAt,
		}));
	}

	/**
	 * Get a feature flag
	 */
	async getFeatureFlag(key: string): Promise<FeatureFlag> {
		const flag = await db.featureFlag.findUnique({
			where: { key },
		});

		if (!flag) {
			throw new NotFoundError("FeatureFlag", key);
		}

		return {
			id: flag.id,
			key: flag.key,
			name: flag.name,
			description: flag.description,
			enabled: flag.defaultEnabled,
			rolloutPercentage: 0,
			targetOrganizations: [],
			targetUsers: [],
			createdAt: flag.createdAt,
			updatedAt: flag.updatedAt,
		};
	}

	/**
	 * Create a feature flag
	 */
	async createFeatureFlag(data: {
		key: string;
		name: string;
		description?: string;
		enabled?: boolean;
	}): Promise<FeatureFlag> {
		const flag = await db.featureFlag.create({
			data: {
				key: data.key,
				name: data.name,
				description: data.description,
				defaultEnabled: data.enabled ?? false,
			},
		});

		return {
			id: flag.id,
			key: flag.key,
			name: flag.name,
			description: flag.description,
			enabled: flag.defaultEnabled,
			rolloutPercentage: 0,
			targetOrganizations: [],
			targetUsers: [],
			createdAt: flag.createdAt,
			updatedAt: flag.updatedAt,
		};
	}

	/**
	 * Update a feature flag
	 */
	async updateFeatureFlag(
		key: string,
		updates: {
			name?: string;
			description?: string;
			enabled?: boolean;
			rolloutPercentage?: number;
			targetOrganizations?: string[];
			targetUsers?: string[];
		},
	): Promise<void> {
		const existing = await db.featureFlag.findUnique({ where: { key } });

		if (!existing) {
			throw new NotFoundError("FeatureFlag", key);
		}

		await db.featureFlag.update({
			where: { key },
			data: updates,
		});
	}

	/**
	 * Delete a feature flag
	 */
	async deleteFeatureFlag(key: string): Promise<void> {
		const existing = await db.featureFlag.findUnique({ where: { key } });

		if (!existing) {
			throw new NotFoundError("FeatureFlag", key);
		}

		await db.featureFlag.delete({ where: { key } });
	}

	/**
	 * Check if a feature is enabled for a user/organization
	 */
	async isFeatureEnabled(key: string): Promise<boolean> {
		const flag = await db.featureFlag.findUnique({ where: { key } });

		if (!flag) {
			return false;
		}

		return flag.defaultEnabled;
	}

	// ============================================
	// ANNOUNCEMENTS
	// ============================================

	/**
	 * List announcements
	 */
	async listAnnouncements(
		options: { activeOnly?: boolean; limit?: number; offset?: number } = {},
	): Promise<{ announcements: Announcement[]; total: number }> {
		const { activeOnly = false, limit = 50, offset = 0 } = options;

		const where: Record<string, unknown> = {};

		if (activeOnly) {
			const now = new Date();
			where.isActive = true;
			where.startsAt = { lte: now };
			where.OR = [{ endsAt: null }, { endsAt: { gte: now } }];
		}

		const [announcements, total] = await Promise.all([
			db.announcement.findMany({
				where,
				orderBy: { startsAt: "desc" },
				take: limit,
				skip: offset,
			}),
			db.announcement.count({ where }),
		]);

		return {
			announcements: announcements.map((a) => ({
				id: a.id,
				title: a.title,
				content: a.content,
				type: a.type as Announcement["type"],
				targetAudience: a.targetAudience as Announcement["targetAudience"],
				startsAt: a.startsAt,
				endsAt: a.endsAt,
				dismissible: a.dismissible,
				isActive: a.isActive,
				createdAt: a.createdAt,
				updatedAt: a.updatedAt,
			})),
			total,
		};
	}

	/**
	 * Get announcement
	 */
	async getAnnouncement(id: string): Promise<Announcement> {
		const announcement = await db.announcement.findUnique({
			where: { id },
		});

		if (!announcement) {
			throw new NotFoundError("Announcement", id);
		}

		return {
			id: announcement.id,
			title: announcement.title,
			content: announcement.content,
			type: announcement.type as Announcement["type"],
			targetAudience:
				announcement.targetAudience as Announcement["targetAudience"],
			startsAt: announcement.startsAt,
			endsAt: announcement.endsAt,
			dismissible: announcement.dismissible,
			isActive: announcement.isActive,
			createdAt: announcement.createdAt,
			updatedAt: announcement.updatedAt,
		};
	}

	/**
	 * Create announcement
	 */
	async createAnnouncement(data: {
		title: string;
		content: string;
		type:
			| "INFO"
			| "WARNING"
			| "CRITICAL"
			| "MAINTENANCE"
			| "NEW_FEATURE"
			| "PROMOTION";
		targetAudience: string[];
		startsAt?: Date;
		endsAt?: Date | null;
		dismissible?: boolean;
		createdById: string;
	}): Promise<Announcement> {
		const announcement = await db.announcement.create({
			data: {
				title: data.title,
				content: data.content,
				type: data.type,
				targetAudience: data.targetAudience,
				startsAt: data.startsAt ?? new Date(),
				endsAt: data.endsAt ?? null,
				dismissible: data.dismissible ?? true,
				isActive: true,
				createdById: data.createdById,
			},
		});

		return {
			id: announcement.id,
			title: announcement.title,
			content: announcement.content,
			type: announcement.type as Announcement["type"],
			targetAudience:
				announcement.targetAudience as Announcement["targetAudience"],
			startsAt: announcement.startsAt,
			endsAt: announcement.endsAt,
			dismissible: announcement.dismissible,
			isActive: announcement.isActive,
			createdAt: announcement.createdAt,
			updatedAt: announcement.updatedAt,
		};
	}

	/**
	 * Update announcement
	 */
	async updateAnnouncement(
		id: string,
		updates: {
			title?: string;
			content?: string;
			type?:
				| "INFO"
				| "WARNING"
				| "CRITICAL"
				| "MAINTENANCE"
				| "NEW_FEATURE"
				| "PROMOTION";
			targetAudience?: string[];
			startsAt?: Date;
			endsAt?: Date | null;
			dismissible?: boolean;
			isActive?: boolean;
		},
	): Promise<void> {
		const existing = await db.announcement.findUnique({ where: { id } });

		if (!existing) {
			throw new NotFoundError("Announcement", id);
		}

		await db.announcement.update({
			where: { id },
			data: updates,
		});
	}

	/**
	 * Delete announcement
	 */
	async deleteAnnouncement(id: string): Promise<void> {
		const existing = await db.announcement.findUnique({ where: { id } });

		if (!existing) {
			throw new NotFoundError("Announcement", id);
		}

		await db.announcement.delete({ where: { id } });
	}

	/**
	 * Get active announcements for a user
	 */
	async getActiveAnnouncementsForUser(
		userId: string,
		isAdmin: boolean,
	): Promise<Announcement[]> {
		const now = new Date();

		const where: Record<string, unknown> = {
			isActive: true,
			startsAt: { lte: now },
			OR: [{ endsAt: null }, { endsAt: { gte: now } }],
		};

		// Filter by audience
		if (isAdmin) {
			where.targetAudience = { in: ["all", "admins"] };
		} else {
			where.targetAudience = { in: ["all", "users"] };
		}

		// Get dismissed announcements for this user
		const dismissals = await db.announcementDismissal.findMany({
			where: { userId },
			select: { announcementId: true },
		});

		const dismissedIds = dismissals.map((d) => d.announcementId);

		if (dismissedIds.length > 0) {
			where.id = { notIn: dismissedIds };
		}

		const announcements = await db.announcement.findMany({
			where,
			orderBy: { startsAt: "desc" },
		});

		return announcements.map((a) => ({
			id: a.id,
			title: a.title,
			content: a.content,
			type: a.type as Announcement["type"],
			targetAudience: a.targetAudience as Announcement["targetAudience"],
			startsAt: a.startsAt,
			endsAt: a.endsAt,
			dismissible: a.dismissible,
			isActive: a.isActive,
			createdAt: a.createdAt,
			updatedAt: a.updatedAt,
		}));
	}

	/**
	 * Dismiss announcement for a user
	 */
	async dismissAnnouncement(
		announcementId: string,
		userId: string,
	): Promise<void> {
		const announcement = await db.announcement.findUnique({
			where: { id: announcementId },
		});

		if (!announcement) {
			throw new NotFoundError("Announcement", announcementId);
		}

		if (!announcement.dismissible) {
			throw new Error("This announcement cannot be dismissed");
		}

		await db.announcementDismissal.upsert({
			where: {
				announcementId_userId: { announcementId, userId },
			},
			create: { announcementId, userId },
			update: {},
		});
	}

	// ============================================
	// HELPERS
	// ============================================

	private parseValue(value: unknown, expectedType: string): unknown {
		try {
			if (typeof value === "string") {
				const parsed = JSON.parse(value);

				if (expectedType === "boolean") {
					return Boolean(parsed);
				}

				if (expectedType === "number") {
					return Number(parsed);
				}

				return parsed;
			}
			return value;
		} catch {
			return value;
		}
	}
}

// Singleton instance
export const systemConfigService = new SystemConfigService();
