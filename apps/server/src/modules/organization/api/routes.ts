// ============================================
// ORGANIZATION ROUTES
// ============================================

import { requirePermission } from "@grandplan/rbac";
import { Router } from "express";
import { organizationController } from "./controllers/organization.controller.js";

const router = Router();

// Organization CRUD
router.get("/", requirePermission("organization:list"), (req, res, next) => {
	organizationController.list(req, res, next);
});

router.post("/", requirePermission("organization:create"), (req, res, next) => {
	organizationController.create(req, res, next);
});

router.get(
	"/slug/:slug",
	requirePermission("organization:read"),
	(req, res, next) => {
		organizationController.getBySlug(req, res, next);
	},
);

router.get("/:id", requirePermission("organization:read"), (req, res, next) => {
	organizationController.get(req, res, next);
});

router.patch(
	"/:id",
	requirePermission("organization:update"),
	(req, res, next) => {
		organizationController.update(req, res, next);
	},
);

router.patch(
	"/:id/branding",
	requirePermission("organization:update"),
	(req, res, next) => {
		organizationController.updateBranding(req, res, next);
	},
);

router.delete(
	"/:id",
	requirePermission("organization:delete"),
	(req, res, next) => {
		organizationController.delete(req, res, next);
	},
);

// Members
router.get(
	"/:id/members",
	requirePermission("organization:read"),
	(req, res, next) => {
		organizationController.listMembers(req, res, next);
	},
);

router.post(
	"/:id/members/invite",
	requirePermission("organization:manage_members"),
	(req, res, next) => {
		organizationController.inviteMember(req, res, next);
	},
);

router.patch(
	"/:id/members/:userId",
	requirePermission("organization:manage_members"),
	(req, res, next) => {
		organizationController.updateMemberRole(req, res, next);
	},
);

router.delete(
	"/:id/members/:userId",
	requirePermission("organization:manage_members"),
	(req, res, next) => {
		organizationController.removeMember(req, res, next);
	},
);

// Invitations
router.get(
	"/:id/invitations",
	requirePermission("organization:read"),
	(req, res, next) => {
		organizationController.listInvitations(req, res, next);
	},
);

router.delete(
	"/:id/invitations/:invitationId",
	requirePermission("organization:manage_members"),
	(req, res, next) => {
		organizationController.revokeInvitation(req, res, next);
	},
);

// Public invitation acceptance (no permission required, just auth)
router.post("/invitations/accept", (req, res, next) => {
	organizationController.acceptInvitation(req, res, next);
});

export { router as organizationRoutes };
