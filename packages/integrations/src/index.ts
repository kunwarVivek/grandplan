// Integrations package - External integrations hub

export { SlackAdapter } from "./adapters/slack.js";
export { TeamsAdapter } from "./adapters/teams.js";
export { IntegrationHub, integrationHub } from "./hub.js";
export { OAuthManager, oauthManager } from "./oauth-manager.js";
export * from "./types.js";
export { WebhookHandler, webhookHandler } from "./webhook-handler.js";
