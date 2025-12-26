// ============================================
// TEAM ENTITY
// ============================================

export interface TeamEntity {
	id: string;
	name: string;
	description: string | null;
	organizationId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface TeamMemberEntity {
	id: string;
	teamId: string;
	organizationMemberId: string;
	teamRoleId: string | null;
	createdAt: Date;
}

export interface TeamWithMembers extends TeamEntity {
	members: Array<
		TeamMemberEntity & {
			organizationMember: {
				id: string;
				userId: string;
				user: {
					id: string;
					name: string | null;
					email: string;
					image: string | null;
				};
			};
			teamRole: {
				id: string;
				name: string;
			} | null;
		}
	>;
	_count: {
		members: number;
	};
}

export interface TeamWithOrganization extends TeamEntity {
	organization: {
		id: string;
		name: string;
		slug: string;
	};
}

export function canManageTeam(memberRole: string | null): boolean {
	return memberRole === "LEAD" || memberRole === "MANAGER";
}
