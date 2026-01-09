// ============================================
// ORGANIZATION MODULE EXPORTS
// ============================================

// DTOs
export * from "./api/dto/create-organization.dto.js";
export * from "./api/dto/update-organization.dto.js";

// Routes
export { organizationRoutes } from "./api/routes.js";

// Services - Facade (backwards compatible)
export { organizationService } from "./application/services/organization.service.js";

// Services - Focused (SRP compliant)
export { organizationCoreService } from "./application/services/organization-core.service.js";
export { organizationInvitationService } from "./application/services/organization-invitation.service.js";
export { organizationMemberService } from "./application/services/organization-member.service.js";

// Domain
export * from "./domain/entities/organization.entity.js";
export * from "./domain/events/organization.events.js";
// Repository - Interfaces (DIP compliant)
export type {
	IInvitationRepository,
	IMemberRepository,
	InvitationQueryOptions,
	InvitationQueryResult,
	IOrganizationRepository,
	MemberQueryOptions,
	MemberQueryResult,
	OrganizationQueryOptions,
	OrganizationQueryResult,
} from "./infrastructure/repositories/interfaces/index.js";
// Repository - Concrete implementation
export { organizationRepository } from "./infrastructure/repositories/organization.repository.js";
