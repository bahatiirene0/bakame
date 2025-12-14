# Bakame AI Structured Logger

A production-ready structured logging system with zero dependencies, designed for the bakame-ai project.

## Features

- **Structured JSON logging** in production for log aggregation services (Datadog, CloudWatch, etc.)
- **Pretty-printed colored logs** in development for easy debugging
- **Context propagation** through child loggers (request ID, user ID, etc.)
- **Configurable log levels** with environment-based filtering
- **TypeScript type safety** for all log metadata
- **Zero external dependencies** - uses only Node.js built-in console
- **Sensitive data sanitization** helper to prevent logging passwords, tokens, etc.
- **Error logging helpers** with automatic stack trace extraction

## Quick Start

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User logged in', { userId: '123', ip: '1.2.3.4' });
logger.error('Database connection failed', { error: err.message });

// Request-scoped logging with context
const reqLogger = logger.withContext({ requestId: 'abc', userId: '123' });
reqLogger.info('Processing request'); // includes requestId and userId automatically
```

## API Reference

### Log Levels

- `debug()` - Detailed diagnostic information (silent in production unless DEBUG env is set)
- `info()` - General informational messages
- `warn()` - Potentially harmful situations
- `error()` - Error events that might still allow the application to continue

### Core Functions

#### `logger.info(message, context?)`
```typescript
logger.info('User action completed', {
  userId: '123',
  action: 'purchase',
  amount: 99.99
});
```

#### `logger.withContext(context)`
Create a child logger with persistent context:
```typescript
const reqLogger = logger.withContext({
  requestId: req.headers['x-request-id'],
  userId: session.userId
});

reqLogger.info('Request started');
reqLogger.debug('Processing payment');
// Both logs include requestId and userId
```

#### `logError(message, error, context?)`
Helper for logging errors with automatic stack trace extraction:
```typescript
try {
  await riskyOperation();
} catch (error) {
  logError('Operation failed', error, { userId: '123' });
}
```

#### `sanitizeContext(context)`
Remove sensitive data from context objects:
```typescript
const data = {
  userId: '123',
  password: 'secret',
  apiKey: 'sk-...'
};

logger.info('User login', sanitizeContext(data));
// Output: { userId: '123', password: '[REDACTED]', apiKey: '[REDACTED]' }
```

#### `createLogger(config?)`
Create a custom logger instance:
```typescript
const dbLogger = createLogger({
  baseContext: { service: 'database' }
});
```

## Environment Behavior

### Development Mode (`NODE_ENV !== 'production'`)
- Pretty-printed logs with colors
- All log levels enabled
- Stack traces included in errors

Example output:
```
14:23:45.123 INFO  User logged in
  userId=123
  ip=192.168.1.1
```

### Production Mode (`NODE_ENV === 'production'`)
- JSON formatted logs
- Debug logs disabled (unless `DEBUG=true` is set)
- Optimized for log aggregation services

Example output:
```json
{"timestamp":"2024-01-15T14:23:45.123Z","level":"info","message":"User logged in","context":{"userId":"123","ip":"192.168.1.1"}}
```

## Usage Examples

See `logger.example.ts` for comprehensive examples including:
- Basic logging
- Request-scoped logging
- Sensitive data sanitization
- Error handling
- Service-level logging
- Background job logging

## Best Practices

1. **Use appropriate log levels**
   - `debug` for development-only details
   - `info` for normal application flow
   - `warn` for unexpected but recoverable situations
   - `error` for failures that need attention

2. **Include relevant context**
   ```typescript
   logger.info('Payment processed', {
     userId: user.id,
     amount: payment.amount,
     currency: payment.currency,
     transactionId: payment.id
   });
   ```

3. **Use child loggers for request tracking**
   ```typescript
   const reqLogger = logger.withContext({ requestId: generateId() });
   // Use reqLogger throughout request lifecycle
   ```

4. **Sanitize sensitive data**
   ```typescript
   logger.info('Auth attempt', sanitizeContext(credentials));
   ```

5. **Use logError for exceptions**
   ```typescript
   catch (error) {
     logError('Database query failed', error, { query: sql });
   }
   ```

## Integration with Log Aggregation

The JSON output format is compatible with:
- Datadog
- AWS CloudWatch
- Logstash/ELK Stack
- Splunk
- New Relic
- Google Cloud Logging

Simply configure your log aggregation service to parse JSON logs and use the `context` fields for filtering and analysis.

## TypeScript Support

Full TypeScript support with exported types:
- `LogLevel` - Available log levels
- `LogContext` - Context object structure
- `LogEntry` - Complete log entry structure
- `LoggerConfig` - Logger configuration options

## File Information

- **Location**: `/home/bahati/bakame-ai/src/lib/logger.ts`
- **Lines**: 451
- **Dependencies**: None (zero external dependencies)
- **TypeScript**: Fully typed
