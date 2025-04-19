/**
 * Error Handling Module for Energy Management System
 * 
 * This module provides standardized error classes and handling
 * to ensure consistent error responses across the EMS.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Base API Error class
 */
export class APIError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    
    // This is necessary for proper inheritance with built-in objects
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * Convert to standard response format
   */
  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * 400 Bad Request error
 */
export class BadRequestError extends APIError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST', details?: any) {
    super(message, 400, code, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized error
 */
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED', details?: any) {
    super(message, 401, code, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden error
 */
export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN', details?: any) {
    super(message, 403, code, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found error
 */
export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND', details?: any) {
    super(message, 404, code, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict error
 */
export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 429 Too Many Requests error
 */
export class TooManyRequestsError extends APIError {
  constructor(message: string = 'Too many requests', code: string = 'TOO_MANY_REQUESTS', details?: any) {
    super(message, 429, code, details);
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends APIError {
  constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR', details?: any) {
    super(message, 500, code, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 503 Service Unavailable error
 */
export class ServiceUnavailableError extends APIError {
  constructor(message: string = 'Service unavailable', code: string = 'SERVICE_UNAVAILABLE', details?: any) {
    super(message, 503, code, details);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Global error handler middleware for Express
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`Error processing request: ${req.method} ${req.path}`, err);

  // Handle APIError instances
  if (err instanceof APIError) {
    res.status(err.status).json(err.toResponse());
    return;
  }

  // Handle validation errors
  if (err.name === 'ZodError') {
    const badRequest = new BadRequestError('Validation error', 'VALIDATION_ERROR', err);
    res.status(badRequest.status).json(badRequest.toResponse());
    return;
  }

  // Handle other known error types
  if (err.name === 'SyntaxError') {
    const badRequest = new BadRequestError('Invalid JSON', 'INVALID_JSON');
    res.status(badRequest.status).json(badRequest.toResponse());
    return;
  }

  // Handle database errors
  if (err.name === 'PgError' || err.name === 'PostgresError' || err.name === 'QueryFailedError') {
    const serverError = new InternalServerError('Database error', 'DATABASE_ERROR');
    res.status(serverError.status).json(serverError.toResponse());
    return;
  }

  // Default to 500 Internal Server Error for unhandled errors
  const serverError = new InternalServerError();
  res.status(serverError.status).json(serverError.toResponse());
}

/**
 * Async route handler wrapper for Express
 * This wraps async route handlers to properly catch and forward errors to the error handler
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}