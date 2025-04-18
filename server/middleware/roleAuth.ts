import { Request, Response, NextFunction } from 'express';
import { UserRoleSchema } from '@shared/schema';

/**
 * Role-based authorization middleware
 * Restricts access to routes based on user roles
 * 
 * @param allowedRoles Array of roles that are allowed to access the route
 * @returns Middleware function that checks if the user has the required role
 */
export function requireRole(allowedRoles: typeof UserRoleSchema._type[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role as typeof UserRoleSchema._type;
    
    // Always allow admins (they can do everything)
    if (userRole === 'admin') {
      return next();
    }
    
    // Check if the user's role is in the allowed roles
    if (userRole && allowedRoles.includes(userRole)) {
      return next();
    }
    
    // User doesn't have the required role
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

/**
 * Partner access middleware
 * Ensures that partners can only access their own data
 * 
 * @param paramName The name of the parameter containing the site or partner ID
 * @param type 'site' or 'partner' - determines what to check
 * @returns Middleware function that checks if the user has access to the requested resource
 */
export function requirePartnerAccess(paramName: string, type: 'site' | 'partner' = 'partner') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First check authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const userPartnerId = req.user.partnerId;
    
    // Admins have access to everything
    if (userRole === 'admin') {
      return next();
    }
    
    // Get the requested resource ID
    const resourceId = parseInt(req.params[paramName], 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid ID parameter' });
    }
    
    // If we're checking partner access directly
    if (type === 'partner') {
      if (resourceId === userPartnerId) {
        return next();
      }
      return res.status(403).json({ message: 'Insufficient permissions for this partner' });
    }
    
    // For site access, we need to check if the site belongs to the user's partner
    if (type === 'site') {
      try {
        const site = await req.app.locals.storage.getSite(resourceId);
        if (!site) {
          return res.status(404).json({ message: 'Site not found' });
        }
        
        // Check if the site belongs to the user's partner
        if (site.partnerId === userPartnerId) {
          return next();
        }
        
        return res.status(403).json({ message: 'Insufficient permissions for this site' });
      } catch (error) {
        console.error('Error checking site access:', error);
        return res.status(500).json({ message: 'Error checking site access' });
      }
    }
    
    // Shouldn't get here but just in case
    return res.status(500).json({ message: 'Invalid authorization check type' });
  };
}

/**
 * Device access middleware
 * Ensures that users can only access devices that belong to their sites
 * 
 * @param paramName The name of the parameter containing the device ID
 * @returns Middleware function that checks if the user has access to the requested device
 */
export function requireDeviceAccess(paramName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First check authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const userPartnerId = req.user.partnerId;
    
    // Admins have access to everything
    if (userRole === 'admin') {
      return next();
    }
    
    // Get the requested device ID
    const deviceId = parseInt(req.params[paramName], 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    try {
      // Get the device
      const device = await req.app.locals.storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ message: 'Device not found' });
      }
      
      // Get the site the device belongs to
      const site = await req.app.locals.storage.getSite(device.siteId);
      if (!site) {
        return res.status(404).json({ message: 'Site not found' });
      }
      
      // Check if the site belongs to the user's partner
      if (site.partnerId === userPartnerId) {
        return next();
      }
      
      return res.status(403).json({ message: 'Insufficient permissions for this device' });
    } catch (error) {
      console.error('Error checking device access:', error);
      return res.status(500).json({ message: 'Error checking device access' });
    }
  };
}

/**
 * Admin role authorization middleware
 * Only allows users with the 'admin' role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Manager role authorization middleware
 * Allows users with 'admin', 'partner_admin', or 'manager' roles
 */
export const requireManager = requireRole(['admin', 'partner_admin', 'manager']);