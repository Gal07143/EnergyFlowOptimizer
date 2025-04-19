/**
 * Core module exports for Energy Management System
 * 
 * This module exports all core components of the EMS for easier imports
 */

// Service Registry and Base Service
export { ServiceRegistry, ServiceConfig, ServiceLifecycle, serviceRegistry } from './serviceRegistry';
export { BaseService } from './baseService';

// Error Handling
export {
  APIError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  errorHandlerMiddleware,
  asyncHandler
} from './errors';

// Logging
export {
  Logger,
  LogLevel,
  LogContext,
  LogEntry,
  LoggerConfig,
  ServiceLogger,
  logger
} from './logger';

// Configuration
export {
  Config,
  CoreConfig,
  DatabaseConfig,
  MqttConfig,
  AuthConfig,
  ApiConfig,
  OpenAiConfig,
  getConfig,
  config
} from './config';

// Application
export { Application, application } from './application';

// Controllers
export { BaseController } from './controller';

// Services
export {
  MqttService,
  MqttMessageHandler,
  TopicSubscription,
  mqttService
} from './mqttService';

export {
  WebSocketService,
  EnhancedWebSocket,
  WebSocketMessageHandler,
  webSocketService
} from './webSocketService';

export {
  DatabaseService,
  databaseService
} from './databaseService';

export {
  OpenAiService,
  CompletionInput,
  ImageGenerationInput,
  openaiService
} from './openaiService';