/**
 * Configuration Management Module for Energy Management System
 * 
 * This module provides standardized configuration management for the EMS,
 * supporting environment-based configuration, defaults, validation, and overrides.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Define the schema for core system configuration
 */
const CoreConfigSchema = z.object({
  env: z.enum(['development', 'test', 'production']).default('development'),
  port: z.number().int().positive().default(5000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  useColorLogs: z.boolean().default(true)
});

/**
 * Define the schema for database configuration
 */
const DatabaseConfigSchema = z.object({
  url: z.string().min(1),
  ssl: z.boolean().default(false),
  maxConnections: z.number().int().positive().default(10),
  connectionTimeout: z.number().int().positive().default(30000),
  queryTimeout: z.number().int().positive().default(5000)
});

/**
 * Define the schema for MQTT configuration
 */
const MqttConfigSchema = z.object({
  brokerUrl: z.string().min(1),
  clientId: z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
  useTls: z.boolean().default(false),
  cleanSession: z.boolean().default(true),
  keepAlive: z.number().int().positive().default(60),
  reconnectPeriod: z.number().int().nonnegative().default(1000),
  connectTimeout: z.number().int().positive().default(30000)
});

/**
 * Define the schema for authentication configuration
 */
const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(1),
  jwtExpiresIn: z.string().default('1d'),
  cookieSecret: z.string().min(1),
  cookieMaxAge: z.number().int().positive().default(86400000),
  cookieSecure: z.boolean().default(false),
  cookieSameSite: z.enum(['strict', 'lax', 'none']).default('lax')
});

/**
 * Define the schema for API configuration
 */
const ApiConfigSchema = z.object({
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().int().positive().default(60000),
    max: z.number().int().positive().default(100),
    standardHeaders: z.boolean().default(true),
    legacyHeaders: z.boolean().default(false)
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.literal('*')]).default('*'),
    credentials: z.boolean().default(true),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization'])
  })
});

/**
 * Define the schema for OpenAI integration configuration
 */
const OpenAiConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().default('gpt-4o'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(1024)
});

/**
 * Define the full configuration schema
 */
const ConfigSchema = z.object({
  core: CoreConfigSchema,
  database: DatabaseConfigSchema,
  mqtt: MqttConfigSchema,
  auth: AuthConfigSchema,
  api: ApiConfigSchema,
  openai: OpenAiConfigSchema.optional()
});

/**
 * Types derived from the schemas
 */
export type CoreConfig = z.infer<typeof CoreConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type MqttConfig = z.infer<typeof MqttConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;
export type OpenAiConfig = z.infer<typeof OpenAiConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Get appropriate configuration based on environment and merge with provided overrides
 * 
 * This function parses environment variables into appropriate configuration objects
 * using Zod for validation, applies defaults when values are missing, and overrides
 * values with those explicitly provided.
 * 
 * @param overrides Optional configuration overrides
 * @returns Validated configuration objects
 */
