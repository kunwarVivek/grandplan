import { useState } from "react";
import { Mail, Eye, Send, Save, Code, FileText } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { EmailTemplate, EmailTemplateType, EmailTemplateInput } from "../types";
import {
	useCreateEmailTemplate,
	useUpdateEmailTemplate,
	usePreviewEmailTemplate,
	useSendTestEmail,
} from "../hooks/use-whitelabel";

const TEMPLATE_TYPES: { value: EmailTemplateType; label: string }[] = [
	{ value: "WELCOME", label: "Welcome Email" },
	{ value: "INVITATION", label: "Team Invitation" },
	{ value: "PASSWORD_RESET", label: "Password Reset" },
	{ value: "EMAIL_VERIFICATION", label: "Email Verification" },
	{ value: "SUBSCRIPTION_CREATED", label: "Subscription Created" },
	{ value: "SUBSCRIPTION_UPDATED", label: "Subscription Updated" },
	{ value: "SUBSCRIPTION_CANCELLED", label: "Subscription Cancelled" },
	{ value: "PAYMENT_FAILED", label: "Payment Failed" },
	{ value: "PAYMENT_SUCCESS", label: "Payment Success" },
	{ value: "CUSTOM", label: "Custom Template" },
];

const DEFAULT_VARIABLES = [
	"{{user.name}}",
	"{{user.email}}",
	"{{organization.name}}",
	"{{action_url}}",
	"{{support_email}}",
];

type EmailTemplateEditorProps = {
	organizationId: string;
	template?: EmailTemplate;
	onSave?: () => void;
	className?: string;
};

export function EmailTemplateEditor({
	organizationId,
	template,
	onSave,
	className,
}: EmailTemplateEditorProps) {
	const [formData, setFormData] = useState<EmailTemplateInput>({
		type: template?.type ?? "CUSTOM",
		name: template?.name ?? "",
		subject: template?.subject ?? "",
		htmlContent: template?.htmlContent ?? "",
		textContent: template?.textContent ?? "",
		variables: template?.variables ?? [],
		isActive: template?.isActive ?? true,
	});
	const [previewHtml, setPreviewHtml] = useState<string>("");
	const [testEmail, setTestEmail] = useState("");
	const [showPreview, setShowPreview] = useState(false);

	const createMutation = useCreateEmailTemplate(organizationId);
	const updateMutation = useUpdateEmailTemplate(organizationId);
	const previewMutation = usePreviewEmailTemplate(organizationId);
	const sendTestMutation = useSendTestEmail(organizationId);

	const isEditing = !!template;
	const isSaving = createMutation.isPending || updateMutation.isPending;

	const handleSave = async () => {
		if (isEditing && template) {
			await updateMutation.mutateAsync({ id: template.id, data: formData });
		} else {
			await createMutation.mutateAsync(formData);
		}
		onSave?.();
	};

	const handlePreview = async () => {
		if (!template) return;
		const sampleVariables: Record<string, string> = {};
		formData.variables?.forEach((v) => {
			const key = v.replace(/[{}]/g, "");
			sampleVariables[key] = `[${key}]`;
		});
		const result = await previewMutation.mutateAsync({
			templateId: template.id,
			variables: sampleVariables,
		});
		setPreviewHtml(result.html);
		setShowPreview(true);
	};

	const handleSendTest = async () => {
		if (!template || !testEmail) return;
		await sendTestMutation.mutateAsync({ templateId: template.id, email: testEmail });
	};

	const insertVariable = (variable: string) => {
		setFormData((prev) => ({
			...prev,
			htmlContent: prev.htmlContent + variable,
		}));
	};

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Mail className="size-5" />
					{isEditing ? "Edit Email Template" : "Create Email Template"}
				</CardTitle>
				<CardDescription>
					Customize email templates for your organization
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>Template Type</Label>
						<Select
							value={formData.type}
							onValueChange={(value) =>
								value && setFormData((prev) => ({ ...prev, type: value as EmailTemplateType }))
							}
						>
							<SelectTrigger>
								<SelectValue>
									{TEMPLATE_TYPES.find((t) => t.value === formData.type)?.label ?? "Select type"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{TEMPLATE_TYPES.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Template Name</Label>
						<Input
							value={formData.name}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, name: e.target.value }))
							}
							placeholder="My Custom Template"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label>Subject Line</Label>
					<Input
						value={formData.subject}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, subject: e.target.value }))
						}
						placeholder="Welcome to {{organization.name}}!"
					/>
				</div>

				<div className="space-y-2">
					<Label>Available Variables</Label>
					<div className="flex flex-wrap gap-2">
						{DEFAULT_VARIABLES.map((variable) => (
							<Badge
								key={variable}
								variant="outline"
								className="cursor-pointer hover:bg-muted"
								onClick={() => insertVariable(variable)}
							>
								{variable}
							</Badge>
						))}
					</div>
				</div>

				<Tabs defaultValue="html">
					<TabsList>
						<TabsTrigger value="html" className="gap-2">
							<Code className="size-4" />
							HTML
						</TabsTrigger>
						<TabsTrigger value="text" className="gap-2">
							<FileText className="size-4" />
							Plain Text
						</TabsTrigger>
					</TabsList>
					<TabsContent value="html" className="mt-4">
						<Textarea
							value={formData.htmlContent}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, htmlContent: e.target.value }))
							}
							placeholder="<html>...</html>"
							className="font-mono min-h-[300px]"
						/>
					</TabsContent>
					<TabsContent value="text" className="mt-4">
						<Textarea
							value={formData.textContent ?? ""}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, textContent: e.target.value }))
							}
							placeholder="Plain text version of the email..."
							className="min-h-[300px]"
						/>
					</TabsContent>
				</Tabs>

				<div className="flex items-center justify-between pt-4 border-t">
					<div className="flex items-center gap-2">
						{isEditing && (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={handlePreview}
									disabled={previewMutation.isPending}
								>
									<Eye className="size-4 mr-2" />
									Preview
								</Button>
								<Dialog>
									<DialogTrigger render={<Button variant="outline" size="sm" />}>
										<Send className="size-4 mr-2" />
										Send Test
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Send Test Email</DialogTitle>
											<DialogDescription>
												Send a test email to verify your template
											</DialogDescription>
										</DialogHeader>
										<div className="space-y-4 py-4">
											<div className="space-y-2">
												<Label>Email Address</Label>
												<Input
													type="email"
													value={testEmail}
													onChange={(e) => setTestEmail(e.target.value)}
													placeholder="test@example.com"
												/>
											</div>
										</div>
										<DialogFooter>
											<Button
												onClick={handleSendTest}
												disabled={!testEmail || sendTestMutation.isPending}
											>
												{sendTestMutation.isPending ? "Sending..." : "Send Test"}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</>
						)}
					</div>
					<Button onClick={handleSave} disabled={isSaving}>
						<Save className="size-4 mr-2" />
						{isSaving ? "Saving..." : "Save Template"}
					</Button>
				</div>

				{/* Preview Dialog */}
				<Dialog open={showPreview} onOpenChange={setShowPreview}>
					<DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
						<DialogHeader>
							<DialogTitle>Email Preview</DialogTitle>
						</DialogHeader>
						<div
							className="border rounded-lg p-4 bg-white"
							dangerouslySetInnerHTML={{ __html: previewHtml }}
						/>
					</DialogContent>
				</Dialog>
			</CardContent>
		</Card>
	);
}
