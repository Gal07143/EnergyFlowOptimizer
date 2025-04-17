import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { UserRoleSchema } from '@shared/schema';
import { hashPassword, comparePasswords } from '../auth';

// Schema for updating profile information
const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  siteId: z.number().optional(),
});

// Schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Get the current user's profile information
 */
export const getProfile = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information
    const { password, verificationCode, verificationCodeExpiry, ...profileData } = user;
    
    res.status(200).json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

/**
 * Update user profile information
 */
export const updateProfile = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const userId = req.user.id;
    const updateData = updateProfileSchema.parse(req.body);
    
    // If the username is being changed, check if it's already taken
    if (updateData.username) {
      const existingUser = await storage.getUserByUsername(updateData.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }
    
    // If the email is being changed, check if it's already taken
    if (updateData.email) {
      const existingEmail = await storage.getUserByEmail(updateData.email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // If changing email, mark as not verified and generate a new verification code
      if (req.user.email !== updateData.email) {
        // Cast to allow setting isEmailVerified
        const updatedUserData = {
          ...updateData,
          isEmailVerified: false
        } as Partial<User>;
        
        // Here we would normally send a verification email
        // For now, we just update the data with email verification flag set to false
        return await storage.updateUser(userId, updatedUserData);
      }
    }
    
    // Update the user profile
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information
    const { password, verificationCode, verificationCodeExpiry, ...profileData } = updatedUser;
    
    res.status(200).json(profileData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user profile' });
  }
};

/**
 * Change user password
 */
export const changePassword = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    // Get the current user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify the current password
    const isValid = await comparePasswords(currentPassword, user.password);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the password
    const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
    
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update password' });
    }
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};