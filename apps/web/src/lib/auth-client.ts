import { env } from "@grandplan/env/web";
import { polarClient } from "@polar-sh/better-auth";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	plugins: [
		twoFactorClient({
			onTwoFactorRedirect() {
				window.location.href = "/";
			},
		}),
		polarClient(),
	],
});
