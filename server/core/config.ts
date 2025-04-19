/**
 * Configuration Management for Energy Management System
 * 
 * This module provides configuration management for the EMS,
 * with defaults, environment variable overrides, and validation.
 */

import path from 'path';
import { logger } from './logger';

/**
 * Core configuration
 */
export interface CoreConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  useColorLogs: boolean;
  dataDir: string;
  enableAuth: boolean;
  enableRateLimit: boolean;
  enableFileLogging: boolean;
  sessionSecret: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  poolIdleTimeout: number;
  ssl: boolean;
  databaseUrl?: string;
}

/**
 * MQTT configuration
 */
export interface MqttConfig {
  brokerUrl: string;
  clientId: string;
  username?: string;
  password?: string;
  cleanSession: boolean;
  keepAlive: number;
  reconnectPeriod: number;
  connectTimeout: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  passwordMinLength: number;
  passwordMaxLength: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireEmailVerification: boolean;
  tokenExpirationTime: number;
}

/**
 * API configuration
 */
export interface ApiConfig {
  cors: {
    origin: string | string[] | boolean;
    methods: string | string[];
    allowedHeaders: string | string[];
    exposedHeaders: string | string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    message: string;
  };
  compression: {
    level: number;
    threshold: number;
    filter: (req: any, res: any) => boolean;
  };
}

/**
 * OpenAI configuration
 */
export interface OpenAiConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Complete application configuration
 */
export interface Config {
  core: CoreConfig;
  database: DatabaseConfig;
  mqtt: MqttConfig;
  auth: AuthConfig;
  api: ApiConfig;
  openai?: OpenAiConfig;
}

/**
 * Load a configuration value from environment variables
 */
