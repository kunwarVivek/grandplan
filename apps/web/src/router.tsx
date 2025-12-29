import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import Loader from "./components/loader";
import type { authClient } from "./lib/auth-client";
import "./index.css";
import { routeTree } from "./routeTree.gen";

// Type for the session returned by authClient.getSession()
export type Session = Awaited<ReturnType<typeof authClient.getSession>>["data"];

// Router context type - session is provided by _authenticated layout
export type RouterAppContext = {
	// Session will be provided by authenticated routes
};

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: {} satisfies RouterAppContext,
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: () => <div>Not Found</div>,
		Wrap: ({ children }) => <>{children}</>,
	});
	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
