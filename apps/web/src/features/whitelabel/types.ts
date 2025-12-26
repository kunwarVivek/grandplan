// Email template types
export type EmailTemplateType =
	| "WELCOME"
	| "INVITATION"
	| "PASSWORD_RESET"
	| "EMAIL_VERIFICATION"
	| "SUBSCRIPTION_CREATED"
	| "SUBSCRIPTION_UPDATED"
	| "SUBSCRIPTION_CANCELLED"
	| "PAYMENT_FAILED"
	| "PAYMENT_SUCCESS"
	| "CUSTOM";

export type EmailTemplate = {
	id: string;
	organizationId: string;
	type: EmailTemplateType;
	name: string;
	subject: string;
	htmlContent: string;
	textContent: string | null;
	variables: string[];
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type EmailTemplateInput = {
	type: EmailTemplateType;
	name: string;
	subject: string;
	htmlContent: string;
	textContent?: string;
	variables?: string[];
	isActive?: boolean;
};

// Custom domain types
export type SSLStatus = "PENDING" | "ACTIVE" | "FAILED" | "EXPIRED";

export type CustomDomain = {
	id: string;
	organizationId: string;
	domain: string;
	isVerified: boolean;
	verificationToken: string;
	sslStatus: SSLStatus;
	sslExpiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type CustomDomainInput = {
	domain: string;
};

// Feature flag types
export type FeatureFlag = {
	id: string;
	key: string;
	name: string;
	description: string | null;
	defaultEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type OrganizationFeatureFlag = {
	id: string;
	organizationId: string;
	featureFlagId: string;
	featureFlag: FeatureFlag;
	isEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
};

// Theme/branding types
export type BrandingConfig = {
	id: string;
	organizationId: string;
	logoUrl: string | null;
	faviconUrl: string | null;
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	customCss: string | null;
	customJs: string | null;
	fontFamily: string | null;
	borderRadius: string;
	darkModeEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type BrandingConfigInput = {
	logoUrl?: string;
	faviconUrl?: string;
	primaryColor?: string;
	secondaryColor?: string;
	accentColor?: string;
	customCss?: string;
	customJs?: string;
	fontFamily?: string;
	borderRadius?: string;
	darkModeEnabled?: boolean;
};

// Filters
export type EmailTemplateFilters = {
	type?: EmailTemplateType;
	isActive?: boolean;
};
