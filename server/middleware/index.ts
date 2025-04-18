import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware to require a user to be authenticated
 */
export const requireAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    console.log(`${req.path} - isAuthenticated: false`);
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

/**
 * Middleware that validates request parameters against a Zod schema
 */
export const validateParams = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request parameters',
          errors: error.errors 
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware that validates request body against a Zod schema
 */
export const validateBody = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request body',
          errors: error.errors 
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware that validates request query against a Zod schema
 */
export const validateQuery = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid query parameters',
          errors: error.errors 
        });
      }
      next(error);
    }
  };
};