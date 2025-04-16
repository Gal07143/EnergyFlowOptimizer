import { Request, Response } from 'express';
import { storage } from '../storage';
import { initializeEmailService, generateVerificationCode, sendVerificationEmail, sendWelcomeEmail } from '../services/emailService';
import { z } from 'zod';
import crypto from 'crypto';
import { fromZodError } from 'zod-validation-error';

// If we have SendGrid API Key, initialize the email service
if (process.env.SENDGRID_API_KEY) {
  initializeEmailService(process.env.SENDGRID_API_KEY);
}

// Schemas for validation
const verifyEmailSchema = z.object({
  userId: z.number(),
  code: z.string().length(6)
});

const resendVerificationSchema = z.object({
  email: z.string().email()
});

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { userId, code } = verifyEmailSchema.parse(req.body);
    
    const verified = await storage.verifyEmail(userId, code);
    
    if (!verified) {
      return res.status(400).json({ 
        message: 'Invalid verification code or code has expired.' 
      });
    }
    
    // Get user for welcome email
    const user = await storage.getUser(userId);
    
    if (user && user.email) {
      // Send welcome email
      await sendWelcomeEmail(user.email, user.username);
    }
    
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Don't reveal that email doesn't exist for security
      return res.status(200).json({ 
        message: 'If your email is registered, a new verification code has been sent.' 
      });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Email is already verified.' 
      });
    }
    
    // Generate a new verification code
    const verificationCode = generateVerificationCode();
    
    // Save the verification code to the user record
    await storage.setVerificationCode(user.id, verificationCode);
    
    // Send the verification email
    await sendVerificationEmail(email, verificationCode);
    
    res.status(200).json({ 
      message: 'If your email is registered, a new verification code has been sent.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.error('Error resending verification code:', error);
    res.status(500).json({ message: 'Failed to resend verification code' });
  }
};

export const checkEmailVerification = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const isVerified = await storage.isEmailVerified(req.user.id);
    
    res.status(200).json({ verified: isVerified });
  } catch (error) {
    console.error('Error checking email verification:', error);
    res.status(500).json({ message: 'Failed to check email verification status' });
  }
};