export function getConfig(overrides: Partial<Config> = {}): Config {
  const env = process.env.NODE_ENV || 'development';
  
  const coreConfig: CoreConfig = CoreConfigSchema.parse({
    env,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    host: process.env.HOST,
    logLevel: process.env.LOG_LEVEL,
    useColorLogs: process.env.USE_COLOR_LOGS === 'true'
  });
  
  const databaseConfig: DatabaseConfig = DatabaseConfigSchema.parse({
    url: process.env.DATABASE_URL || '',
    ssl: process.env.DATABASE_SSL === 'true',
    maxConnections: process.env.DATABASE_MAX_CONNECTIONS 
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) 
      : undefined,
    connectionTimeout: process.env.DATABASE_CONNECTION_TIMEOUT 
      ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10) 
      : undefined,
    queryTimeout: process.env.DATABASE_QUERY_TIMEOUT 
      ? parseInt(process.env.DATABASE_QUERY_TIMEOUT, 10) 
      : undefined
  });
  
  const mqttConfig: MqttConfig = MqttConfigSchema.parse({
    brokerUrl: process.env.MQTT_BROKER_URL || (env === 'development' ? 'mqtt://localhost:1883' : ''),
    clientId: process.env.MQTT_CLIENT_ID || `ems-server-${Date.now()}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    useTls: process.env.MQTT_USE_TLS === 'true',
    cleanSession: process.env.MQTT_CLEAN_SESSION !== 'false',
    keepAlive: process.env.MQTT_KEEP_ALIVE 
      ? parseInt(process.env.MQTT_KEEP_ALIVE, 10) 
      : undefined,
    reconnectPeriod: process.env.MQTT_RECONNECT_PERIOD 
      ? parseInt(process.env.MQTT_RECONNECT_PERIOD, 10) 
      : undefined,
    connectTimeout: process.env.MQTT_CONNECT_TIMEOUT 
      ? parseInt(process.env.MQTT_CONNECT_TIMEOUT, 10) 
      : undefined
  });
  
  const authConfig: AuthConfig = AuthConfigSchema.parse({
    jwtSecret: process.env.JWT_SECRET || 'development-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    cookieSecret: process.env.COOKIE_SECRET || 'development-cookie-secret',
    cookieMaxAge: process.env.COOKIE_MAX_AGE 
      ? parseInt(process.env.COOKIE_MAX_AGE, 10) 
      : undefined,
    cookieSecure: env === 'production' 
      ? process.env.COOKIE_SECURE !== 'false' 
      : process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none' || undefined
  });
  
  const apiConfig: ApiConfig = ApiConfigSchema.parse({
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      windowMs: process.env.RATE_LIMIT_WINDOW 
        ? parseInt(process.env.RATE_LIMIT_WINDOW, 10) 
        : undefined,
      max: process.env.RATE_LIMIT_MAX 
        ? parseInt(process.env.RATE_LIMIT_MAX, 10) 
        : undefined,
      standardHeaders: process.env.RATE_LIMIT_STANDARD_HEADERS !== 'false',
      legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS === 'true'
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      methods: process.env.CORS_METHODS 
        ? process.env.CORS_METHODS.split(',') 
        : undefined,
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS 
        ? process.env.CORS_ALLOWED_HEADERS.split(',') 
        : undefined
    }
  });

  const openaiEnabled = !!process.env.OPENAI_API_KEY;
  let openaiConfig: OpenAiConfig | undefined;
  
  if (openaiEnabled) {
    openaiConfig = OpenAiConfigSchema.parse({
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL,
      temperature: process.env.OPENAI_TEMPERATURE 
        ? parseFloat(process.env.OPENAI_TEMPERATURE) 
        : undefined,
      maxTokens: process.env.OPENAI_MAX_TOKENS 
        ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) 
        : undefined
    });
  }
  
  // Create the full configuration
  const config: Config = {
    core: coreConfig,
    database: databaseConfig,
    mqtt: mqttConfig,
    auth: authConfig,
    api: apiConfig,
    ...(openaiConfig ? { openai: openaiConfig } : {})
  };
  
  // Apply any overrides
  const mergedConfig = {
    ...config,
    ...overrides,
    core: { ...config.core, ...(overrides.core || {}) },
    database: { ...config.database, ...(overrides.database || {}) },
    mqtt: { ...config.mqtt, ...(overrides.mqtt || {}) },
    auth: { ...config.auth, ...(overrides.auth || {}) },
    api: { 
      ...config.api, 
      ...(overrides.api || {}),
      rateLimit: { ...config.api.rateLimit, ...(overrides.api?.rateLimit || {}) },
      cors: { ...config.api.cors, ...(overrides.api?.cors || {}) }
    },
    ...(config.openai || overrides.openai ? { 
      openai: { ...(config.openai || {}), ...(overrides.openai || {}) }
    } : {})
  };
  
  return ConfigSchema.parse(mergedConfig);
}

// Export a singleton instance with default configuration
export const config = getConfig();