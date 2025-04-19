import { Request, Response } from 'express';
import { insertPartnerSchema } from '@shared/schema';
import { ZodError } from 'zod';

/**
 * Format Zod validation errors for API responses
 * 
 * @param error ZodError object
 * @returns Formatted error object with field paths and messages
 */
function formatZodError(error: ZodError) {
  return error.errors.reduce((acc, err) => {
    const path = err.path.join('.');
    return {
      ...acc,
      [path]: err.message
    };
  }, {});
}

// Define typed User interface to help with type checking
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: string;
    partnerId?: number;
    [key: string]: any;
  }
}

/**
 * Get all partner organizations
 * Admin only can see all partners
 */
export async function getAllPartners(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can view all partners
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions to view all partners' });
    }
    
    const partners = await req.app.locals.storage.getPartners();
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ message: 'Failed to fetch partners' });
  }
}

/**
 * Get a partner organization by ID
 * Admin can view any, partner users can only view their own
 */
export async function getPartnerById(req: AuthenticatedRequest, res: Response) {
  try {
    const partnerId = parseInt(req.params.id, 10);
    
    // For non-admin users, restrict access to their own partner
    if (req.user.role !== 'admin' && req.user.partnerId !== partnerId) {
      return res.status(403).json({ message: 'Insufficient permissions to view this partner' });
    }
    
    const partner = await req.app.locals.storage.getPartner(partnerId);
    
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    
    res.json(partner);
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({ message: 'Failed to fetch partner' });
  }
}

/**
 * Get current user's partner organization
 */
export async function getCurrentPartner(req: AuthenticatedRequest, res: Response) {
  try {
    // If no partnerId, return 404
    if (!req.user.partnerId) {
      return res.status(404).json({ message: 'No partner organization associated with user' });
    }
    
    const partner = await req.app.locals.storage.getPartner(req.user.partnerId);
    
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    
    res.json(partner);
  } catch (error) {
    console.error('Error fetching current partner:', error);
    res.status(500).json({ message: 'Failed to fetch current partner' });
  }
}

/**
 * Create a new partner organization
 * Admin only
 */
export async function createPartner(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can create partners
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions to create partners' });
    }
    
    // Validate request body
    const validatedData = insertPartnerSchema.parse(req.body);
    
    const partner = await req.app.locals.storage.createPartner(validatedData);
    res.status(201).json(partner);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: formatZodError(error) 
      });
    }
    
    console.error('Error creating partner:', error);
    res.status(500).json({ message: 'Failed to create partner' });
  }
}

/**
 * Update a partner organization
 * Admin can update any, partner_admin can only update their own
 */
export async function updatePartner(req: AuthenticatedRequest, res: Response) {
  try {
    const partnerId = parseInt(req.params.id, 10);
    
    // For non-admin users, restrict access to their own partner
    if (req.user.role !== 'admin' && req.user.partnerId !== partnerId) {
      return res.status(403).json({ message: 'Insufficient permissions to update this partner' });
    }
    
    // Additional check: only admins and partner_admins can update
    if (req.user.role !== 'admin' && req.user.role !== 'partner_admin') {
      return res.status(403).json({ message: 'Insufficient permissions to update partners' });
    }
    
    const partner = await req.app.locals.storage.getPartner(partnerId);
    
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    
    // Update the partner
    const updatedPartner = await req.app.locals.storage.updatePartner(partnerId, req.body);
    res.json(updatedPartner);
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({ message: 'Failed to update partner' });
  }
}

/**
 * Get users for a specific partner organization
 * Admin can view any, partner_admin can only view their own
 */
export async function getPartnerUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const partnerId = parseInt(req.params.id, 10);
    
    // For non-admin users, restrict access to their own partner
    if (req.user.role !== 'admin' && req.user.partnerId !== partnerId) {
      return res.status(403).json({ message: 'Insufficient permissions to view users for this partner' });
    }
    
    const users = await req.app.locals.storage.getUsersByPartner(partnerId);
    
    // Remove sensitive information like passwords
    const sanitizedUsers = users.map((user: { password: string; [key: string]: any }) => {
      const { password, ...sanitized } = user;
      return sanitized;
    });
    
    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching partner users:', error);
    res.status(500).json({ message: 'Failed to fetch partner users' });
  }
}

/**
 * Get sites for a specific partner organization
 * Admin can view any, partner users can only view their own
 */
export async function getPartnerSites(req: AuthenticatedRequest, res: Response) {
  try {
    const partnerId = parseInt(req.params.id, 10);
    
    // For non-admin users, restrict access to their own partner
    if (req.user.role !== 'admin' && req.user.partnerId !== partnerId) {
      return res.status(403).json({ message: 'Insufficient permissions to view sites for this partner' });
    }
    
    const sites = await req.app.locals.storage.getSitesByPartner(partnerId);
    res.json(sites);
  } catch (error) {
    console.error('Error fetching partner sites:', error);
    res.status(500).json({ message: 'Failed to fetch partner sites' });
  }
}

export default {
  getAllPartners,
  getPartnerById,
  getCurrentPartner,
  createPartner,
  updatePartner,
  getPartnerUsers,
  getPartnerSites
};