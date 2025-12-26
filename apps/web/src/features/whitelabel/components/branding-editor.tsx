import { useState, useEffect } from "react";
import {
	Palette,
	Upload,
	Save,
	Eye,
	Moon,
	Sun,
	Type,
	Square,
	Code,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { BrandingConfigInput } from "../types";
import {
	useBrandingConfig,
	useUpdateBranding,
	useUploadBrandingAsset,
	usePreviewBranding,
} from "../hooks/use-whitelabel";

const FONT_OPTIONS = [
	{ value: "Inter", label: "Inter" },
	{ value: "Roboto", label: "Roboto" },
	{ value: "Open Sans", label: "Open Sans" },
	{ value: "Lato", label: "Lato" },
	{ value: "Poppins", label: "Poppins" },
	{ value: "Montserrat", label: "Montserrat" },
];

const BORDER_RADIUS_OPTIONS = [
	{ value: "0", label: "None" },
	{ value: "0.25rem", label: "Small" },
	{ value: "0.5rem", label: "Medium" },
	{ value: "0.75rem", label: "Large" },
	{ value: "1rem", label: "Extra Large" },
];

type BrandingEditorProps = {
	organizationId: string;
	className?: string;
};

export function BrandingEditor({ organizationId, className }: BrandingEditorProps) {
	const { data: branding, isLoading } = useBrandingConfig(organizationId);
	const updateMutation = useUpdateBranding(organizationId);
	const uploadMutation = useUploadBrandingAsset(organizationId);
	const previewMutation = usePreviewBranding(organizationId);

	const [formData, setFormData] = useState<BrandingConfigInput>({});

	useEffect(() => {
		if (branding) {
			setFormData({
				logoUrl: branding.logoUrl ?? undefined,
				faviconUrl: branding.faviconUrl ?? undefined,
				primaryColor: branding.primaryColor,
				secondaryColor: branding.secondaryColor,
				accentColor: branding.accentColor,
				customCss: branding.customCss ?? undefined,
				customJs: branding.customJs ?? undefined,
				fontFamily: branding.fontFamily ?? undefined,
				borderRadius: branding.borderRadius,
				darkModeEnabled: branding.darkModeEnabled,
			});
		}
	}, [branding]);

	const handleSave = async () => {
		await updateMutation.mutateAsync(formData);
	};

	const handlePreview = async () => {
		await previewMutation.mutateAsync(formData);
	};

	const handleFileUpload = async (
		type: "logo" | "favicon",
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const result = await uploadMutation.mutateAsync({ type, file });
		setFormData((prev) => ({
			...prev,
			[type === "logo" ? "logoUrl" : "faviconUrl"]: result.url,
		}));
	};

	if (isLoading) {
		return <BrandingEditorSkeleton className={className} />;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Palette className="size-5" />
					Branding & Theme
				</CardTitle>
				<CardDescription>
					Customize your organization's look and feel
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="colors">
					<TabsList className="mb-6">
						<TabsTrigger value="colors" className="gap-2">
							<Palette className="size-4" />
							Colors
						</TabsTrigger>
						<TabsTrigger value="assets" className="gap-2">
							<Upload className="size-4" />
							Assets
						</TabsTrigger>
						<TabsTrigger value="typography" className="gap-2">
							<Type className="size-4" />
							Typography
						</TabsTrigger>
						<TabsTrigger value="advanced" className="gap-2">
							<Code className="size-4" />
							Advanced
						</TabsTrigger>
					</TabsList>

					<TabsContent value="colors" className="space-y-6">
						<div className="grid grid-cols-3 gap-4">
							<ColorPicker
								label="Primary Color"
								value={formData.primaryColor ?? "#000000"}
								onChange={(value) =>
									setFormData((prev) => ({ ...prev, primaryColor: value }))
								}
							/>
							<ColorPicker
								label="Secondary Color"
								value={formData.secondaryColor ?? "#666666"}
								onChange={(value) =>
									setFormData((prev) => ({ ...prev, secondaryColor: value }))
								}
							/>
							<ColorPicker
								label="Accent Color"
								value={formData.accentColor ?? "#0066ff"}
								onChange={(value) =>
									setFormData((prev) => ({ ...prev, accentColor: value }))
								}
							/>
						</div>

						<div className="flex items-center justify-between p-4 border rounded-lg">
							<div className="flex items-center gap-3">
								{formData.darkModeEnabled ? (
									<Moon className="size-5" />
								) : (
									<Sun className="size-5" />
								)}
								<div>
									<p className="font-medium">Dark Mode</p>
									<p className="text-sm text-muted-foreground">
										Enable dark mode for users
									</p>
								</div>
							</div>
							<Switch
								checked={formData.darkModeEnabled ?? false}
								onCheckedChange={(checked) =>
									setFormData((prev) => ({ ...prev, darkModeEnabled: checked }))
								}
							/>
						</div>
					</TabsContent>

					<TabsContent value="assets" className="space-y-6">
						<div className="grid grid-cols-2 gap-6">
							<div className="space-y-4">
								<Label>Logo</Label>
								<div className="border-2 border-dashed rounded-lg p-6 text-center">
									{formData.logoUrl ? (
										<img
											src={formData.logoUrl}
											alt="Logo"
											className="max-h-16 mx-auto mb-4"
										/>
									) : (
										<Upload className="size-8 mx-auto mb-4 text-muted-foreground" />
									)}
									<Input
										type="file"
										accept="image/*"
										onChange={(e) => handleFileUpload("logo", e)}
										className="hidden"
										id="logo-upload"
									/>
									<Label
										htmlFor="logo-upload"
										className="cursor-pointer text-sm text-primary hover:underline"
									>
										Upload Logo
									</Label>
									<p className="text-xs text-muted-foreground mt-2">
										PNG, SVG, or JPG (max 2MB)
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<Label>Favicon</Label>
								<div className="border-2 border-dashed rounded-lg p-6 text-center">
									{formData.faviconUrl ? (
										<img
											src={formData.faviconUrl}
											alt="Favicon"
											className="size-8 mx-auto mb-4"
										/>
									) : (
										<Square className="size-8 mx-auto mb-4 text-muted-foreground" />
									)}
									<Input
										type="file"
										accept="image/*"
										onChange={(e) => handleFileUpload("favicon", e)}
										className="hidden"
										id="favicon-upload"
									/>
									<Label
										htmlFor="favicon-upload"
										className="cursor-pointer text-sm text-primary hover:underline"
									>
										Upload Favicon
									</Label>
									<p className="text-xs text-muted-foreground mt-2">
										ICO, PNG (32x32 recommended)
									</p>
								</div>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="typography" className="space-y-6">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Font Family</Label>
								<Select
									value={formData.fontFamily ?? "Inter"}
									onValueChange={(value) =>
										value && setFormData((prev) => ({ ...prev, fontFamily: value }))
									}
								>
									<SelectTrigger>
										<SelectValue>
											{FONT_OPTIONS.find((f) => f.value === formData.fontFamily)?.label ?? "Inter"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{FONT_OPTIONS.map((font) => (
											<SelectItem key={font.value} value={font.value}>
												{font.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Border Radius</Label>
								<Select
									value={formData.borderRadius ?? "0.5rem"}
									onValueChange={(value) =>
										value && setFormData((prev) => ({ ...prev, borderRadius: value }))
									}
								>
									<SelectTrigger>
										<SelectValue>
											{BORDER_RADIUS_OPTIONS.find((r) => r.value === formData.borderRadius)?.label ?? "Medium"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{BORDER_RADIUS_OPTIONS.map((radius) => (
											<SelectItem key={radius.value} value={radius.value}>
												{radius.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="p-4 border rounded-lg">
							<p className="text-sm font-medium mb-2">Preview</p>
							<div
								className="p-4 bg-muted rounded"
								style={{
									fontFamily: formData.fontFamily ?? "Inter",
									borderRadius: formData.borderRadius ?? "0.5rem",
								}}
							>
								<p>The quick brown fox jumps over the lazy dog.</p>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="advanced" className="space-y-6">
						<div className="space-y-2">
							<Label>Custom CSS</Label>
							<Textarea
								value={formData.customCss ?? ""}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, customCss: e.target.value }))
								}
								placeholder=":root { --custom-color: #fff; }"
								className="font-mono min-h-[200px]"
							/>
							<p className="text-xs text-muted-foreground">
								Add custom CSS to override default styles
							</p>
						</div>

						<div className="space-y-2">
							<Label>Custom JavaScript</Label>
							<Textarea
								value={formData.customJs ?? ""}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, customJs: e.target.value }))
								}
								placeholder="console.log('Custom script loaded');"
								className="font-mono min-h-[150px]"
							/>
							<p className="text-xs text-muted-foreground">
								Add custom JavaScript (use with caution)
							</p>
						</div>
					</TabsContent>
				</Tabs>

				<div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t">
					<Button
						variant="outline"
						onClick={handlePreview}
						disabled={previewMutation.isPending}
					>
						<Eye className="size-4 mr-2" />
						Preview
					</Button>
					<Button onClick={handleSave} disabled={updateMutation.isPending}>
						<Save className="size-4 mr-2" />
						{updateMutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

type ColorPickerProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
};

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			<div className="flex items-center gap-2">
				<div
					className="size-10 rounded border cursor-pointer"
					style={{ backgroundColor: value }}
				>
					<Input
						type="color"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="opacity-0 size-full cursor-pointer"
					/>
				</div>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="font-mono uppercase"
					maxLength={7}
				/>
			</div>
		</div>
	);
}

function BrandingEditorSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-60" />
			</CardHeader>
			<CardContent>
				<div className="flex gap-2 mb-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-8 w-24" />
					))}
				</div>
				<Skeleton className="h-64 w-full" />
			</CardContent>
		</Card>
	);
}
