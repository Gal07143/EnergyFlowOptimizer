import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateBody = (schema: z.ZodType<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        next(error);
      }
    }
  };

export const validateQuery = (schema: z.ZodType<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        next(error);
      }
    }
  };

export const validateParams = (schema: z.ZodType<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        next(error);
      }
    }
  };