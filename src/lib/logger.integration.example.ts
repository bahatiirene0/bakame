/**
 * Real-world integration examples for the bakame-ai logger
 * Showing how to use the logger in Next.js API routes, services, and middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, logError, sanitizeContext } from './logger';

// ============================================================================
// Example 1: Next.js API Route with Request-Scoped Logging
// ============================================================================

export async function POST(request: NextRequest) {
  // Generate a unique request ID for tracking
  const requestId = crypto.randomUUID();

  // Create request-scoped logger with context
  const reqLogger = logger.withContext({
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  reqLogger.info('API request received');

  try {
    // Parse request body
    const body = await request.json();
    reqLogger.debug('Request body parsed', {
      bodySize: JSON.stringify(body).length,
    });

    // Add user context if available
    const userId = request.headers.get('x-user-id');
    const userLogger = userId
      ? reqLogger.withContext({ userId })
      : reqLogger;

    userLogger.info('Processing chat request', {
      messageLength: body.message?.length,
    });

    // Simulate some processing
    const result = await processChatMessage(body.message, userLogger);

    userLogger.info('Request completed successfully', {
      statusCode: 200,
      responseSize: JSON.stringify(result).length,
    });

    return NextResponse.json(result);
  } catch (error) {
    // Log error with full context
    logError('API request failed', error, {
      requestId,
      url: request.url,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Example 2: Service Class with Dedicated Logger
// ============================================================================

class ChatService {
  // Create a service-specific logger
  private logger = logger.withContext({ service: 'ChatService' });

  async processMessage(
    message: string,
    userId: string,
    context?: { sessionId?: string }
  ) {
    // Create message-specific logger
    const msgLogger = this.logger.withContext({
      userId,
      messageId: crypto.randomUUID(),
      ...context,
    });

    msgLogger.info('Processing message', {
      messageLength: message.length,
    });

    try {
      // Step 1: Validate message
      msgLogger.debug('Validating message');
      this.validateMessage(message);

      // Step 2: Check rate limits
      msgLogger.debug('Checking rate limits');
      await this.checkRateLimit(userId, msgLogger);

      // Step 3: Process with AI
      msgLogger.debug('Sending to AI service');
      const response = await this.callAIService(message, msgLogger);

      // Step 4: Save to database
      msgLogger.debug('Saving to database');
      await this.saveMessage(userId, message, response, msgLogger);

      msgLogger.info('Message processed successfully', {
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      logError('Failed to process message', error, {
        userId,
        messageLength: message.length,
      });
      throw error;
    }
  }

  private validateMessage(message: string): void {
    if (!message || message.length === 0) {
      throw new Error('Message cannot be empty');
    }
    if (message.length > 10000) {
      throw new Error('Message too long');
    }
  }

  private async checkRateLimit(userId: string, logger: typeof this.logger) {
    // Simulated rate limit check
    const remaining = 95; // from rate limit service
    const limit = 100;

    if (remaining < 10) {
      logger.warn('User approaching rate limit', {
        userId,
        remaining,
        limit,
      });
    }

    if (remaining <= 0) {
      logger.error('User exceeded rate limit', {
        userId,
        remaining,
        limit,
      });
      throw new Error('Rate limit exceeded');
    }
  }

  private async callAIService(message: string, logger: typeof this.logger) {
    const startTime = Date.now();

    try {
      // Simulate AI service call
      logger.debug('Calling AI service', { provider: 'openai' });

      // In real implementation, this would call OpenAI
      const response = 'AI response';

      const duration = Date.now() - startTime;
      logger.info('AI service responded', {
        duration,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError('AI service call failed', error, {
        duration,
        messageLength: message.length,
      });
      throw error;
    }
  }

  private async saveMessage(
    userId: string,
    message: string,
    response: string,
    logger: typeof this.logger
  ) {
    try {
      // Simulate database save
      logger.debug('Saving message to database');

      // In real implementation, this would use Prisma
      // await prisma.message.create({ ... })

      logger.debug('Message saved successfully');
    } catch (error) {
      logError('Failed to save message', error, { userId });
      throw error;
    }
  }
}

// ============================================================================
// Example 3: Middleware Logging
// ============================================================================

export function createLoggingMiddleware() {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    const reqLogger = logger.withContext({
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });

    reqLogger.info('Request started');

    // Continue to next middleware/handler
    const response = NextResponse.next();

    // Log completion
    const duration = Date.now() - startTime;
    reqLogger.info('Request completed', {
      duration,
      statusCode: response.status,
    });

    // Add request ID to response headers for client tracking
    response.headers.set('X-Request-ID', requestId);

    return response;
  };
}

// ============================================================================
// Example 4: Background Job Logging
// ============================================================================

class EmailJobProcessor {
  private logger = logger.withContext({ service: 'EmailJobProcessor' });

  async processJob(jobId: string, jobData: any) {
    const jobLogger = this.logger.withContext({
      jobId,
      jobType: jobData.type,
    });

    jobLogger.info('Job started', {
      queuedAt: jobData.queuedAt,
      priority: jobData.priority,
    });

    const startTime = Date.now();

    try {
      // Process the job
      await this.sendEmail(jobData, jobLogger);

      const duration = Date.now() - startTime;
      jobLogger.info('Job completed successfully', {
        duration,
        emailsSent: 1,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logError('Job failed', error, {
        jobId,
        duration,
        retryCount: jobData.retryCount || 0,
      });

      // Determine if job should be retried
      if (this.shouldRetry(jobData.retryCount || 0)) {
        jobLogger.warn('Job will be retried', {
          retryCount: jobData.retryCount || 0,
          maxRetries: 3,
        });
      } else {
        jobLogger.error('Job permanently failed', {
          retryCount: jobData.retryCount || 0,
        });
      }

      throw error;
    }
  }

  private async sendEmail(jobData: any, logger: typeof this.logger) {
    logger.debug('Preparing email', {
      to: jobData.to,
      subject: jobData.subject,
    });

    // Simulate email sending
    logger.info('Email sent successfully', {
      to: jobData.to,
    });
  }

  private shouldRetry(retryCount: number): boolean {
    return retryCount < 3;
  }
}

// ============================================================================
// Example 5: Database Query Logging
// ============================================================================

class DatabaseService {
  private logger = logger.withContext({ service: 'Database' });

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const queryLogger = this.logger.withContext({
      queryId: crypto.randomUUID(),
    });

    // Sanitize sensitive data from params
    const sanitizedParams = params.map((param) =>
      typeof param === 'object' ? sanitizeContext(param) : param
    );

    queryLogger.debug('Executing query', {
      sql: sql.substring(0, 100), // Truncate long queries
      paramCount: params.length,
    });

    const startTime = Date.now();

    try {
      // Execute query
      const result: T[] = []; // Simulated result

      const duration = Date.now() - startTime;

      if (duration > 1000) {
        queryLogger.warn('Slow query detected', {
          duration,
          sql: sql.substring(0, 100),
          rowCount: result.length,
        });
      } else {
        queryLogger.debug('Query executed successfully', {
          duration,
          rowCount: result.length,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError('Query failed', error, {
        duration,
        sql: sql.substring(0, 100),
        params: sanitizedParams,
      });
      throw error;
    }
  }
}

// ============================================================================
// Example 6: Authentication Logging (with sensitive data sanitization)
// ============================================================================

class AuthService {
  private logger = logger.withContext({ service: 'AuthService' });

  async login(credentials: { email: string; password: string }) {
    const authLogger = this.logger.withContext({
      email: credentials.email,
      authMethod: 'password',
    });

    authLogger.info('Login attempt started');

    try {
      // IMPORTANT: Never log passwords!
      authLogger.debug('Validating credentials', {
        email: credentials.email,
        // password is intentionally omitted
      });

      // Simulate authentication
      const user = { id: '123', email: credentials.email };

      authLogger.info('Login successful', {
        userId: user.id,
      });

      return user;
    } catch (error) {
      // Use sanitizeContext to ensure no sensitive data is logged
      logError(
        'Login failed',
        error,
        sanitizeContext({
          email: credentials.email,
          password: credentials.password, // Will be redacted
        })
      );
      throw error;
    }
  }
}

// ============================================================================
// Helper: Simulate Chat Processing
// ============================================================================

async function processChatMessage(message: string, logger: typeof this.logger) {
  logger.debug('Processing chat message', {
    messageLength: message.length,
  });

  // Simulate processing
  return {
    response: 'This is a response',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Export examples
// ============================================================================

export {
  ChatService,
  EmailJobProcessor,
  DatabaseService,
  AuthService,
  createLoggingMiddleware,
};
