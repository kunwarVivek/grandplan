import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, LoaderIcon, UploadIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type BrandingConfig,
	useOrganizationBySlug,
	useUpdateOrganizationBranding,
	useUploadFile,
} from "@/features/organizations/hooks/use-organizations";
import { handleApiError } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/branding")({
	component: OrgBranding,
});

// Common font families for branding
const FONT_FAMILIES = [
	{ value: "Inter", label: "Inter" },
	{ value: "Roboto", label: "Roboto" },
	{ value: "Open Sans", label: "Open Sans" },
	{ value: "Lato", label: "Lato" },
	{ value: "Poppins", label: "Poppins" },
	{ value: "Montserrat", label: "Montserrat" },
	{ value: "Source Sans Pro", label: "Source Sans Pro" },
	{ value: "Nunito", label: "Nunito" },
	{ value: "Raleway", label: "Raleway" },
	{ value: "Ubuntu", label: "Ubuntu" },
] as const;

// Image upload component
function ImageUpload({
	label,
	description,
	currentUrl,
	onUpload,
	onRemove,
	isUploading,
	accept = "image/*",
	recommendedSize,
	maxSize = "2MB",
	size = "large",
}: {
	label: string;
	description: string;
	currentUrl: string | null;
	onUpload: (file: File) => void;
	onRemove: () => void;
	isUploading: boolean;
	accept?: string;
	recommendedSize: string;
	maxSize?: string;
	size?: "small" | "large";
}) {
	const containerSize = size === "small" ? "size-12" : "size-24";
	const iconSize = size === "small" ? "size-5" : "size-8";

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			onUpload(file);
		}
		// Reset input value so the same file can be selected again
		e.target.value = "";
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{label}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-6">
					<div
						className={`relative flex ${containerSize} items-center justify-center rounded-lg border border-muted-foreground/25 border-dashed bg-muted/50 overflow-hidden`}
					>
						{currentUrl ? (
							<>
								<img
									src={currentUrl}
									alt={label}
									className="size-full object-contain"
								/>
								<button
									type="button"
									onClick={onRemove}
									className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
									aria-label={`Remove ${label.toLowerCase()}`}
								>
									<XIcon className="size-3" />
								</button>
							</>
						) : isUploading ? (
							<LoaderIcon
								className={`${iconSize} animate-spin text-muted-foreground`}
							/>
						) : (
							<ImageIcon className={`${iconSize} text-muted-foreground`} />
						)}
					</div>
					<div className="space-y-2">
						<div className="relative">
							<Button
								variant="outline"
								disabled={isUploading}
								render={<label className="cursor-pointer" />}
							>
								{isUploading ? (
									<>
										<LoaderIcon className="size-4 animate-spin" />
										Uploading...
									</>
								) : (
									<>
										<UploadIcon className="size-4" />
										Upload {label}
									</>
								)}
								<input
									type="file"
									accept={accept}
									className="sr-only"
									onChange={handleFileChange}
									disabled={isUploading}
								/>
							</Button>
						</div>
						<p className="text-muted-foreground text-xs">
							Recommended size: {recommendedSize}. Max {maxSize}.
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Color input component
function ColorInput({
	id,
	label,
	value,
	onChange,
	placeholder,
	disabled,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	disabled?: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<div className="flex gap-2">
				<Input
					id={id}
					type="color"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="size-10 cursor-pointer p-1"
					disabled={disabled}
				/>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="flex-1"
					disabled={disabled}
				/>
			</div>
		</div>
	);
}

