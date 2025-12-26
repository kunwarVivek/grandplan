import { env } from "@grandplan/env/web";

const API_BASE_URL = env.VITE_SERVER_URL;

export class ApiError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public data?: unknown,
	) {
		super(`API Error: ${status} ${statusText}`);
		this.name = "ApiError";
	}
}

type RequestOptions = {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
};

async function request<T>(
	endpoint: string,
	options: RequestOptions = {},
): Promise<T> {
	const { method = "GET", body, headers = {}, signal } = options;

	const config: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		credentials: "include", // Include cookies for auth
		signal,
	};

	if (body) {
		config.body = JSON.stringify(body);
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

	if (!response.ok) {
		let errorData: unknown;
		try {
			errorData = await response.json();
		} catch {
			errorData = await response.text();
		}
		throw new ApiError(response.status, response.statusText, errorData);
	}

	// Handle 204 No Content
	if (response.status === 204) {
		return undefined as T;
	}

	return response.json();
}

export const api = {
	get: <T>(endpoint: string, signal?: AbortSignal) =>
		request<T>(endpoint, { method: "GET", signal }),

	post: <T>(endpoint: string, body?: unknown, signal?: AbortSignal) =>
		request<T>(endpoint, { method: "POST", body, signal }),

	patch: <T>(endpoint: string, body?: unknown, signal?: AbortSignal) =>
		request<T>(endpoint, { method: "PATCH", body, signal }),

	put: <T>(endpoint: string, body?: unknown, signal?: AbortSignal) =>
		request<T>(endpoint, { method: "PUT", body, signal }),

	delete: <T>(endpoint: string, signal?: AbortSignal) =>
		request<T>(endpoint, { method: "DELETE", signal }),

	postForm: async <T>(endpoint: string, formData: FormData, signal?: AbortSignal): Promise<T> => {
		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			method: "POST",
			body: formData,
			credentials: "include",
			signal,
		});
		if (!response.ok) {
			let errorData: unknown;
			try {
				errorData = await response.json();
			} catch {
				errorData = await response.text();
			}
			throw new ApiError(response.status, response.statusText, errorData);
		}
		return response.json();
	},
};

// Helper for handling API errors in React Query
export function handleApiError(error: unknown): string {
	if (error instanceof ApiError) {
		const data = error.data as { message?: string; error?: string };
		return data?.message || data?.error || error.statusText;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "An unexpected error occurred";
}
