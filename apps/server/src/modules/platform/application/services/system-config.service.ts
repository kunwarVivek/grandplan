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
	rolloutPercentage: number;
	targetOrganizations: string[];
	targetUsers: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Announcement {
	id: string;
	title: string;
	content: string;
	type: "info" | "warning" | "success" | "error";
	targetAudience: "all" | "admins" | "organizations" | "users";
	startAt: Date;
	endAt: Date | null;
	dismissible: boolean;
	active: boolean;
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
			enabled: f.enabled,
			rolloutPercentage: f.rolloutPercentage,
			targetOrganizations: (f.targetOrganizations as string[]) ?? [],
			targetUsers: (f.targetUsers as string[]) ?? [],
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
			enabled: flag.enabled,
			rolloutPercentage: flag.rolloutPercentage,
			targetOrganizations: (flag.targetOrganizations as string[]) ?? [],
			targetUsers: (flag.targetUsers as string[]) ?? [],
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
		rolloutPercentage?: number;
		targetOrganizations?: string[];
		targetUsers?: string[];
	}): Promise<FeatureFlag> {
		const flag = await db.featureFlag.create({
			data: {
				key: data.key,
				name: data.name,
				description: data.description,
				enabled: data.enabled ?? false,
				rolloutPercentage: data.rolloutPercentage ?? 0,
				targetOrganizations: data.targetOrganizations ?? [],
				targetUsers: data.targetUsers ?? [],
			},
		});

		return {
			id: flag.id,
			key: flag.key,
			name: flag.name,
			description: flag.description,
			enabled: flag.enabled,
			rolloutPercentage: flag.rolloutPercentage,
			targetOrganizations: (flag.targetOrganizations as string[]) ?? [],
			targetUsers: (flag.targetUsers as string[]) ?? [],
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
	async isFeatureEnabled(
		key: string,
		context: { userId?: string; organizationId?: string },
	): Promise<boolean> {
		const flag = await db.featureFlag.findUnique({ where: { key } });

		if (!flag) {
			return false;
		}

		if (!flag.enabled) {
			return false;
		}

		// Check target lists first
		const targetOrgs = (flag.targetOrganizations as string[]) ?? [];
		const targetUsers = (flag.targetUsers as string[]) ?? [];

		if (context.organizationId && targetOrgs.includes(context.organizationId)) {
			return true;
		}

		if (context.userId && targetUsers.includes(context.userId)) {
			return true;
		}

		// If targets are specified but user/org not in them, check rollout
		if (targetOrgs.length > 0 || targetUsers.length > 0) {
			// If there are targets and this user/org isn't in them,
			// still check percentage rollout
		}

		// Check percentage rollout
		if (flag.rolloutPercentage >= 100) {
			return true;
		}

		if (flag.rolloutPercentage <= 0) {
			return false;
		}

		// Use a deterministic hash based on user/org id
		const id = context.userId ?? context.organizationId ?? "";
		const hash = this.simpleHash(id + key);
		const bucket = hash % 100;

		return bucket < flag.rolloutPercentage;
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
			where.active = true;
			where.startAt = { lte: now };
			where.OR = [{ endAt: null }, { endAt: { gte: now } }];
		}

		const [announcements, total] = await Promise.all([
			db.announcement.findMany({
				where,
				orderBy: { startAt: "desc" },
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
				startAt: a.startAt,
				endAt: a.endAt,
				dismissible: a.dismissible,
				active: a.active,
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
			startAt: announcement.startAt,
			endAt: announcement.endAt,
			dismissible: announcement.dismissible,
			active: announcement.active,
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
		type: "info" | "warning" | "success" | "error";
		targetAudience: "all" | "admins" | "organizations" | "users";
		startAt?: Date;
		endAt?: Date | null;
		dismissible?: boolean;
	}): Promise<Announcement> {
		const announcement = await db.announcement.create({
			data: {
				title: data.title,
				content: data.content,
				type: data.type,
				targetAudience: data.targetAudience,
				startAt: data.startAt ?? new Date(),
				endAt: data.endAt ?? null,
				dismissible: data.dismissible ?? true,
				active: true,
			},
		});

		return {
			id: announcement.id,
			title: announcement.title,
			content: announcement.content,
			type: announcement.type as Announcement["type"],
			targetAudience:
				announcement.targetAudience as Announcement["targetAudience"],
			startAt: announcement.startAt,
			endAt: announcement.endAt,
			dismissible: announcement.dismissible,
			active: announcement.active,
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
			type?: "info" | "warning" | "success" | "error";
			targetAudience?: "all" | "admins" | "organizations" | "users";
			startAt?: Date;
			endAt?: Date | null;
			dismissible?: boolean;
			active?: boolean;
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
			active: true,
			startAt: { lte: now },
			OR: [{ endAt: null }, { endAt: { gte: now } }],
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
			orderBy: { startAt: "desc" },
		});

		return announcements.map((a) => ({
			id: a.id,
			title: a.title,
			content: a.content,
			type: a.type as Announcement["type"],
			targetAudience: a.targetAudience as Announcement["targetAudience"],
			startAt: a.startAt,
			endAt: a.endAt,
			dismissible: a.dismissible,
			active: a.active,
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

	private parseValue(value: string, expectedType: string): unknown {
		try {
			const parsed = JSON.parse(value);

			if (expectedType === "boolean") {
				return Boolean(parsed);
			}

			if (expectedType === "number") {
				return Number(parsed);
			}

			return parsed;
		} catch {
			return value;
		}
	}

	private simpleHash(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}
}

// Singleton instance
export const systemConfigService = new SystemConfigService();
