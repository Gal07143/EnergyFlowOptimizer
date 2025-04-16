import { MailService } from '@sendgrid/mail';
import crypto from 'crypto';

// Initialize mail service
const mailService = new MailService();

// Will initialize later when we get the SendGrid API key
let isInitialized = false;

export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Initialize the SendGrid email service with an API key
 */
export function initializeEmailService(apiKey: string): void {
  if (!apiKey) {
    console.warn('SendGrid API key not provided. Email functionality will be disabled.');
    return;
  }
  
  mailService.setApiKey(apiKey);
  isInitialized = true;
  console.log('SendGrid email service initialized');
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!isInitialized) {
    console.warn('Email service not initialized. Cannot send email.');
    return false;
  }
  
  try {
    await mailService.send({
      to: params.to,
      from: 'ems@yourdomain.com', // Replace with your verified sender
      subject: params.subject,
      text: params.text || params.subject, // Fallback to subject if text is not provided
      html: params.html || `<p>${params.text || params.subject}</p>`, // Simple HTML fallback
    });
    
    console.log(`Email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Generate a random verification code
 */
export function generateVerificationCode(): string {
  // Generate a 6-digit numeric code
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send a verification email with the verification code
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const subject = 'Verify your Energy Management System account';
  const text = `Your verification code is: ${code}. This code will expire in 30 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #333;">Energy Management System</h2>
      <p>Thank you for registering with our Energy Management System. Please verify your email address to continue.</p>
      <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <p style="font-size: 18px; margin: 0;">Your verification code is:</p>
        <h1 style="font-size: 32px; margin: 10px 0; color: #007bff;">${code}</h1>
      </div>
      <p>This code will expire in 30 minutes.</p>
      <p>If you didn't request this email, please ignore it.</p>
    </div>
  `;
  
  return await sendEmail({ to: email, subject, text, html });
}

/**
 * Send a welcome email after successful verification
 */
export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  const subject = 'Welcome to Energy Management System';
  const text = `Hello ${username}, welcome to the Energy Management System! Your account has been successfully verified.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #333;">Energy Management System</h2>
      <p>Hello ${username},</p>
      <p>Welcome to the Energy Management System! Your account has been successfully verified.</p>
      <p>You can now enjoy all the features of our platform:</p>
      <ul style="line-height: 1.6;">
        <li>Real-time monitoring of your energy assets</li>
        <li>Advanced energy optimization</li>
        <li>Detailed analytics and insights</li>
        <li>Automated energy management</li>
      </ul>
      <p>Thank you for choosing our platform!</p>
    </div>
  `;
  
  return await sendEmail({ to: email, subject, text, html });
}