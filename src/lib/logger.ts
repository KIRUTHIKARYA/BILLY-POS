/**
 * Operational logger — wraps console.error/warn with structured output.
 * In production, swap the `output` functions with your preferred sink
 * (e.g. Axiom, Logtail, Sentry) without touching call sites.
 */

type LogLevel = "info" | "warn" | "error";

type LogEntry = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  emit({ level, message, context, timestamp: new Date().toISOString() });
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),

  /** Log an unexpected thrown error with full context */
  caught: (message: string, err: unknown, context?: Record<string, unknown>) => {
    const errContext: Record<string, unknown> = {
      ...context,
      error_message: err instanceof Error ? err.message : String(err),
      error_stack: err instanceof Error ? err.stack : undefined,
    };
    log("error", message, errContext);
  },
};
