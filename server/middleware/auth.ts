/**
 * Authentication Middleware
 * 
 * Provides authentication and role-based authorization for API routes.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if the user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
}

/**
 * Middleware to check if the user has one of the required roles
 * @param roles Array of allowed roles
 */
export function hasRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    next();
  };
}