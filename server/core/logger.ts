/**
 * Logging module for Energy Management System
 * 
 * This module provides standardized logging functionality for the EMS
 * with level-based filtering, formatting, and service-specific contexts.
 */

import { BaseService } from './baseService';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * LogContext interface for providing context to log entries
 */
export interface LogContext {
  service?: string;
  [key: string]: any;
}

/**
 * LogEntry interface for structured log entries
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: any;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  useColors?: boolean;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;
  private useColors: boolean = true;

  private constructor(config: LoggerConfig = {}) {
    if (config.minLevel !== undefined) {
      this.minLevel = config.minLevel;
    }
    if (config.useColors !== undefined) {
      this.useColors = config.useColors;
    }
  }

  /**
   * Get the singleton logger instance
   */
  public static getInstance(config: LoggerConfig = {}): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Configure the logger
   */
  public configure(config: LoggerConfig): void {
    if (config.minLevel !== undefined) {
      this.minLevel = config.minLevel;
    }
    if (config.useColors !== undefined) {
      this.useColors = config.useColors;
    }
  }

  /**
   * Log a message at DEBUG level
   */
  public debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a message at INFO level
   */
  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at WARN level
   */
  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at ERROR level
   */
  public error(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log a message at FATAL level
   */
  public fatal(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Create a service-specific child logger
   */
  public createServiceLogger(service: string | BaseService): ServiceLogger {
    const serviceName = typeof service === 'string' ? service : service.constructor.name;
    return new ServiceLogger(this, serviceName);
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: any): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    this.writeLogEntry(entry);
  }

  /**
   * Write a log entry to the output
   */
  private writeLogEntry(entry: LogEntry): void {
    const levelStr = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    let contextStr = '';
    if (entry.context) {
      if (entry.context.service) {
        contextStr = `[${entry.context.service}] `;
      }
    }

    let colorStart = '';
    let colorEnd = '';
    
    if (this.useColors) {
      switch (entry.level) {
        case LogLevel.DEBUG:
          colorStart = '\x1b[36m'; // Cyan
          break;
        case LogLevel.INFO:
          colorStart = '\x1b[32m'; // Green
          break;
        case LogLevel.WARN:
          colorStart = '\x1b[33m'; // Yellow
          break;
        case LogLevel.ERROR:
          colorStart = '\x1b[31m'; // Red
          break;
        case LogLevel.FATAL:
          colorStart = '\x1b[35m'; // Purple
          break;
      }
      colorEnd = '\x1b[0m';
    }

    console.log(`${timestamp} ${colorStart}${levelStr}${colorEnd}: ${contextStr}${entry.message}`);
    
    if (entry.error) {
      if (entry.error instanceof Error) {
        console.error(entry.error.stack || entry.error.message);
      } else {
        console.error(entry.error);
      }
    }
  }
}

/**
 * Service-specific logger that automatically adds service context
 */
export class ServiceLogger {
  private logger: Logger;
  private serviceName: string;

  constructor(logger: Logger, serviceName: string) {
    this.logger = logger;
    this.serviceName = serviceName;
  }

  /**
   * Log a message at DEBUG level
   */
  public debug(message: string, additionalContext: Omit<LogContext, 'service'> = {}): void {
    this.logger.debug(message, { ...additionalContext, service: this.serviceName });
  }

  /**
   * Log a message at INFO level
   */
  public info(message: string, additionalContext: Omit<LogContext, 'service'> = {}): void {
    this.logger.info(message, { ...additionalContext, service: this.serviceName });
  }

  /**
   * Log a message at WARN level
   */
  public warn(message: string, additionalContext: Omit<LogContext, 'service'> = {}): void {
    this.logger.warn(message, { ...additionalContext, service: this.serviceName });
  }

  /**
   * Log a message at ERROR level
   */
  public error(message: string, error?: any, additionalContext: Omit<LogContext, 'service'> = {}): void {
    this.logger.error(message, error, { ...additionalContext, service: this.serviceName });
  }

  /**
   * Log a message at FATAL level
   */
  public fatal(message: string, error?: any, additionalContext: Omit<LogContext, 'service'> = {}): void {
    this.logger.fatal(message, error, { ...additionalContext, service: this.serviceName });
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();