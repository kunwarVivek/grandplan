type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function createLogger(baseContext: LogContext = {}): Logger {
  const minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
  const minLevelNum = LOG_LEVELS[minLevel] ?? 1;
  const isProd = process.env.NODE_ENV === "production";

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= minLevelNum;
  }

  function formatLog(level: LogLevel, message: string, context: LogContext = {}) {
    const timestamp = new Date().toISOString();
    const merged = { ...baseContext, ...context };

    if (isProd) {
      // JSON format for production (structured logging)
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...merged,
      });
    }

    // Human-readable for development
    const contextStr = Object.keys(merged).length > 0
      ? ` ${JSON.stringify(merged)}`
      : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  return {
    debug(message: string, context?: LogContext) {
      if (shouldLog("debug")) {
        console.debug(formatLog("debug", message, context));
      }
    },
    info(message: string, context?: LogContext) {
      if (shouldLog("info")) {
        console.info(formatLog("info", message, context));
      }
    },
    warn(message: string, context?: LogContext) {
      if (shouldLog("warn")) {
        console.warn(formatLog("warn", message, context));
      }
    },
    error(message: string, error?: Error, context?: LogContext) {
      if (shouldLog("error")) {
        const errorContext = error ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...context,
        } : context;
        console.error(formatLog("error", message, errorContext));
      }
    },
    child(context: LogContext): Logger {
      return createLogger({ ...baseContext, ...context });
    },
  };
}

export const logger = createLogger();
export { createLogger, type Logger, type LogContext, type LogLevel };
