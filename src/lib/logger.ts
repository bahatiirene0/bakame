/**
 * Production-ready structured logging system for bakame-ai
 *
 * Features:
 * - Structured JSON logging in production for log aggregation services
 * - Pretty-printed colored logs in development for readability
 * - Context propagation through child loggers (requestId, userId, etc.)
 * - Configurable log levels with environment-based filtering
 * - TypeScript type safety for log metadata
 * - Zero dependencies (uses Node.js built-in console)
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Available log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Context that can be attached to log entries
 * Use this for structured metadata like userId, requestId, etc.
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Complete log entry structure
 */
export interface LogEntry {
  timestamp: string;      // ISO 8601 format
  level: LogLevel;        // Log severity level
  message: string;        // Human-readable message
  context?: LogContext;   // Optional structured metadata
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  minLevel: LogLevel;     // Minimum level to log
  isDevelopment: boolean; // Enable pretty printing
  baseContext?: LogContext; // Context to include in all logs
}

// ============================================================================
// Constants & Configuration
// ============================================================================

/**
 * Log level priorities for filtering
 * Higher number = higher priority
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ANSI color codes for terminal output
 * Used in development mode for better readability
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Log level colors
  debug: '\x1b[36m',    // Cyan
  info: '\x1b[32m',     // Green
  warn: '\x1b[33m',     // Yellow
  error: '\x1b[31m',    // Red

  // Component colors
  timestamp: '\x1b[90m', // Gray
  key: '\x1b[35m',       // Magenta
  value: '\x1b[37m',     // White
};

/**
 * Environment-based default configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  isDevelopment: process.env.NODE_ENV !== 'production',
  minLevel: process.env.NODE_ENV === 'production'
    ? (process.env.DEBUG ? 'debug' : 'info')
    : 'debug',
  baseContext: undefined,
};

// ============================================================================
// Core Logger Implementation
// ============================================================================

/**
 * Logger class with support for structured logging and context propagation
 */
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a log level should be emitted based on configuration
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Format a log entry for development (pretty-printed with colors)
   */
  private formatDevelopment(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry;

    // Format timestamp - extract time portion manually for consistent formatting
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    const time = `${hours}:${minutes}:${seconds}.${ms}`;

    // Build the log string with colors
    let output = '';

    // Timestamp
    output += `${COLORS.timestamp}${time}${COLORS.reset} `;

    // Level with color and padding
    const levelColor = COLORS[level];
    const levelText = level.toUpperCase().padEnd(5);
    output += `${levelColor}${COLORS.bright}${levelText}${COLORS.reset} `;

    // Message
    output += `${message}`;

    // Context (if any)
    if (context && Object.keys(context).length > 0) {
      output += `\n${COLORS.dim}`;

      for (const [key, value] of Object.entries(context)) {
        const formattedValue = typeof value === 'object'
          ? JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')
          : String(value);

        output += `  ${COLORS.key}${key}${COLORS.reset}${COLORS.dim}=${COLORS.value}${formattedValue}${COLORS.dim}\n`;
      }

      output += COLORS.reset;
    }

    return output;
  }

  /**
   * Format a log entry for production (JSON string)
   */
  private formatProduction(entry: LogEntry): string {
    // Serialize to JSON for log aggregation services (Datadog, CloudWatch, etc.)
    return JSON.stringify(entry);
  }

  /**
   * Write a log entry to the appropriate output stream
   */
  private write(entry: LogEntry): void {
    const output = this.config.isDevelopment
      ? this.formatDevelopment(entry)
      : this.formatProduction(entry);

    // Use appropriate console method based on level
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
      case 'info':
      default:
        console.log(output);
        break;
    }
  }

  /**
   * Create a log entry with the current timestamp and base context
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    // Merge base context with provided context
    if (this.config.baseContext || context) {
      entry.context = {
        ...this.config.baseContext,
        ...context,
      };
    }

    return entry;
  }

  /**
   * Log a debug message
   * Use for detailed diagnostic information useful during development
   * Silent in production unless DEBUG env variable is set
   */
  public debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    this.write(this.createEntry('debug', message, context));
  }

  /**
   * Log an info message
   * Use for general informational messages about application flow
   */
  public info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    this.write(this.createEntry('info', message, context));
  }

  /**
   * Log a warning message
   * Use for potentially harmful situations that don't prevent operation
   */
  public warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    this.write(this.createEntry('warn', message, context));
  }

  /**
   * Log an error message
   * Use for error events that might still allow the application to continue
   */
  public error(message: string, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    this.write(this.createEntry('error', message, context));
  }

  /**
   * Create a child logger with additional context
   *
   * Child loggers inherit the parent's configuration and context,
   * and add their own context on top. This is useful for request-scoped
   * logging where you want to attach requestId, userId, etc. to all logs.
   *
   * @example
   * ```typescript
   * const reqLogger = logger.withContext({
   *   requestId: 'abc-123',
   *   userId: 'user-456'
   * });
   *
   * reqLogger.info('Processing request');
   * // Output includes requestId and userId automatically
   * ```
   */
  public withContext(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.config,
      baseContext: {
        ...this.config.baseContext,
        ...additionalContext,
      },
    });
  }

  /**
   * Create a child logger with a different minimum log level
   * Useful for enabling debug logging for specific modules
   *
   * @example
   * ```typescript
   * const debugLogger = logger.withLevel('debug');
   * debugLogger.debug('Detailed debug info'); // Will log even in production if needed
   * ```
   */
  public withLevel(minLevel: LogLevel): Logger {
    return new Logger({
      ...this.config,
      minLevel,
    });
  }

  /**
   * Update logger configuration
   * Useful for testing or dynamic configuration changes
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration (useful for debugging the logger itself)
   */
  public getConfig(): Readonly<LoggerConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Default Export & Convenience Functions