function OrgBranding() {
	const { orgSlug } = Route.useParams();

	// Fetch organization data
	const { data: organization, isLoading: isLoadingOrg } =
		useOrganizationBySlug(orgSlug);

	// Branding state
	const [primaryColor, setPrimaryColor] = useState("#3b82f6");
	const [secondaryColor, setSecondaryColor] = useState("#64748b");
	const [accentColor, setAccentColor] = useState("#8b5cf6");
	const [fontFamily, setFontFamily] = useState("Inter");
	const [logoUrl, setLogoUrl] = useState<string | null>(null);
	const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
	const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

	// Mutations
	const uploadMutation = useUploadFile();
	const brandingMutation = useUpdateOrganizationBranding();

	// Initialize form from organization data
	useEffect(() => {
		if (organization) {
			const branding = (organization as { brandingConfig?: BrandingConfig })
				.brandingConfig;
			if (branding) {
				setPrimaryColor(branding.primaryColor ?? "#3b82f6");
				setSecondaryColor(branding.secondaryColor ?? "#64748b");
				setAccentColor(branding.accentColor ?? "#8b5cf6");
				setFontFamily(branding.fontFamily ?? "Inter");
				setLogoUrl(branding.logo ?? null);
				setLogoDarkUrl(branding.logoDark ?? null);
				setFaviconUrl(branding.favicon ?? null);
			}
		}
	}, [organization]);

	// Upload handlers
	async function handleLogoUpload(file: File) {
		uploadMutation.mutate(
			{ file, type: "logo" },
			{
				onSuccess: (data) => {
					setLogoUrl(data.url);
					toast.success("Logo uploaded successfully");
				},
				onError: (error) => {
					toast.error(handleApiError(error));
				},
			},
		);
	}

	async function handleLogoDarkUpload(file: File) {
		uploadMutation.mutate(
			{ file, type: "logo" },
			{
				onSuccess: (data) => {
					setLogoDarkUrl(data.url);
					toast.success("Dark mode logo uploaded successfully");
				},
				onError: (error) => {
					toast.error(handleApiError(error));
				},
			},
		);
	}

	async function handleFaviconUpload(file: File) {
		uploadMutation.mutate(
			{ file, type: "favicon" },
			{
				onSuccess: (data) => {
					setFaviconUrl(data.url);
					toast.success("Favicon uploaded successfully");
				},
				onError: (error) => {
					toast.error(handleApiError(error));
				},
			},
		);
	}

	async function handleSave() {
		if (!organization) {
			toast.error("Organization not found");
			return;
		}

		const branding: BrandingConfig = {
			primaryColor,
			secondaryColor,
			accentColor,
			fontFamily,
			logo: logoUrl ?? undefined,
			logoDark: logoDarkUrl ?? undefined,
			favicon: faviconUrl ?? undefined,
		};

		brandingMutation.mutate(
			{
				organizationId: organization.id,
				branding,
			},
			{
				onSuccess: () => {
					toast.success("Branding settings saved successfully");
				},
				onError: (error) => {
					toast.error(handleApiError(error));
				},
			},
		);
	}

	const isSubmitting = brandingMutation.isPending;
	const isUploading = uploadMutation.isPending;

	if (isLoadingOrg) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoaderIcon className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Logo Upload */}
			<ImageUpload
				label="Logo"
				description="Upload your organization's logo for light mode. Recommended size: 200x50px."
				currentUrl={logoUrl}
				onUpload={handleLogoUpload}
				onRemove={() => setLogoUrl(null)}
				isUploading={isUploading}
				recommendedSize="200x50px"
				maxSize="2MB"
				accept="image/png,image/jpeg,image/svg+xml"
			/>

			{/* Dark Mode Logo Upload */}
			<ImageUpload
				label="Logo (Dark Mode)"
				description="Upload an alternative logo for dark mode. Optional."
				currentUrl={logoDarkUrl}
				onUpload={handleLogoDarkUpload}
				onRemove={() => setLogoDarkUrl(null)}
				isUploading={isUploading}
				recommendedSize="200x50px"
				maxSize="2MB"
				accept="image/png,image/jpeg,image/svg+xml"
			/>

			{/* Favicon Upload */}
			<ImageUpload
				label="Favicon"
				description="Upload a favicon for your organization. Recommended size: 32x32px."
				currentUrl={faviconUrl}
				onUpload={handleFaviconUpload}
				onRemove={() => setFaviconUrl(null)}
				isUploading={isUploading}
				recommendedSize="32x32px"
				maxSize="500KB"
				accept="image/png,image/x-icon,image/svg+xml"
				size="small"
			/>

			{/* Brand Colors */}
			<Card>
				<CardHeader>
					<CardTitle>Brand Colors</CardTitle>
					<CardDescription>
						Customize your organization's color scheme. These colors will be
						applied across the interface.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-3">
						<ColorInput
							id="primary-color"
							label="Primary Color"
							value={primaryColor}
							onChange={setPrimaryColor}
							placeholder="#3b82f6"
							disabled={isSubmitting}
						/>
						<ColorInput
							id="secondary-color"
							label="Secondary Color"
							value={secondaryColor}
							onChange={setSecondaryColor}
							placeholder="#64748b"
							disabled={isSubmitting}
						/>
						<ColorInput
							id="accent-color"
							label="Accent Color"
							value={accentColor}
							onChange={setAccentColor}
							placeholder="#8b5cf6"
							disabled={isSubmitting}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Typography */}
			<Card>
				<CardHeader>
					<CardTitle>Typography</CardTitle>
					<CardDescription>
						Choose a font family for your organization's interface.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="max-w-xs space-y-2">
						<Label htmlFor="font-family">Font Family</Label>
						<Select
							value={fontFamily}
							onValueChange={(value) => value && setFontFamily(value)}
							disabled={isSubmitting}
						>
							<SelectTrigger>
								<SelectValue>
									{FONT_FAMILIES.find((f) => f.value === fontFamily)?.label ??
										fontFamily}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{FONT_FAMILIES.map((font) => (
									<SelectItem
										key={font.value}
										value={font.value}
										style={{ fontFamily: font.value }}
									>
										{font.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Preview */}
			<Card>
				<CardHeader>
					<CardTitle>Preview</CardTitle>
					<CardDescription>
						See how your branding will look across the interface.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border p-6" style={{ fontFamily }}>
						<div className="mb-4 flex items-center gap-3">
							{logoUrl ? (
								<img
									src={logoUrl}
									alt="Logo preview"
									className="h-8 max-w-[120px] object-contain"
								/>
							) : (
								<div
									className="size-8 rounded"
									style={{ backgroundColor: primaryColor }}
								/>
							)}
							<span className="font-semibold">
								{organization?.name ?? "Your Organization"}
							</span>
						</div>
						<div className="space-y-3">
							<div className="flex gap-2">
								<div
									className="flex h-9 items-center justify-center rounded px-4 text-sm font-medium text-white"
									style={{ backgroundColor: primaryColor }}
								>
									Primary Button
								</div>
								<div
									className="flex h-9 items-center justify-center rounded px-4 text-sm font-medium text-white"
									style={{ backgroundColor: secondaryColor }}
								>
									Secondary Button
								</div>
								<div
									className="flex h-9 items-center justify-center rounded px-4 text-sm font-medium text-white"
									style={{ backgroundColor: accentColor }}
								>
									Accent Button
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="size-4 rounded-full"
									style={{ backgroundColor: primaryColor }}
								/>
								<span style={{ color: primaryColor }}>Primary text color</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="size-4 rounded-full"
									style={{ backgroundColor: accentColor }}
								/>
								<span style={{ color: accentColor }}>Accent text color</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button
					onClick={handleSave}
					disabled={isSubmitting || isUploading}
					size="lg"
				>
					{isSubmitting ? (
						<>
							<LoaderIcon className="size-4 animate-spin" />
							Saving...
						</>
					) : (
						"Save Branding Settings"
					)}
				</Button>
			</div>
		</div>
	);
}
