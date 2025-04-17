/**
 * Validation Middleware
 * 
 * Provides request validation using express-validator.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Handles validation errors from express-validator
 * Returns 400 Bad Request with validation errors if any
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}