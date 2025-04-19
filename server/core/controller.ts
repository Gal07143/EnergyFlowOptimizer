/**
 * Base Controller for Energy Management System
 * 
 * This module provides a base controller class for standardizing API responses,
 * error handling, and validation across all controllers.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  BadRequestError, 
  NotFoundError, 
  InternalServerError,
  asyncHandler
} from './errors';
import { logger } from './logger';

/**
 * Base controller class with standardized methods for handling HTTP requests
 */
export abstract class BaseController {
  /**
   * Send a standardized success response
   */
  protected sendSuccess(res: Response, data: any = {}, status: number = 200): void {
    res.status(status).json(data);
  }

  /**
   * Send a standardized created response
   */
  protected sendCreated(res: Response, data: any = {}): void {
    this.sendSuccess(res, data, 201);
  }

  /**
   * Send a standardized no content response
   */
  protected sendNoContent(res: Response): void {
    res.status(204).end();
  }

  /**
   * Send a standardized error response
   */
  protected sendError(res: Response, error: Error): void {
    // If it's already an APIError, let the error middleware handle it
    if (error.name.includes('Error')) {
      throw error;
    }
    
    // Otherwise, wrap it as an InternalServerError
    throw new InternalServerError(error.message, 'INTERNAL_ERROR', error);
  }

  /**
   * Create an async route handler with error handling
   */
  protected createHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return asyncHandler(handler.bind(this));
  }

  /**
   * Validate request body against a schema and return the parsed data
   */
  protected validateBody<T>(req: Request, schema: z.ZodType<T>): T {
    try {
      return schema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError(
          'Invalid request body',
          'VALIDATION_ERROR',
          error.errors
        );
      }
      throw error;
    }
  }

  /**
   * Validate request parameters against a schema and return the parsed data
   */
  protected validateParams<T>(req: Request, schema: z.ZodType<T>): T {
    try {
      return schema.parse(req.params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError(
          'Invalid request parameters',
          'VALIDATION_ERROR',
          error.errors
        );
      }
      throw error;
    }
  }

  /**
   * Validate request query against a schema and return the parsed data
   */
  protected validateQuery<T>(req: Request, schema: z.ZodType<T>): T {
    try {
      return schema.parse(req.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError(
          'Invalid query parameters',
          'VALIDATION_ERROR',
          error.errors
        );
      }
      throw error;
    }
  }

  /**
   * Get an entity by ID or throw a NotFoundError
   */
  protected async getEntityOrFail<T>(
    entityName: string,
    id: number | string,
    finder: (id: number | string) => Promise<T | null | undefined>
  ): Promise<T> {
    const entity = await finder(id);
    if (!entity) {
      throw new NotFoundError(`${entityName} with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Get a resource or return null (without throwing)
   */
  protected async getEntityOrNull<T>(
    id: number | string,
    finder: (id: number | string) => Promise<T | null | undefined>
  ): Promise<T | null> {
    try {
      const entity = await finder(id);
      return entity || null;
    } catch (error) {
      logger.error(`Error getting entity with ID ${id}`, error);
      return null;
    }
  }
}