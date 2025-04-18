/**
 * Logger Utility
 * 
 * Provides consistent logging functionality throughout the application
 * with support for different log levels and formats.
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Current log level (can be changed at runtime)
let currentLogLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.INFO 
  : LogLevel.DEBUG;

// Set the log level
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

// Format the timestamp for log entries
function getTimestamp(): string {
  return new Date().toISOString();
}

// Format the log entry
function formatLogMessage(level: string, message: string): string {
  return `${getTimestamp()} [${level.padEnd(5)}] ${message}`;
}

// Check if the given level should be logged
function shouldLog(level: LogLevel): boolean {
  return level <= currentLogLevel;
}

// Logger implementation
export const logger = {
  debug(message: string): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(formatLogMessage('DEBUG', message));
    }
  },

  info(message: string): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(formatLogMessage('INFO', message));
    }
  },

  warn(message: string): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatLogMessage('WARN', message));
    }
  },

  error(message: string): void {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(formatLogMessage('ERROR', message));
    }
  },

  // Log with specific level
  log(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message);
        break;
      case LogLevel.INFO:
        this.info(message);
        break;
      case LogLevel.WARN:
        this.warn(message);
        break;
      case LogLevel.ERROR:
        this.error(message);
        break;
    }
  }
};

export default logger;