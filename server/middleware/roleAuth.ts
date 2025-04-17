import { Request, Response, NextFunction } from 'express';
import { UserRoleSchema } from '@shared/schema';

// Type to specify roles that have access
type AllowedRoles = Array<'admin' | 'manager' | 'viewer'>;

/**
 * Middleware to restrict access based on user roles
 * @param allowedRoles Array of roles that have access 
 */
export function requireRole(allowedRoles: AllowedRoles) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      // Validate the role using Zod schema
      const role = UserRoleSchema.parse(req.user.role);
      
      // Check if user's role is in the allowed roles list
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions to access this resource'
        });
      }
      
      // If all checks pass, proceed to the next middleware or controller
      next();
    } catch (error) {
      console.error('Role validation error:', error);
      return res.status(403).json({ message: 'Invalid role' });
    }
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware to require manager role or higher
 */
export const requireManager = requireRole(['admin', 'manager']);

/**
 * Middleware to check if user has permission to manage a specific site
 * This checks if user is an admin, manager, or if the user's siteId matches the requested siteId
 */
export function canManageSite(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const role = UserRoleSchema.parse(req.user.role);
    const userSiteId = req.user.siteId;
    const requestedSiteId = parseInt(req.params.siteId);
    
    // Admins and managers can access any site
    if (role === 'admin' || role === 'manager') {
      return next();
    }
    
    // Viewers can only access their assigned site
    if (role === 'viewer' && userSiteId === requestedSiteId) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'You do not have permission to access this site'
    });
  } catch (error) {
    console.error('Site permission check error:', error);
    return res.status(403).json({ message: 'Permission check failed' });
  }
}