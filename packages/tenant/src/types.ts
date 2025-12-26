// ============================================
// TENANT TYPE DEFINITIONS
// ============================================

export interface TenantContextData {
	userId: string;
	organizationId: string;
	workspaceId?: string;
	permissions: string[];
	role: string;
	organizationRole?: string;
	teamRoles?: Record<string, string>; // teamId -> role
}

export interface TenantInfo {
	organizationId: string;
	organizationSlug: string;
	organizationName: string;
	subscriptionPlan: string;
	features: string[];
	branding?: {
		logo?: string;
		primaryColor?: string;
		secondaryColor?: string;
		customDomain?: string;
	};
}

export interface TenantMemberInfo {
	userId: string;
	email: string;
	name: string;
	avatar?: string;
	organizationRole: string;
	teamMemberships: Array<{
		teamId: string;
		teamName: string;
		role: string;
	}>;
}
