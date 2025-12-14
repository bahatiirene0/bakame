/**
 * Example usage of the bakame-ai logger
 * This file demonstrates all the key features of the logging system
 */

import { logger, logError, sanitizeContext, createLogger } from './logger';

// ============================================================================
// Basic Logging Examples
// ============================================================================

// Info level - general application flow
logger.info('Application started', { port: 3000, env: 'development' });

// Debug level - detailed diagnostic information
logger.debug('Database query executed', {
  query: 'SELECT * FROM users WHERE id = ?',
  params: [123],
  executionTime: 45,
});

// Warning level - potentially harmful situations
logger.warn('Rate limit approaching', {
  userId: 'user-123',
  remaining: 10,
  limit: 100,
});

// Error level - error events
logger.error('Database connection failed', {
  error: 'Connection timeout after 5000ms',
  retryAttempt: 3,
  database: 'postgresql',
});

// ============================================================================
// Child Logger with Context (Request-Scoped Logging)
// ============================================================================

// Create a child logger with request-specific context
// All logs from this logger will include requestId and userId
const requestLogger = logger.withContext({
  requestId: 'req-abc-123',
  userId: 'user-456',
});

requestLogger.info('Processing API request');
// Output includes: { requestId: 'req-abc-123', userId: 'user-456' }

requestLogger.debug('Request headers received', {
  userAgent: 'Mozilla/5.0',
  acceptLanguage: 'en-US',
});
// Output includes: { requestId: '...', userId: '...', userAgent: '...', acceptLanguage: '...' }

// You can chain contexts for even more specific logging
const operationLogger = requestLogger.withContext({
  operation: 'payment-processing',
  transactionId: 'txn-789',
});

operationLogger.info('Payment initiated');
// Output includes: requestId, userId, operation, transactionId

// ============================================================================
// Sanitizing Sensitive Data
// ============================================================================

const userCredentials = {
  userId: '123',
  email: 'user@example.com',
  password: 'secretPassword123',
  apiKey: 'sk-1234567890',
  token: 'jwt-token-here',
  sessionId: 'sess-xyz',
};

// WRONG - Don't do this! Logs sensitive data
// logger.info('User login', userCredentials);

// CORRECT - Use sanitizeContext to redact sensitive fields
logger.info('User login attempt', sanitizeContext(userCredentials));
// Output: { userId: '123', email: 'user@example.com', password: '[REDACTED]', apiKey: '[REDACTED]', token: '[REDACTED]', sessionId: 'sess-xyz' }

// ============================================================================
// Error Logging with Stack Traces
// ============================================================================

async function fetchUserData(userId: string) {
  try {
    // Simulating an API call that might fail
    const response = await fetch(`https://api.example.com/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    // Use logError helper to automatically extract error details
    logError('Failed to fetch user data', error, {
      userId,
      operation: 'fetchUserData',
    });
    throw error;
  }
}

// ============================================================================
// Custom Logger Instances
// ============================================================================

// Create a specialized logger for a specific service
const databaseLogger = createLogger({
  baseContext: { service: 'database' },
});

databaseLogger.info('Connection pool initialized', {
  maxConnections: 20,
  idleTimeout: 30000,
});

// Create a logger that only logs warnings and errors
const productionLogger = createLogger({
  minLevel: 'warn',
});

productionLogger.debug('This will not be logged');
productionLogger.info('This will not be logged');
productionLogger.warn('This WILL be logged');
productionLogger.error('This WILL be logged');

// ============================================================================
// Practical Use Cases
// ============================================================================

// Use Case 1: API Route Handler
export async function handleApiRequest(req: Request) {
  // Create request-scoped logger
  const reqId = crypto.randomUUID();
  const reqLogger = logger.withContext({
    requestId: reqId,
    method: req.method,
    url: req.url,
  });

  reqLogger.info('Request received');

  try {
    // Process request...
    reqLogger.debug('Processing request body');

    // Simulating some operation
    const result = { success: true };

    reqLogger.info('Request completed successfully', { statusCode: 200 });
    return result;
  } catch (error) {
    logError('Request failed', error, {
      requestId: reqId,
      method: req.method,
      url: req.url,
    });
    throw error;
  }
}

// Use Case 2: Background Job
export async function processBackgroundJob(jobId: string, userId: string) {
  const jobLogger = logger.withContext({
    jobId,
    userId,
    jobType: 'email-notification',
  });

  jobLogger.info('Job started');

  try {
    // Simulating job steps
    jobLogger.debug('Fetching user preferences');
    jobLogger.debug('Rendering email template');
    jobLogger.debug('Sending email via SMTP');

    jobLogger.info('Job completed successfully', {
      duration: 2500,
      emailsSent: 1,
    });
  } catch (error) {
    logError('Job failed', error, { jobId, userId });
    throw error;
  }
}

// Use Case 3: Service with Consistent Context
class UserService {
  private logger = createLogger({
    baseContext: { service: 'UserService' },
  });

  async createUser(data: { email: string; password: string }) {
    this.logger.info('Creating new user', {
      email: data.email,
      // Never log passwords!
    });

    try {
      // User creation logic...
      this.logger.info('User created successfully', {
        email: data.email,
      });
    } catch (error) {
      logError('Failed to create user', error, {
        email: data.email,
      });
      throw error;
    }
  }

  async deleteUser(userId: string) {
    const userLogger = this.logger.withContext({ userId });

    userLogger.warn('User deletion initiated');

    try {
      // Deletion logic...
      userLogger.info('User deleted successfully');
    } catch (error) {
      logError('Failed to delete user', error, { userId });
      throw error;
    }
  }
}

// ============================================================================
// Environment-Specific Behavior
// ============================================================================

/*
 * Development Mode (NODE_ENV !== 'production'):
 * - Pretty-printed logs with colors
 * - All log levels enabled (debug, info, warn, error)
 * - Stack traces included in error logs
 * - Example output:
 *   14:23:45.123 INFO  User logged in
 *     userId=123
 *     ip=192.168.1.1
 *
 * Production Mode (NODE_ENV === 'production'):
 * - JSON formatted logs for aggregation services
 * - Debug logs disabled (unless DEBUG env is set)
 * - No stack traces (unless DEBUG env is set)
 * - Example output:
 *   {"timestamp":"2024-01-15T14:23:45.123Z","level":"info","message":"User logged in","context":{"userId":"123","ip":"192.168.1.1"}}
 */

// To enable debug logs in production, set DEBUG environment variable:
// DEBUG=true npm start

// ============================================================================
// Integration with Log Aggregation Services
// ============================================================================

/*
 * The JSON output in production is compatible with:
 * - Datadog
 * - CloudWatch
 * - Logstash/ELK
 * - Splunk
 * - New Relic
 * - Any service that parses JSON logs
 *
 * Example Datadog configuration:
 * 1. Logs are automatically parsed as JSON
 * 2. Use context fields for filtering and faceting
 * 3. Create dashboards based on log levels and context
 * 4. Set up alerts on error rates or specific patterns
 */

export {};
