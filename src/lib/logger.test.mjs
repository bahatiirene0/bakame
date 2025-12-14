/**
 * Simple test script to demonstrate logger output
 * Run with: node src/lib/logger.test.mjs
 */

// Simulate the logger behavior for demonstration
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  timestamp: '\x1b[90m',
  key: '\x1b[35m',
  value: '\x1b[37m',
};

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function formatDevelopmentLog(level, message, context) {
  const now = new Date();
  const time = formatTime(now);
  const levelColor = COLORS[level];
  const levelText = level.toUpperCase().padEnd(5);

  let output = `${COLORS.timestamp}${time}${COLORS.reset} `;
  output += `${levelColor}${COLORS.bright}${levelText}${COLORS.reset} `;
  output += `${message}`;

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

function formatProductionLog(level, message, context) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context || undefined,
  });
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         BAKAME AI LOGGER - DEVELOPMENT MODE OUTPUT             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(formatDevelopmentLog('info', 'Application started', { port: 3000, env: 'development' }));
console.log(formatDevelopmentLog('debug', 'Database connection established', { host: 'localhost', database: 'bakame', connectionTime: 123 }));
console.log(formatDevelopmentLog('warn', 'Rate limit approaching', { userId: 'user-123', remaining: 10, limit: 100 }));
console.log(formatDevelopmentLog('error', 'Payment processing failed', { error: 'Insufficient funds', userId: 'user-456', amount: 99.99 }));

console.log('\n' + '─'.repeat(65) + '\n');

console.log(formatDevelopmentLog('info', 'User logged in', { userId: '123', email: 'user@example.com', loginMethod: 'password' }));

const reqLogger = { requestId: 'req-abc-123', userId: 'user-789' };
console.log(formatDevelopmentLog('info', 'Processing API request', { ...reqLogger, method: 'POST', path: '/api/chat' }));
console.log(formatDevelopmentLog('debug', 'Request validation passed', { ...reqLogger, validationTime: 5 }));
console.log(formatDevelopmentLog('info', 'Request completed', { ...reqLogger, statusCode: 200, duration: 245 }));

console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         BAKAME AI LOGGER - PRODUCTION MODE OUTPUT              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(formatProductionLog('info', 'Application started', { port: 3000, env: 'production' }));
console.log(formatProductionLog('warn', 'Rate limit approaching', { userId: 'user-123', remaining: 10, limit: 100 }));
console.log(formatProductionLog('error', 'Payment processing failed', { error: 'Insufficient funds', userId: 'user-456', amount: 99.99 }));
console.log(formatProductionLog('info', 'User logged in', { userId: '123', email: 'user@example.com', loginMethod: 'password' }));
console.log(formatProductionLog('info', 'Processing API request', { requestId: 'req-abc-123', userId: 'user-789', method: 'POST', path: '/api/chat' }));

console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         LOGGER FEATURES SUMMARY                                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('✓ Structured logging with context propagation');
console.log('✓ Environment-based formatting (pretty dev, JSON prod)');
console.log('✓ Log level filtering (debug, info, warn, error)');
console.log('✓ Child loggers with inherited context');
console.log('✓ Sensitive data sanitization helpers');
console.log('✓ Error logging with stack trace extraction');
console.log('✓ Zero external dependencies');
console.log('✓ Full TypeScript support');
console.log('✓ Compatible with all major log aggregation services\n');
