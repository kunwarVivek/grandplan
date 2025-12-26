import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrganizationStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export type BrandingConfig = {
	primaryColor?: string;
	secondaryColor?: string;
	accentColor?: string;
	logo?: string;
	logoDark?: string;
	favicon?: string;
	fontFamily?: string;
	customCSS?: string;
};

export type Organization = {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	status: OrganizationStatus;
	brandingConfig?: BrandingConfig | null;
	customDomain?: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type OrganizationMember = {
	id: string;
	userId: string;
	organizationId: string;
	role: MemberRole;
	createdAt: Date;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
};

type OrganizationState = {
	// State
	organizations: Organization[];
	activeOrganization: Organization | null;
	activeRole: MemberRole | null;
	isLoading: boolean;

	// Actions
	setOrganizations: (organizations: Organization[]) => void;
	setActiveOrganization: (organization: Organization | null, role?: MemberRole | null) => void;
	addOrganization: (organization: Organization) => void;
	updateOrganization: (id: string, updates: Partial<Organization>) => void;
	removeOrganization: (id: string) => void;
	setLoading: (loading: boolean) => void;
	clear: () => void;
};

export const useOrganizationStore = create<OrganizationState>()(
	persist(
		(set) => ({
			// Initial state
			organizations: [],
			activeOrganization: null,
			activeRole: null,
			isLoading: false,

			// Actions
			setOrganizations: (organizations) => set({ organizations }),

			setActiveOrganization: (organization, role = null) =>
				set({
					activeOrganization: organization,
					activeRole: role,
				}),

			addOrganization: (organization) =>
				set((state) => ({
					organizations: [...state.organizations, organization],
				})),

			updateOrganization: (id, updates) =>
				set((state) => ({
					organizations: state.organizations.map((org) =>
						org.id === id ? { ...org, ...updates } : org,
					),
					activeOrganization:
						state.activeOrganization?.id === id
							? { ...state.activeOrganization, ...updates }
							: state.activeOrganization,
				})),

			removeOrganization: (id) =>
				set((state) => ({
					organizations: state.organizations.filter((org) => org.id !== id),
					activeOrganization:
						state.activeOrganization?.id === id ? null : state.activeOrganization,
				})),

			setLoading: (isLoading) => set({ isLoading }),

			clear: () =>
				set({
					organizations: [],
					activeOrganization: null,
					activeRole: null,
					isLoading: false,
				}),
		}),
		{
			name: "grandplan-organization",
			partialize: (state) => ({
				activeOrganization: state.activeOrganization,
				activeRole: state.activeRole,
			}),
		},
	),
);

// Selector hooks
export const useActiveOrganization = () =>
	useOrganizationStore((state) => state.activeOrganization);
export const useActiveRole = () => useOrganizationStore((state) => state.activeRole);
export const useOrganizations = () => useOrganizationStore((state) => state.organizations);
export const useIsOrgAdmin = () => {
	const role = useOrganizationStore((state) => state.activeRole);
	return role === "OWNER" || role === "ADMIN";
};
