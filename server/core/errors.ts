/**
 * Error Handling for Energy Management System
 * 
 * This module provides standardized error classes and middleware for the EMS,
 * ensuring consistent error handling and responses across the application.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Base API Error class
 */
export class APIError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Captures the stack trace, excluding the constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends APIError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST', details?: any) {
    super(message, 400, code, details);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED', details?: any) {
    super(message, 401, code, details);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN', details?: any) {
    super(message, 403, code, details);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends APIError {
  constructor(message: string = 'Not found', code: string = 'NOT_FOUND', details?: any) {
    super(message, 404, code, details);
  }
}

/**
 * 409 Conflict Error
 */
export class ConflictError extends APIError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
  }
}

/**
 * 429 Too Many Requests Error
 */
export class TooManyRequestsError extends APIError {
  constructor(
    message: string = 'Too many requests',
    code: string = 'TOO_MANY_REQUESTS',
    details?: any
  ) {
    super(message, 429, code, details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends APIError {
  constructor(
    message: string = 'Internal server error',
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message, 500, code, details);
  }
}

/**
 * 503 Service Unavailable Error
 */
export class ServiceUnavailableError extends APIError {
  constructor(
    message: string = 'Service unavailable',
    code: string = 'SERVICE_UNAVAILABLE',
    details?: any
  ) {
    super(message, 503, code, details);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandlerMiddleware(
  err: Error | APIError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default values for non-API errors
  let statusCode = 500;
  let errorResponse = {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: null
  };

  // If it's our API error, use its properties
  if (err instanceof APIError) {
    statusCode = err.statusCode;
    errorResponse = {
      message: err.message,
      code: err.code,
      details: err.details || null
    };
  } else {
    // For other errors, log the stack trace but don't expose it to the client
    errorResponse.message = err.message || errorResponse.message;
  }

  // Log the error
  const logData = {
    statusCode,
    path: req.path,
    method: req.method,
    ...errorResponse
  };
  
  // Log with appropriate level based on status code
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} - ${statusCode} ${errorResponse.message}`, {
      error: err,
      request: {
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body
      },
      response: errorResponse
    });
  } else if (statusCode >= 400) {
    logger.warn(`${req.method} ${req.path} - ${statusCode} ${errorResponse.message}`, logData);
  } else {
    logger.info(`${req.method} ${req.path} - ${statusCode} ${errorResponse.message}`, logData);
  }

  // Respond with the error
  res.status(statusCode).json(errorResponse);
}