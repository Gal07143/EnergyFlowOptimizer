import { ZodError } from 'zod';

/**
 * Format Zod validation errors for API responses
 * 
 * @param error ZodError object
 * @returns Formatted error object with field paths and messages
 */
export function formatZodError(error: ZodError) {
  return error.errors.reduce((acc, err) => {
    const path = err.path.join('.');
    return {
      ...acc,
      [path]: err.message
    };
  }, {});
}