// ============================================================================

/**
 * Default logger instance
 * Use this for most logging needs throughout the application
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('Application started', { port: 3000 });
 * logger.error('Database connection failed', { error: err.message });
 * ```
 */
export const logger = new Logger();

/**
 * Create a new logger instance with custom configuration
 * Use this if you need multiple logger instances with different configs
 *
 * @example
 * ```typescript
 * import { createLogger } from '@/lib/logger';
 *
 * const dbLogger = createLogger({
 *   baseContext: { service: 'database' }
 * });
 * ```
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Helper to sanitize sensitive data from context objects
 * Use this to ensure passwords, tokens, etc. are not logged
 *
 * @example
 * ```typescript
 * import { logger, sanitizeContext } from '@/lib/logger';
 *
 * const context = {
 *   userId: '123',
 *   password: 'secret123',
 *   apiKey: 'sk-...'
 * };
 *
 * logger.info('User action', sanitizeContext(context));
 * // Logs: { userId: '123', password: '[REDACTED]', apiKey: '[REDACTED]' }
 * ```
 */
export function sanitizeContext(context: LogContext): LogContext {
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'auth',
    'credential',
    'credentials',
    'privateKey',
    'private_key',
  ];

  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive =>
      keyLower.includes(sensitive.toLowerCase())
    );

    sanitized[key] = isSensitive ? '[REDACTED]' : value;
  }

  return sanitized;
}

/**
 * Helper to log errors with proper stack traces
 * Automatically extracts error message and stack trace
 *
 * @example
 * ```typescript
 * import { logError } from '@/lib/logger';
 *
 * try {
 *   // some operation
 * } catch (error) {
 *   logError('Operation failed', error, { userId: '123' });
 * }
 * ```
 */
export function logError(
  message: string,
  error: unknown,
  context?: LogContext
): void {
  const errorContext: LogContext = { ...context };

  if (error instanceof Error) {
    errorContext.errorMessage = error.message;
    errorContext.errorName = error.name;

    // Include stack trace in development or if DEBUG is set
    if (DEFAULT_CONFIG.isDevelopment || process.env.DEBUG) {
      errorContext.stack = error.stack;
    }

    // Include any additional error properties
    const errorKeys = Object.keys(error);
    for (const key of errorKeys) {
      if (key !== 'message' && key !== 'name' && key !== 'stack') {
        errorContext[`error_${key}`] = (error as any)[key];
      }
    }
  } else {
    // Handle non-Error objects
    errorContext.error = String(error);
  }

  logger.error(message, errorContext);
}

// ============================================================================
// Default Export
// ============================================================================

// Default export is the singleton logger instance
export default logger;
