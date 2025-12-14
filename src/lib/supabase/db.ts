/**
 * Direct Database Access with Connection Pooling
 *
 * This module provides direct PostgreSQL access for admin operations that
 * require more control than the Supabase client provides. This is optional
 * and should only be used when necessary.
 *
 * Features:
 * - Connection pooling with configurable limits
 * - Automatic connection cleanup
 * - Prepared statement caching
 * - Proper error handling and logging
 * - Type-safe query execution
 *
 * Setup:
 * 1. Install postgres.js: `npm install postgres`
 * 2. Add SUPABASE_DB_POOLER_URL to your .env file
 * 3. Import and use the pool in your server-side code
 *
 * @module lib/supabase/db
 */

import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

/**
 * Database pool configuration
 */
const DB_POOL_CONFIG = {
  // Connection settings
  max: 20,                    // Maximum pool size
  idle_timeout: 30,           // Seconds before idle connection is closed
  connect_timeout: 10,        // Seconds to wait for connection

  // Performance settings
  max_lifetime: 3600,         // Maximum connection lifetime (1 hour)
  prepare: true,              // Enable prepared statements

  // Error handling
  onnotice: () => {},         // Suppress PostgreSQL notices
  debug: env.NODE_ENV === 'development',
} as const;

/**
 * Database connection pool instance
 * Lazily initialized on first use
 */
let dbPool: any = null;

/**
 * Initialize the database connection pool
 *
 * This function lazily creates a connection pool using postgres.js.
 * The pool is reused across all database operations.
 *
 * @returns Database pool instance
 * @throws Error if postgres.js is not installed or configuration is missing
 *
 * @example
 * ```typescript
 * import { getDbPool } from '@/lib/supabase/db';
 *
 * const sql = await getDbPool();
 * const users = await sql`SELECT * FROM users WHERE active = true`;
 * ```
 */
export async function getDbPool() {
  // Return existing pool if available
  if (dbPool) {
    return dbPool;
  }

  try {
    // Check if pooler URL is configured
    if (!env.SUPABASE_DB_POOLER_URL) {
      const error = new Error(
        'SUPABASE_DB_POOLER_URL is not configured. ' +
        'Please add it to your .env file to use direct database access.'
      );
      logger.error('Database pool initialization failed', {
        reason: 'Missing SUPABASE_DB_POOLER_URL',
      });
      throw error;
    }

    // Try to import postgres.js
    let postgres: any;
    try {
      postgres = await import('postgres');
      postgres = postgres.default || postgres;
    } catch (importError) {
      const error = new Error(
        'postgres.js is not installed. ' +
        'Run: npm install postgres'
      );
      logger.error('Database pool initialization failed', {
        reason: 'postgres.js not installed',
        error: importError instanceof Error ? importError.message : String(importError),
      });
      throw error;
    }

    // Create connection pool
    dbPool = postgres(env.SUPABASE_DB_POOLER_URL, DB_POOL_CONFIG);

    logger.info('Database connection pool initialized', {
      maxConnections: DB_POOL_CONFIG.max,
      idleTimeout: DB_POOL_CONFIG.idle_timeout,
      preparedStatements: DB_POOL_CONFIG.prepare,
    });

    // Test connection
    try {
      await dbPool`SELECT 1 AS test`;
      logger.info('Database connection test successful');
    } catch (testError) {
      logger.error('Database connection test failed', {
        error: testError instanceof Error ? testError.message : String(testError),
      });
      throw new Error('Failed to connect to database. Please check your connection string.');
    }

    return dbPool;
  } catch (error) {
    logger.error('Failed to initialize database pool', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Execute a database query with automatic error handling
 *
 * This is a convenience wrapper around the pool that adds logging
 * and error handling. Use this for one-off queries.
 *
 * @param queryFn - Function that receives the sql template tag and executes a query
 * @returns Query result
 *
 * @example
 * ```typescript
 * import { executeQuery } from '@/lib/supabase/db';
 *
 * const users = await executeQuery(async (sql) => {
 *   return await sql`SELECT * FROM users WHERE id = ${userId}`;
 * });
 * ```
 */
export async function executeQuery<T>(
  queryFn: (sql: any) => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const sql = await getDbPool();
    const result = await queryFn(sql);

    const duration = Date.now() - startTime;
    logger.debug('Database query executed', {
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database query failed', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error('Database operation failed. Please try again later.');
  }
}

/**
 * Execute a database transaction
 *
 * Wraps multiple queries in a transaction. All queries succeed or all fail.
 * Automatically handles commit and rollback.
 *
 * @param transactionFn - Function that receives the sql template tag and executes queries
 * @returns Transaction result
 *
 * @example
 * ```typescript
 * import { executeTransaction } from '@/lib/supabase/db';
 *
 * await executeTransaction(async (sql) => {
 *   await sql`UPDATE accounts SET balance = balance - 100 WHERE id = ${fromId}`;
 *   await sql`UPDATE accounts SET balance = balance + 100 WHERE id = ${toId}`;
 *   await sql`INSERT INTO transactions (from_id, to_id, amount) VALUES (${fromId}, ${toId}, 100)`;
 * });
 * ```
 */
export async function executeTransaction<T>(
  transactionFn: (sql: any) => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const sql = await getDbPool();

    // Begin transaction
    const result = await sql.begin(async (transaction: any) => {
      return await transactionFn(transaction);
    });

    const duration = Date.now() - startTime;
    logger.info('Database transaction completed', {
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database transaction failed', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error('Database transaction failed. Please try again later.');
  }
}

/**
 * Close the database connection pool
 *
 * This should be called when shutting down the application.
 * In most cases, you don't need to call this as Next.js handles cleanup.
 *
 * @example
 * ```typescript
 * import { closeDbPool } from '@/lib/supabase/db';
 *
 * // In shutdown handler
 * await closeDbPool();
 * ```
 */
export async function closeDbPool(): Promise<void> {
  if (!dbPool) {
    logger.debug('No database pool to close');
    return;
  }

  try {
    await dbPool.end({ timeout: 5 });
    dbPool = null;
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Failed to close database pool', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get connection pool statistics
 *
 * Useful for monitoring and debugging connection pool health.
 *
 * @returns Pool statistics object
 *
 * @example
 * ```typescript
 * import { getPoolStats } from '@/lib/supabase/db';
 *
 * const stats = await getPoolStats();
 * console.log(`Active connections: ${stats.count}`);
 * ```
 */
export async function getPoolStats() {
  if (!dbPool) {
    return {
      count: 0,
      max: DB_POOL_CONFIG.max,
      idle: 0,
    };
  }

  try {
    // postgres.js doesn't expose detailed stats by default
    // This is a placeholder for when you need to implement custom monitoring
    return {
      count: dbPool.options?.max || 0,
      max: DB_POOL_CONFIG.max,
      idle: 0,
    };
  } catch (error) {
    logger.error('Failed to get pool stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      count: 0,
      max: DB_POOL_CONFIG.max,
      idle: 0,
    };
  }
}

/**
 * Type helper for database query results
 * Use this to type your query results
 */
export type DbQueryResult<T> = T[];

/**
 * Type helper for database row
 * Use this when you expect a single row result
 */
export type DbRow<T> = T | undefined;
