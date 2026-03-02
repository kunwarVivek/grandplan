import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlackAdapter } from "../adapters/slack.js";

describe("SlackAdapter", () => {
	let adapter: SlackAdapter;

	beforeEach(() => {
		adapter = new SlackAdapter({
			clientId: "test-client-id",
			clientSecret: "test-client-secret",
			signingSecret: "test-signing-secret",
			redirectUri: "http://localhost:3000/callback",
		});
	});

	describe("getAuthorizationUrl", () => {
		it("should generate correct authorization URL", () => {
			const url = adapter.getAuthorizationUrl("test-state");
			expect(url).toContain("slack.com/oauth/v2/authorize");
			expect(url).toContain("client_id=test-client-id");
			expect(url).toContain("state=test-state");
		});

		it("should include custom scopes when provided", () => {
			const url = adapter.getAuthorizationUrl("state", [
				"chat:write",
				"users:read",
			]);
			expect(url).toContain("scope=");
		});
	});

	describe("provider", () => {
		it("should have correct provider name", () => {
			expect(adapter.provider).toBe("slack");
		});
	});
});
