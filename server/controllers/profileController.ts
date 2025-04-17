import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { UserRoleSchema } from '@shared/schema';
import { hashPassword, comparePasswords } from '../auth';

// Schema for updating profile information
const updateProfileSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional(),
  siteId: z.number().optional(),
});

// Schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, { message: 'Current password is required' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Password confirmation is required' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Get the current user's profile
 */
export const getProfile = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Return the user information (excluding the password)
    const { password, ...userWithoutPassword } = req.user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Failed to fetch profile information' });
  }
};

/**
 * Update the current user's profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Validate request body against schema
    const validatedData = updateProfileSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      const errorMessage = fromZodError(validatedData.error).message;
      return res.status(400).json({ message: errorMessage });
    }

    // Check if username is already taken (if username is being updated)
    if (validatedData.data.username && validatedData.data.username !== req.user.username) {
      const existingUser = await storage.getUserByUsername(validatedData.data.username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    // Check if email is already taken (if email is being updated)
    if (validatedData.data.email && validatedData.data.email !== req.user.email) {
      const existingUser = await storage.getUserByEmail(validatedData.data.email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    // If email is being changed, mark it as not verified
    const updateData: any = { ...validatedData.data };
    if (updateData.email && updateData.email !== req.user.email) {
      updateData.isEmailVerified = false;
    }

    // Update the user profile
    const updatedUser = await storage.updateUser(req.user.id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the updated user (excluding the password)
    const { password, ...userWithoutPassword } = updatedUser;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Failed to update profile information' });
  }
};

/**
 * Change the current user's password
 */
export const changePassword = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Validate request body against schema
    const validatedData = changePasswordSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      const errorMessage = fromZodError(validatedData.error).message;
      return res.status(400).json({ message: errorMessage });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePasswords(
      validatedData.data.currentPassword,
      req.user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(validatedData.data.newPassword);

    // Update the user's password
    const updatedUser = await storage.updateUser(req.user.id, { password: hashedPassword });
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'Failed to change password' });
  }
};