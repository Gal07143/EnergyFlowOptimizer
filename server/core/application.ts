/**
 * Application Core for Energy Management System
 * 
 * This module provides the core application class for the EMS,
 * managing application lifecycle, service initialization, and cleanup.
 */

import express, { Express } from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandlerMiddleware } from './errors';
import { serviceRegistry } from './serviceRegistry';
import { config, Config } from './config';
import { logger, LogLevel } from './logger';

/**
 * Core Application class for Energy Management System
 */
export class Application {
  private static instance: Application;
  private app: Express;
  private server: Server | null = null;
  private isInitialized = false;
  private isStarted = false;
  private config: Config;

  /**
   * Create a new application instance
   */
  private constructor(appConfig: Config = config) {
    this.config = appConfig;
    this.app = express();
    
    // Configure logger based on application configuration
    const logLevelMap: Record<string, LogLevel> = {
      'debug': LogLevel.DEBUG,
      'info': LogLevel.INFO,
      'warn': LogLevel.WARN,
      'error': LogLevel.ERROR,
      'fatal': LogLevel.FATAL
    };
    
    logger.configure({
      minLevel: logLevelMap[this.config.core.logLevel] || LogLevel.INFO,
      useColors: this.config.core.useColorLogs
    });
  }

  /**
   * Get the singleton Application instance
   */
  public static getInstance(appConfig: Config = config): Application {
    if (!Application.instance) {
      Application.instance = new Application(appConfig);
    }
    return Application.instance;
  }

  /**
   * Get the Express application instance
   */
  public getExpressApp(): Express {
    return this.app;
  }

  /**
   * Get the HTTP server instance
   */
  public getServer(): Server | null {
    return this.server;
  }

  /**
   * Check if the application is initialized
   */
  public isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if the application is started
   */
  public isAppStarted(): boolean {
    return this.isStarted;
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing Energy Management System');

    try {
      // Configure Express middleware
      this.setupMiddleware();
      
      // Initialize all registered services
      await serviceRegistry.initializeAll();
      
      this.isInitialized = true;
      logger.info('Energy Management System initialized successfully');
    } catch (error) {
      logger.fatal('Failed to initialize Energy Management System', error);
      throw error;
    }
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isStarted) {
      return;
    }

    logger.info('Starting Energy Management System');

    try {
      // Start all registered services
      await serviceRegistry.startAll();
      
      // Start the HTTP server
      const { port, host } = this.config.core;
      
      return new Promise<void>((resolve, reject) => {
        this.server = this.app.listen({
          port,
          host,
          reusePort: true
        }, () => {
          this.isStarted = true;
          logger.info(`Energy Management System is running on http://${host}:${port}`);
          resolve();
        }).on('error', (err) => {
          logger.fatal(`Failed to start server: ${err.message}`, err);
          reject(err);
        });
        
        // Handle process termination signals
        this.setupProcessHandlers();
      });
    } catch (error) {
      logger.fatal('Failed to start Energy Management System', error);
      throw error;
    }
  }

  /**
   * Stop the application
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    logger.info('Stopping Energy Management System');

    try {
      // Stop all registered services in reverse order
      await serviceRegistry.stopAll();
      
      // Close the HTTP server
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          if (!this.server) {
            resolve();
            return;
          }
          
          this.server.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server', err);
              reject(err);
              return;
            }
            resolve();
          });
        });
        
        this.server = null;
      }
      
      this.isStarted = false;
      logger.info('Energy Management System stopped successfully');
    } catch (error) {
      logger.error('Error while stopping Energy Management System', error);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"]
        }
      }
    }));
    
    // CORS configuration
    this.app.use(cors(this.config.api.cors));
    
    // Body parsers
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Compression
    this.app.use(compression());
    
    // Custom middleware for request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson: any) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson] as any);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          // Use appropriate log level based on status code
          if (res.statusCode >= 500) {
            logger.error(logLine);
          } else if (res.statusCode >= 400) {
            logger.warn(logLine);
          } else {
            logger.info(logLine);
          }
        }
      });

      next();
    });

    // Add global error handler middleware as the last middleware
    this.app.use(errorHandlerMiddleware);
  }

  /**
   * Setup process termination signal handlers
   */
  private setupProcessHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal} signal. Initiating graceful shutdown...`);
      
      try {
        await this.stop();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.fatal('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught exception', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason) => {
      logger.fatal('Unhandled rejection', reason);
      // Don't exit for unhandled rejections, just log them
    });
  }
}

// Export a singleton instance
export const application = Application.getInstance();