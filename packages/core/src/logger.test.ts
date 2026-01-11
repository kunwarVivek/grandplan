import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger.js";

// Helper to get logged output from console spy
function getLoggedOutput(spy: ReturnType<typeof vi.spyOn>): string {
	const calls = spy.mock.calls;
	if (!calls[0]) throw new Error("No log output captured");
	return String(calls[0][0]);
}

describe("Logger", () => {
	let consoleSpy: {
		debug: ReturnType<typeof vi.spyOn>;
		info: ReturnType<typeof vi.spyOn>;
		warn: ReturnType<typeof vi.spyOn>;
		error: ReturnType<typeof vi.spyOn>;
	};

	beforeEach(() => {
		consoleSpy = {
			debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
			info: vi.spyOn(console, "info").mockImplementation(() => {}),
			warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
			error: vi.spyOn(console, "error").mockImplementation(() => {}),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("createLogger", () => {
		it("should create a logger instance", () => {
			const logger = createLogger();
			expect(logger).toBeDefined();
			expect(typeof logger.debug).toBe("function");
			expect(typeof logger.info).toBe("function");
			expect(typeof logger.warn).toBe("function");
			expect(typeof logger.error).toBe("function");
			expect(typeof logger.child).toBe("function");
		});

		it("should respect log level configuration", () => {
			const logger = createLogger({ level: "warn" });

			logger.debug("debug message");
			logger.info("info message");
			logger.warn("warn message");
			logger.error("error message");

			expect(consoleSpy.debug).not.toHaveBeenCalled();
			expect(consoleSpy.info).not.toHaveBeenCalled();
			expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
			expect(consoleSpy.error).toHaveBeenCalledTimes(1);
		});

		it("should log at debug level when configured", () => {
			const logger = createLogger({ level: "debug" });

			logger.debug("debug message");
			logger.info("info message");

			expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
			expect(consoleSpy.info).toHaveBeenCalledTimes(1);
		});
	});

	describe("log methods", () => {
		it("should log debug messages", () => {
			const logger = createLogger({ level: "debug" });
			logger.debug("test debug");
			expect(consoleSpy.debug).toHaveBeenCalled();
		});

		it("should log info messages", () => {
			const logger = createLogger();
			logger.info("test info");
			expect(consoleSpy.info).toHaveBeenCalled();
		});

		it("should log warn messages", () => {
			const logger = createLogger();
			logger.warn("test warn");
			expect(consoleSpy.warn).toHaveBeenCalled();
		});

		it("should log error messages", () => {
			const logger = createLogger();
			logger.error("test error");
			expect(consoleSpy.error).toHaveBeenCalled();
		});

		it("should include context in log output", () => {
			const logger = createLogger({ forceJson: true });
			logger.info("test message", { userId: "123", action: "login" });

			expect(consoleSpy.info).toHaveBeenCalled();
			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.message).toBe("test message");
			expect(parsed.userId).toBe("123");
			expect(parsed.action).toBe("login");
		});
	});

	describe("error logging", () => {
		it("should serialize error objects", () => {
			const logger = createLogger({ forceJson: true });
			const error = new Error("test error");

			logger.error("an error occurred", error);

			expect(consoleSpy.error).toHaveBeenCalled();
			const loggedOutput = getLoggedOutput(consoleSpy.error);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.error).toBeDefined();
			expect(parsed.error.name).toBe("Error");
			expect(parsed.error.message).toBe("test error");
			expect(parsed.error.stack).toBeDefined();
		});

		it("should handle error with additional context", () => {
			const logger = createLogger({ forceJson: true });
			const error = new Error("test error");

			logger.error("an error occurred", error, { requestId: "abc" });

			const loggedOutput = getLoggedOutput(consoleSpy.error);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.error).toBeDefined();
			expect(parsed.requestId).toBe("abc");
		});

		it("should handle error passed in context object (overloaded signature)", () => {
			const logger = createLogger({ forceJson: true });

			// This is the pattern used in event-bus.ts: logger.error("message", { error })
			logger.error("an error occurred", { customField: "value" });

			const loggedOutput = getLoggedOutput(consoleSpy.error);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.customField).toBe("value");
		});
	});

	describe("child logger", () => {
		it("should create a child logger with inherited context", () => {
			const logger = createLogger({
				forceJson: true,
				context: { service: "auth" }
			});

			const childLogger = logger.child({ requestId: "123" });
			childLogger.info("child log message");

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.service).toBe("auth");
			expect(parsed.requestId).toBe("123");
		});

		it("should allow context override in child logger", () => {
			const logger = createLogger({
				forceJson: true,
				context: { service: "auth" }
			});

			const childLogger = logger.child({ service: "billing" });
			childLogger.info("child log message");

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.service).toBe("billing");
		});
	});

	describe("sensitive field redaction", () => {
		it("should redact password fields", () => {
			const logger = createLogger({ forceJson: true });
			logger.info("user login", { username: "john", password: "secret123" });

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.username).toBe("john");
			expect(parsed.password).toBe("[REDACTED]");
		});

		it("should redact nested sensitive fields", () => {
			const logger = createLogger({ forceJson: true });
			logger.info("api call", {
				user: {
					name: "john",
					credentials: {
						apiKey: "key123",
						token: "tok456"
					}
				}
			});

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.user.name).toBe("john");
			expect(parsed.user.credentials.apiKey).toBe("[REDACTED]");
			expect(parsed.user.credentials.token).toBe("[REDACTED]");
		});

		it("should redact custom fields", () => {
			const logger = createLogger({
				forceJson: true,
				redactFields: ["customSecret"]
			});
			logger.info("test", { customSecret: "sensitive", normal: "ok" });

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.customSecret).toBe("[REDACTED]");
			expect(parsed.normal).toBe("ok");
		});
	});

	describe("level management", () => {
		it("should report current level", () => {
			const logger = createLogger({ level: "warn" });
			expect(logger.getLevel()).toBe("warn");
		});

		it("should check if level is enabled", () => {
			const logger = createLogger({ level: "warn" });

			expect(logger.isLevelEnabled("debug")).toBe(false);
			expect(logger.isLevelEnabled("info")).toBe(false);
			expect(logger.isLevelEnabled("warn")).toBe(true);
			expect(logger.isLevelEnabled("error")).toBe(true);
		});

		it("should allow dynamic level changes", () => {
			const logger = createLogger({ level: "error" });

			logger.info("should not log");
			expect(consoleSpy.info).not.toHaveBeenCalled();

			logger.setLevel("info");
			logger.info("should log now");
			expect(consoleSpy.info).toHaveBeenCalledTimes(1);
		});
	});

	describe("JSON output format", () => {
		it("should output valid JSON when forceJson is true", () => {
			const logger = createLogger({ forceJson: true });
			logger.info("test message", { key: "value" });

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			expect(() => JSON.parse(loggedOutput)).not.toThrow();
		});

		it("should include timestamp in JSON output", () => {
			const logger = createLogger({ forceJson: true });
			logger.info("test message");

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.timestamp).toBeDefined();
			expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
		});

		it("should include level in JSON output", () => {
			const logger = createLogger({ forceJson: true });
			logger.warn("test warning");

			const loggedOutput = getLoggedOutput(consoleSpy.warn);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.level).toBe("warn");
		});
	});

	describe("circular reference handling", () => {
		it("should handle circular references in context", () => {
			const logger = createLogger({ forceJson: true });

			const obj: Record<string, unknown> = { name: "test" };
			obj.self = obj; // Create circular reference

			expect(() => {
				logger.info("circular test", { data: obj });
			}).not.toThrow();

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.data.name).toBe("test");
			expect(parsed.data.self).toBe("[Circular]");
		});
	});

	describe("timestamp configuration", () => {
		it("should allow disabling timestamps", () => {
			const logger = createLogger({ forceJson: true, timestamp: false });
			logger.info("no timestamp");

			const loggedOutput = getLoggedOutput(consoleSpy.info);
			const parsed = JSON.parse(loggedOutput);

			expect(parsed.timestamp).toBe("");
		});
	});
});
