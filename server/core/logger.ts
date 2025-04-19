/**
 * Logging System for Energy Management System
 * 
 * This module provides a standardized logging system for the EMS,
 * supporting different log levels, formats, and destinations.
 */

import fs from 'fs';
import path from 'path';
import util from 'util';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

/**
 * Log context interface
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  useColors?: boolean;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableJsonFormat?: boolean;
  includeTimestamp?: boolean;
  service?: string;
}

/**
 * Logger class for handling logging
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig = {
    minLevel: LogLevel.INFO,
    useColors: true,
    enableConsole: true,
    enableFile: false,
    filePath: path.join(process.cwd(), 'logs', 'ems.log'),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableJsonFormat: false,
    includeTimestamp: true,
    service: 'ems'
  };

  private logLevelNames: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'debug',
    [LogLevel.INFO]: 'info',
    [LogLevel.WARN]: 'warn',
    [LogLevel.ERROR]: 'error',
    [LogLevel.FATAL]: 'fatal'
  };

  private logLevelColors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.FATAL]: '\x1b[35m'  // Magenta
  };

  private resetColor: string = '\x1b[0m';

  private constructor() {
    // If logging to file is enabled, ensure the directory exists
    if (this.config.enableFile) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure the logger
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };

    // If logging to file is enabled, ensure the directory exists
    if (this.config.enableFile) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Ensure the log directory exists
   */
  private ensureLogDirectory(): void {
    if (!this.config.filePath) return;
    
    const logDir = path.dirname(this.config.filePath);
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create log directory: ${logDir}`, error);
      }
    }
  }

  /**
   * Log a message at the DEBUG level
   */
  public debug(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a message at the INFO level
   */
  public info(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at the WARN level
   */
  public warn(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at the ERROR level
   */
  public error(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a message at the FATAL level
   */
  public fatal(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.FATAL, message, context);
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error): void {
    // Check if the log level is high enough
    if (level < this.config.minLevel!) {
      return;
    }

    const timestamp = new Date();
    let context: LogContext | undefined;
    let error: Error | undefined;

    // Handle context or error parameter
    if (contextOrError) {
      if (contextOrError instanceof Error) {
        error = contextOrError;
      } else {
        context = contextOrError;
      }
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      context,
      error
    };

    // Log to console
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Log to file
    if (this.config.enableFile) {
      this.logToFile(entry);
    }
  }

  /**
   * Log an entry to the console
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, context, error } = entry;
    
    let formattedMessage = '';
    
    // Add timestamp if configured
    if (this.config.includeTimestamp) {
      const timeString = timestamp.toLocaleTimeString();
      formattedMessage += `${timeString} `;
    }
    
    // Add service name if provided
    if (this.config.service) {
      formattedMessage += `[${this.config.service}] `;
    }
    
    // Add log level
    const levelName = this.logLevelNames[level];
    if (this.config.useColors) {
      const colorCode = this.logLevelColors[level];
      formattedMessage += `${colorCode}${levelName.toUpperCase()}${this.resetColor} `;
    } else {
      formattedMessage += `${levelName.toUpperCase()} `;
    }
    
    // Add message
    formattedMessage += message;
    
    // Add context if provided
    if (context) {
      const contextStr = util.inspect(context, { depth: 3, colors: this.config.useColors });
      formattedMessage += ` ${contextStr}`;
    }
    
    // Choose the appropriate console method based on log level
    let consoleMethod: 'log' | 'info' | 'warn' | 'error';
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        consoleMethod = 'info';
        break;
      case LogLevel.WARN:
        consoleMethod = 'warn';
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        consoleMethod = 'error';
        break;
      default:
        consoleMethod = 'log';
    }
    
    // Log the message
    console[consoleMethod](formattedMessage);
    
    // Log the error stack if provided
    if (error) {
      console.error(error);
    }
  }

  /**
   * Log an entry to a file
   */
  private logToFile(entry: LogEntry): void {
    if (!this.config.filePath) return;
    
    try {
      const { timestamp, level, message, context, error } = entry;
      
      let logData: any;
      
      if (this.config.enableJsonFormat) {
        // JSON format
        logData = {
          timestamp: timestamp.toISOString(),
          level: this.logLevelNames[level],
          message,
          service: this.config.service
        };
        
        if (context) {
          logData.context = context;
        }
        
        if (error) {
          logData.error = {
            name: error.name,
            message: error.message,
            stack: error.stack
          };
        }
        
        logData = JSON.stringify(logData);
      } else {
        // Text format
        let logEntry = '';
        
        // Add timestamp
        logEntry += `${timestamp.toISOString()} `;
        
        // Add service name if provided
        if (this.config.service) {
          logEntry += `[${this.config.service}] `;
        }
        
        // Add log level
        logEntry += `[${this.logLevelNames[level].toUpperCase()}] `;
        
        // Add message
        logEntry += message;
        
        // Add context if provided
        if (context) {
          logEntry += ` ${util.inspect(context, { depth: 3, colors: false })}`;
        }
        
        // Add error if provided
        if (error) {
          logEntry += `\nError: ${error.message}\n${error.stack}`;
        }
        
        logData = logEntry;
      }
      
      // Append to log file
      fs.appendFileSync(this.config.filePath, logData + '\n');
      
      // Check file size and rotate if needed
      this.checkAndRotateLogs();
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  /**
   * Check log file size and rotate if needed
   */
  private checkAndRotateLogs(): void {
    if (!this.config.filePath || !this.config.maxFileSize || !this.config.maxFiles) return;
    
    try {
      const stats = fs.statSync(this.config.filePath);
      
      if (stats.size >= this.config.maxFileSize) {
        this.rotateLogFiles();
      }
    } catch (e) {
      console.error('Failed to check log file size:', e);
    }
  }

  /**
   * Rotate log files
   */
  private rotateLogFiles(): void {
    if (!this.config.filePath || !this.config.maxFiles) return;
    
    try {
      const baseFilePath = this.config.filePath;
      const maxFiles = this.config.maxFiles;
      
      // Delete the oldest log file if it exists
      const oldestLogFile = `${baseFilePath}.${maxFiles - 1}`;
      if (fs.existsSync(oldestLogFile)) {
        fs.unlinkSync(oldestLogFile);
      }
      
      // Shift other log files
      for (let i = maxFiles - 2; i >= 0; i--) {
        const oldFile = i === 0 ? baseFilePath : `${baseFilePath}.${i}`;
        const newFile = `${baseFilePath}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }
      
      // Create a new empty log file
      fs.writeFileSync(baseFilePath, '');
    } catch (e) {
      console.error('Failed to rotate log files:', e);
    }
  }
}