function getEnv(key: string, defaultValue: string | undefined = undefined): string | undefined {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get the base configuration with defaults
 */
export function getConfig(): Config {
  const env = (getEnv('NODE_ENV') || 'development') as 'development' | 'test' | 'production';
  const isDev = env === 'development';
  const isTest = env === 'test';
  const isProd = env === 'production';

  // Core configuration
  const core: CoreConfig = {
    env,
    port: parseInt(getEnv('PORT', '5000') || '5000', 10),
    host: getEnv('HOST', '0.0.0.0') || '0.0.0.0',
    logLevel: (getEnv('LOG_LEVEL', isDev ? 'debug' : 'info') || 'info') as 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    useColorLogs: getEnv('USE_COLOR_LOGS', 'true') === 'true',
    dataDir: getEnv('DATA_DIR', path.join(process.cwd(), 'data')) || path.join(process.cwd(), 'data'),
    enableAuth: getEnv('ENABLE_AUTH', isDev ? 'false' : 'true') === 'true',
    enableRateLimit: getEnv('ENABLE_RATE_LIMIT', isDev ? 'false' : 'true') === 'true',
    enableFileLogging: getEnv('ENABLE_FILE_LOGGING', isProd ? 'true' : 'false') === 'true',
    sessionSecret: getEnv('SESSION_SECRET', 'ems-super-secret-key') || 'ems-super-secret-key',
  };

  // Database configuration
  const database: DatabaseConfig = {
    maxConnections: parseInt(getEnv('DB_MAX_CONNECTIONS', '10') || '10', 10),
    connectionTimeout: parseInt(getEnv('DB_CONNECTION_TIMEOUT', '5000') || '5000', 10),
    queryTimeout: parseInt(getEnv('DB_QUERY_TIMEOUT', '30000') || '30000', 10),
    poolIdleTimeout: parseInt(getEnv('DB_POOL_IDLE_TIMEOUT', '10000') || '10000', 10),
    ssl: getEnv('DB_SSL', isProd ? 'true' : 'false') === 'true',
    databaseUrl: getEnv('DATABASE_URL'),
  };

  // MQTT configuration
  const mqtt: MqttConfig = {
    brokerUrl: getEnv('MQTT_BROKER_URL', 'mqtt://localhost:1883') || 'mqtt://localhost:1883',
    clientId: getEnv('MQTT_CLIENT_ID', `ems-server-${Date.now()}`) || `ems-server-${Date.now()}`,
    username: getEnv('MQTT_USERNAME'),
    password: getEnv('MQTT_PASSWORD'),
    cleanSession: getEnv('MQTT_CLEAN_SESSION', 'true') === 'true',
    keepAlive: parseInt(getEnv('MQTT_KEEP_ALIVE', '60') || '60', 10),
    reconnectPeriod: parseInt(getEnv('MQTT_RECONNECT_PERIOD', '1000') || '1000', 10),
    connectTimeout: parseInt(getEnv('MQTT_CONNECT_TIMEOUT', '10000') || '10000', 10),
  };

  // Authentication configuration
  const auth: AuthConfig = {
    jwtSecret: getEnv('JWT_SECRET', 'ems-jwt-secret-key') || 'ems-jwt-secret-key',
    jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1d') || '1d',
    refreshTokenExpiresIn: getEnv('REFRESH_TOKEN_EXPIRES_IN', '7d') || '7d',
    passwordMinLength: parseInt(getEnv('PASSWORD_MIN_LENGTH', '8') || '8', 10),
    passwordMaxLength: parseInt(getEnv('PASSWORD_MAX_LENGTH', '128') || '128', 10),
    maxLoginAttempts: parseInt(getEnv('MAX_LOGIN_ATTEMPTS', '5') || '5', 10),
    lockoutDuration: parseInt(getEnv('LOCKOUT_DURATION', '900000') || '900000', 10), // 15 minutes
    requireEmailVerification: getEnv('REQUIRE_EMAIL_VERIFICATION', isProd ? 'true' : 'false') === 'true',
    tokenExpirationTime: parseInt(getEnv('TOKEN_EXPIRATION_TIME', '86400000') || '86400000', 10), // 24 hours
  };

  // API configuration
  const api: ApiConfig = {
    cors: {
      origin: getEnv('CORS_ORIGIN', '*') || '*',
      methods: getEnv('CORS_METHODS', 'GET,HEAD,PUT,PATCH,POST,DELETE') || 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: getEnv('CORS_ALLOWED_HEADERS', '*') || '*',
      exposedHeaders: getEnv('CORS_EXPOSED_HEADERS', '') || '',
      credentials: getEnv('CORS_CREDENTIALS', 'true') === 'true',
      maxAge: parseInt(getEnv('CORS_MAX_AGE', '86400') || '86400', 10), // 24 hours
    },
    rateLimit: {
      windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '60000') || '60000', 10), // 1 minute
      max: parseInt(getEnv('RATE_LIMIT_MAX', isDev ? '1000' : '100') || (isDev ? '1000' : '100'), 10),
      standardHeaders: getEnv('RATE_LIMIT_STANDARD_HEADERS', 'true') === 'true',
      legacyHeaders: getEnv('RATE_LIMIT_LEGACY_HEADERS', 'false') === 'true',
      message: getEnv('RATE_LIMIT_MESSAGE', 'Too many requests, please try again later.') || 'Too many requests, please try again later.',
    },
    compression: {
      level: parseInt(getEnv('COMPRESSION_LEVEL', '6') || '6', 10),
      threshold: parseInt(getEnv('COMPRESSION_THRESHOLD', '1024') || '1024', 10), // 1KB
      filter: (req, res) => {
        const contentType = res.getHeader('Content-Type') as string;
        return contentType ? /json|text|javascript|css|html/.test(contentType) : false;
      },
    },
  };

  // OpenAI configuration
  const openai: OpenAiConfig | undefined = getEnv('OPENAI_API_KEY')
    ? {
        apiKey: getEnv('OPENAI_API_KEY'),
        model: getEnv('OPENAI_MODEL', 'gpt-4o'),
        temperature: parseFloat(getEnv('OPENAI_TEMPERATURE', '0.7') || '0.7'),
        maxTokens: parseInt(getEnv('OPENAI_MAX_TOKENS', '1024') || '1024', 10),
        timeout: parseInt(getEnv('OPENAI_TIMEOUT', '30000') || '30000', 10),
      }
    : undefined;

  // Combine all configurations
  const config: Config = {
    core,
    database,
    mqtt,
    auth,
    api,
    openai,
  };

  // Log selected configuration, omitting sensitive values
  logger.debug('Application Configuration', {
    core: {
      ...core,
      sessionSecret: '[REDACTED]',
    },
    database: {
      ...database,
      databaseUrl: database.databaseUrl ? '[REDACTED]' : undefined,
    },
    mqtt: {
      ...mqtt,
      password: mqtt.password ? '[REDACTED]' : undefined,
    },
    auth: {
      ...auth,
      jwtSecret: '[REDACTED]',
    },
    api: {
      ...api,
    },
    openai: openai
      ? {
          ...openai,
          apiKey: '[REDACTED]',
        }
      : undefined,
  });

  return config;
}

// Export a singleton configuration instance
export const config = getConfig();