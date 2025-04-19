/**
 * Database Service for Energy Management System
 * 
 * This module provides a standardized database service for the EMS,
 * handling connections, migrations, and transactions.
 */

import { BaseService } from './baseService';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { config } from './config';
import { logger } from './logger';
import * as schema from '@shared/schema';

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

/**
 * Database Service for managing database connections and operations
 */
export class DatabaseService extends BaseService {
  private pool: Pool | null = null;
  private db: PostgresJsDatabase<typeof schema> | null = null;
  private useMockData: boolean = false;

  /**
   * Create a new database service
   */
  constructor() {
    super('database');
    this.useMockData = config.core.env === 'development' && !process.env.DATABASE_URL;
  }

  /**
   * Initialize the database service
   */
  protected async onInitialize(): Promise<void> {
    if (this.useMockData) {
      logger.warn('No DATABASE_URL provided, using mock data');
      return;
    }

    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Create the database connection pool
      this.pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        max: config.database.maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: config.database.connectionTimeout,
        statementTimeout: config.database.queryTimeout,
        ssl: config.database.ssl
      });

      // Initialize the Drizzle ORM instance
      this.db = drizzle(this.pool, { schema });

      // Test the connection
      await this.testConnection();

      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection', error);
      throw error;
    }
  }

  /**
   * Start the database service
   */
  protected async onStart(): Promise<void> {
    if (this.useMockData) {
      return;
    }

    logger.info('Database service started');
  }

  /**
   * Stop the database service
   */
  protected async onStop(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      logger.info('Database connection pool closed');
    }
  }

  /**
   * Test the database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.execute(sql`SELECT 1`);
      logger.debug('Database connection test successful');
    } catch (error) {
      logger.error('Database connection test failed', error);
      throw error;
    }
  }

  /**
   * Get the database instance
   */
  public getDb(): PostgresJsDatabase<typeof schema> {
    if (!this.db) {
      if (this.useMockData) {
        throw new Error('Database service is in mock mode, database instance not available');
      }
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Get the connection pool
   */
  public getPool(): Pool {
    if (!this.pool) {
      if (this.useMockData) {
        throw new Error('Database service is in mock mode, connection pool not available');
      }
      throw new Error('Database connection pool not initialized');
    }
    return this.pool;
  }

  /**
   * Run a function within a transaction
   */
  public async transaction<T>(
    callback: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      if (this.useMockData) {
        throw new Error('Database service is in mock mode, transactions not available');
      }
      throw new Error('Database not initialized');
    }

    return this.db.transaction(callback);
  }

  /**
   * Check if the database service is using mock data
   */
  public isUsingMockData(): boolean {
    return this.useMockData;
  }

  /**
   * Get the connection status
   */
  public getConnectionStatus(): 'connected' | 'disconnected' | 'mock' {
    if (this.useMockData) {
      return 'mock';
    }
    return this.db ? 'connected' : 'disconnected';
  }
}

// Export a singleton instance
export const databaseService = new DatabaseService();