/**
 * Service-specific logger class
 */
export class ServiceLogger {
  private baseLogger: Logger;
  private serviceName: string;

  /**
   * Create a new service logger
   */
  constructor(serviceName: string) {
    this.baseLogger = logger;
    this.serviceName = serviceName;
  }

  /**
   * Log a message at the DEBUG level
   */
  public debug(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a message at the INFO level
   */
  public info(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at the WARN level
   */
  public warn(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at the ERROR level
   */
  public error(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a message at the FATAL level
   */
  public fatal(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.FATAL, message, context);
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error): void {
    let context: LogContext = { service: this.serviceName };
    let error: Error | undefined;

    // Handle context or error parameter
    if (contextOrError) {
      if (contextOrError instanceof Error) {
        error = contextOrError;
      } else {
        context = { ...context, ...contextOrError };
      }
    }

    // Use the appropriate log method based on the level
    switch (level) {
      case LogLevel.DEBUG:
        this.baseLogger.debug(`[${this.serviceName}] ${message}`, error || context);
        break;
      case LogLevel.INFO:
        this.baseLogger.info(`[${this.serviceName}] ${message}`, error || context);
        break;
      case LogLevel.WARN:
        this.baseLogger.warn(`[${this.serviceName}] ${message}`, error || context);
        break;
      case LogLevel.ERROR:
        this.baseLogger.error(`[${this.serviceName}] ${message}`, error || context);
        break;
      case LogLevel.FATAL:
        this.baseLogger.fatal(`[${this.serviceName}] ${message}`, error || context);
        break;
    }
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();