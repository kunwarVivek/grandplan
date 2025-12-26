import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
	EmailTemplate,
	EmailTemplateInput,
	EmailTemplateFilters,
	CustomDomain,
	CustomDomainInput,
	FeatureFlag,
	OrganizationFeatureFlag,
	BrandingConfig,
	BrandingConfigInput,
} from "../types";

// Email Templates
export function useEmailTemplates(orgId: string, filters?: EmailTemplateFilters) {
	return useQuery({
		queryKey: ["email-templates", orgId, filters],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (filters?.type) params.set("type", filters.type);
			if (filters?.isActive !== undefined) params.set("isActive", String(filters.isActive));
			const response = await api.get<{ items: EmailTemplate[] }>(
				`/organizations/${orgId}/whitelabel/email-templates?${params}`
			);
			return response.items;
		},
		enabled: !!orgId,
	});
}

export function useEmailTemplate(orgId: string, templateId: string) {
	return useQuery({
		queryKey: ["email-template", orgId, templateId],
		queryFn: async () => {
			return api.get<EmailTemplate>(
				`/organizations/${orgId}/whitelabel/email-templates/${templateId}`
			);
		},
		enabled: !!orgId && !!templateId,
	});
}

export function useCreateEmailTemplate(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: EmailTemplateInput) => {
			return api.post<EmailTemplate>(
				`/organizations/${orgId}/whitelabel/email-templates`,
				data
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["email-templates", orgId] });
		},
	});
}

export function useUpdateEmailTemplate(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplateInput> }) => {
			return api.patch<EmailTemplate>(
				`/organizations/${orgId}/whitelabel/email-templates/${id}`,
				data
			);
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ["email-templates", orgId] });
			queryClient.invalidateQueries({ queryKey: ["email-template", orgId, id] });
		},
	});
}

export function useDeleteEmailTemplate(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			return api.delete(`/organizations/${orgId}/whitelabel/email-templates/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["email-templates", orgId] });
		},
	});
}

export function usePreviewEmailTemplate(orgId: string) {
	return useMutation({
		mutationFn: async ({ templateId, variables }: { templateId: string; variables: Record<string, string> }) => {
			return api.post<{ html: string; text: string }>(
				`/organizations/${orgId}/whitelabel/email-templates/${templateId}/preview`,
				{ variables }
			);
		},
	});
}

export function useSendTestEmail(orgId: string) {
	return useMutation({
		mutationFn: async ({ templateId, email }: { templateId: string; email: string }) => {
			return api.post(
				`/organizations/${orgId}/whitelabel/email-templates/${templateId}/test`,
				{ email }
			);
		},
	});
}

// Custom Domains
export function useCustomDomains(orgId: string) {
	return useQuery({
		queryKey: ["custom-domains", orgId],
		queryFn: async () => {
			const response = await api.get<{ items: CustomDomain[] }>(
				`/organizations/${orgId}/whitelabel/domains`
			);
			return response.items;
		},
		enabled: !!orgId,
	});
}

export function useCustomDomain(orgId: string, domainId: string) {
	return useQuery({
		queryKey: ["custom-domain", orgId, domainId],
		queryFn: async () => {
			return api.get<CustomDomain>(
				`/organizations/${orgId}/whitelabel/domains/${domainId}`
			);
		},
		enabled: !!orgId && !!domainId,
	});
}

export function useAddCustomDomain(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: CustomDomainInput) => {
			return api.post<CustomDomain>(
				`/organizations/${orgId}/whitelabel/domains`,
				data
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["custom-domains", orgId] });
		},
	});
}

export function useVerifyCustomDomain(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (domainId: string) => {
			return api.post<CustomDomain>(
				`/organizations/${orgId}/whitelabel/domains/${domainId}/verify`
			);
		},
		onSuccess: (_, domainId) => {
			queryClient.invalidateQueries({ queryKey: ["custom-domains", orgId] });
			queryClient.invalidateQueries({ queryKey: ["custom-domain", orgId, domainId] });
		},
	});
}

export function useRemoveCustomDomain(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (domainId: string) => {
			return api.delete(`/organizations/${orgId}/whitelabel/domains/${domainId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["custom-domains", orgId] });
		},
	});
}

export function useRefreshSSL(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (domainId: string) => {
			return api.post<CustomDomain>(
				`/organizations/${orgId}/whitelabel/domains/${domainId}/refresh-ssl`
			);
		},
		onSuccess: (_, domainId) => {
			queryClient.invalidateQueries({ queryKey: ["custom-domain", orgId, domainId] });
		},
	});
}

// Feature Flags
export function useFeatureFlags() {
	return useQuery({
		queryKey: ["feature-flags"],
		queryFn: async () => {
			const response = await api.get<{ items: FeatureFlag[] }>("/admin/feature-flags");
			return response.items;
		},
	});
}

export function useOrganizationFeatureFlags(orgId: string) {
	return useQuery({
		queryKey: ["org-feature-flags", orgId],
		queryFn: async () => {
			const response = await api.get<{ items: OrganizationFeatureFlag[] }>(
				`/organizations/${orgId}/whitelabel/feature-flags`
			);
			return response.items;
		},
		enabled: !!orgId,
	});
}

export function useToggleFeatureFlag(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ flagId, isEnabled }: { flagId: string; isEnabled: boolean }) => {
			return api.patch<OrganizationFeatureFlag>(
				`/organizations/${orgId}/whitelabel/feature-flags/${flagId}`,
				{ isEnabled }
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-feature-flags", orgId] });
		},
	});
}

// Branding
export function useBrandingConfig(orgId: string) {
	return useQuery({
		queryKey: ["branding", orgId],
		queryFn: async () => {
			return api.get<BrandingConfig>(
				`/organizations/${orgId}/whitelabel/branding`
			);
		},
		enabled: !!orgId,
	});
}

export function useUpdateBranding(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: BrandingConfigInput) => {
			return api.patch<BrandingConfig>(
				`/organizations/${orgId}/whitelabel/branding`,
				data
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["branding", orgId] });
		},
	});
}

export function useUploadBrandingAsset(orgId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ type, file }: { type: "logo" | "favicon"; file: File }) => {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("type", type);
			return api.postForm<{ url: string }>(
				`/organizations/${orgId}/whitelabel/branding/upload`,
				formData
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["branding", orgId] });
		},
	});
}

// CSS Preview
export function usePreviewBranding(orgId: string) {
	return useMutation({
		mutationFn: async (config: BrandingConfigInput) => {
			return api.post<{ css: string }>(
				`/organizations/${orgId}/whitelabel/branding/preview`,
				config
			);
		},
	});
}
