// ============================================
// OAUTH MANAGER - Token encryption and refresh
// ============================================

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { integrationHub } from "./hub.js";
import type { IntegrationProvider, OAuthCredentials } from "./types.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class OAuthManager {
	private encryptionKey: Buffer | null = null;

	initialize(encryptionKey: string): void {
		// Key should be 32 bytes for AES-256
		this.encryptionKey = Buffer.from(encryptionKey, "hex");
		if (this.encryptionKey.length !== 32) {
			throw new Error("Encryption key must be 32 bytes (64 hex characters)");
		}
	}

	/**
	 * Encrypt credentials for storage
	 */
	encryptCredentials(credentials: OAuthCredentials): string {
		if (!this.encryptionKey) {
			throw new Error("OAuthManager not initialized");
		}

		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

		const plaintext = JSON.stringify(credentials);
		const encrypted = Buffer.concat([
			cipher.update(plaintext, "utf8"),
			cipher.final(),
		]);

		const authTag = cipher.getAuthTag();

		// Combine IV + authTag + encrypted data
		return Buffer.concat([iv, authTag, encrypted]).toString("base64");
	}

	/**
	 * Decrypt credentials from storage
	 */
	decryptCredentials(encryptedData: string): OAuthCredentials {
		if (!this.encryptionKey) {
			throw new Error("OAuthManager not initialized");
		}

		const buffer = Buffer.from(encryptedData, "base64");

		const iv = buffer.subarray(0, IV_LENGTH);
		const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
		const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

		const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([
			decipher.update(encrypted),
			decipher.final(),
		]);

		return JSON.parse(decrypted.toString("utf8"));
	}

	/**
	 * Check if credentials need refresh
	 */
	needsRefresh(credentials: OAuthCredentials): boolean {
		if (!credentials.expiresAt) {
			return false;
		}

		const expiresAt = new Date(credentials.expiresAt);
		const now = new Date();
		const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

		return expiresAt.getTime() - now.getTime() < bufferMs;
	}

	/**
	 * Get valid credentials, refreshing if necessary
	 */
	async getValidCredentials(
		connectionId: string,
		integrationId: IntegrationProvider,
		credentials: OAuthCredentials,
	): Promise<OAuthCredentials> {
		if (!this.needsRefresh(credentials)) {
			return credentials;
		}

		if (!credentials.refreshToken) {
			throw new Error("Token expired and no refresh token available");
		}

		// Use the integration hub to refresh
		return integrationHub.refreshCredentials(connectionId);
	}

	/**
	 * Generate a random state for OAuth flow
	 */
	generateState(): string {
		return randomBytes(32).toString("hex");
	}

	/**
	 * Create an OAuth callback URL
	 */
	createCallbackUrl(baseUrl: string, provider: IntegrationProvider): string {
		return `${baseUrl}/api/integrations/${provider}/callback`;
	}
}

// Singleton instance
export const oauthManager = new OAuthManager();
