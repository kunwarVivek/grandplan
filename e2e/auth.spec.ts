import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("should load login page", async ({ page }) => {
		await expect(page).toHaveTitle(/GrandPlan/i);
		await expect(page.locator("text=Sign in")).toBeVisible();
	});

	test("should show validation errors for empty form", async ({ page }) => {
		await page.click("button:has-text('Sign in')");
		await expect(page.locator("text=email is required")).toBeVisible();
	});

	test("should navigate to signup", async ({ page }) => {
		await expect(page.locator("text=Don't have an account")).toBeVisible();
		await page.click("text=Sign up");
		await expect(page.locator("text=Create your account")).toBeVisible();
	});
});

test.describe("Dashboard", () => {
	test("should redirect unauthenticated users to login", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.url()).toContain("/login");
	});

	test("should load dashboard for authenticated users", async () => {
		test.skip(true, "Requires authentication setup");
	});
});

test.describe("Navigation", () => {
	test("should have working navigation links", async ({ page }) => {
		await expect(page.locator("nav")).toBeVisible();
	});
});
