import { expect, test } from "@playwright/test";

test.describe("API Health Checks", () => {
	test("server should be healthy", async ({ request }) => {
		const response = await request.get("http://localhost:3000/health");
		expect(response.ok()).toBeTruthy();
	});

	test("server readiness check", async ({ request }) => {
		const response = await request.get("http://localhost:3000/ready");
		expect(response.ok()).toBeTruthy();
	});
});

test.describe("API Endpoints", () => {
	test("should reject unauthenticated requests", async ({ request }) => {
		const response = await request.get(
			"http://localhost:3000/api/v1/workspaces",
		);
		expect(response.status()).toBe(401);
	});

	test("should reject invalid auth token", async ({ request }) => {
		const response = await request.get(
			"http://localhost:3000/api/v1/workspaces",
			{
				headers: {
					Authorization: "Bearer invalid-token",
				},
			},
		);
		expect(response.status()).toBe(401);
	});
});
