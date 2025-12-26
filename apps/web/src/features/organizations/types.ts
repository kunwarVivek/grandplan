export type OrganizationRole = "owner" | "admin" | "member";

export type Organization = {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	description?: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type OrganizationMember = {
	id: string;
	userId: string;
	organizationId: string;
	role: OrganizationRole;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
	createdAt: Date;
};

export type Invitation = {
	id: string;
	email: string;
	organizationId: string;
	role: OrganizationRole;
	status: "pending" | "accepted" | "expired" | "cancelled";
	expiresAt: Date;
	createdAt: Date;
	invitedBy: {
		id: string;
		name: string;
	};
};

export type CreateOrganizationInput = {
	name: string;
	slug?: string;
	description?: string;
	logo?: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export type InviteMemberInput = {
	email: string;
	role: OrganizationRole;
};

export const ORGANIZATION_ROLE_CONFIG: Record<
	OrganizationRole,
	{ label: string; description: string }
> = {
	owner: {
		label: "Owner",
		description: "Full access to all organization settings and billing",
	},
	admin: {
		label: "Admin",
		description: "Can manage members and organization settings",
	},
	member: {
		label: "Member",
		description: "Can access organization resources",
	},
};
