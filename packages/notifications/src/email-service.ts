// ============================================
// EMAIL SERVICE - SendGrid integration
// ============================================

import { db, type EmailTemplateType } from "@grandplan/db";
import { env } from "@grandplan/env/server";
import sgMail from "@sendgrid/mail";
import Handlebars from "handlebars";
import type { EmailPayload } from "./types.js";

// Default email templates
const DEFAULT_TEMPLATES: Record<string, string> = {
	task_assigned: `
    <h2>You've been assigned a task</h2>
    <p>Hi {{userName}},</p>
    <p><strong>{{assignerName}}</strong> assigned you to the task "<strong>{{taskTitle}}</strong>".</p>
    <p><a href="{{actionUrl}}">View Task</a></p>
  `,
	task_mentioned: `
    <h2>You were mentioned</h2>
    <p>Hi {{userName}},</p>
    <p><strong>{{mentionerName}}</strong> mentioned you in a comment on "<strong>{{taskTitle}}</strong>".</p>
    <blockquote>{{preview}}</blockquote>
    <p><a href="{{actionUrl}}">View Comment</a></p>
  `,
	organization_invited: `
    <h2>You're invited to join {{organizationName}}</h2>
    <p>Hi,</p>
    <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong> on GrandPlan.</p>
    <p><a href="{{actionUrl}}">Accept Invitation</a></p>
    <p>This invitation expires in 7 days.</p>
  `,
	digest: `
    <h2>Your {{frequency}} summary</h2>
    <p>Hi {{userName}},</p>
    <h3>Task Updates</h3>
    <ul>
      {{#each taskUpdates}}
      <li>{{this.title}} - {{this.status}}</li>
      {{/each}}
    </ul>
    <p><a href="{{dashboardUrl}}">View Dashboard</a></p>
  `,
};

export class EmailService {
	private initialized = false;
	private compiledTemplates: Map<string, Handlebars.TemplateDelegate> =
		new Map();

	initialize(apiKey: string): void {
		sgMail.setApiKey(apiKey);
		this.initialized = true;

		// Pre-compile default templates
		for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
			this.compiledTemplates.set(key, Handlebars.compile(template));
		}
	}

	async send(payload: EmailPayload): Promise<void> {
		if (!this.initialized) {
			console.warn("EmailService not initialized, skipping email send");
			return;
		}

		const html = await this.renderTemplate(
			payload.templateId,
			payload.data,
			payload.organizationBranding,
		);

		await sgMail.send({
			to: payload.to,
			from: {
				email: env.EMAIL_FROM,
				name: payload.organizationBranding?.companyName ?? "GrandPlan",
			},
			subject: payload.subject,
			html,
		});
	}

	async sendBatch(payloads: EmailPayload[]): Promise<void> {
		if (!this.initialized) {
			console.warn("EmailService not initialized, skipping batch send");
			return;
		}

		const messages = await Promise.all(
			payloads.map(async (payload) => ({
				to: payload.to,
				from: {
					email: env.EMAIL_FROM,
					name: payload.organizationBranding?.companyName ?? "GrandPlan",
				},
				subject: payload.subject,
				html: await this.renderTemplate(
					payload.templateId,
					payload.data,
					payload.organizationBranding,
				),
			})),
		);

		await sgMail.send(messages);
	}

	private async renderTemplate(
		templateId: string,
		data: Record<string, unknown>,
		branding?: { logo?: string; primaryColor?: string; companyName?: string },
	): Promise<string> {
		// Try to get custom template from database
		const customTemplate = await db.emailTemplate.findFirst({
			where: { templateType: templateId as EmailTemplateType },
		});

		let template: Handlebars.TemplateDelegate;

		if (customTemplate) {
			template = Handlebars.compile(customTemplate.bodyHtml);
		} else if (this.compiledTemplates.has(templateId)) {
			template = this.compiledTemplates.get(templateId)!;
		} else {
			template = Handlebars.compile("<p>{{message}}</p>");
		}

		const html = template({ ...data, branding });

		// Wrap in base template with branding
		return this.wrapInBaseTemplate(html, branding);
	}

	private wrapInBaseTemplate(
		content: string,
		branding?: { logo?: string; primaryColor?: string; companyName?: string },
	): string {
		const primaryColor = branding?.primaryColor ?? "#6366f1";
		const logo = branding?.logo ?? "";
		const companyName = branding?.companyName ?? "GrandPlan";

		return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid ${primaryColor}; }
    .content { padding: 30px 0; }
    .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    a { color: ${primaryColor}; }
    h2 { color: ${primaryColor}; }
    blockquote { border-left: 3px solid ${primaryColor}; padding-left: 15px; margin-left: 0; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logo ? `<img src="${logo}" alt="${companyName}" height="40">` : `<h1>${companyName}</h1>`}
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
	}
}

// Singleton instance
export const emailService = new EmailService();
