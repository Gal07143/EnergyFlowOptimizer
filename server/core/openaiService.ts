/**
 * OpenAI Service for Energy Management System
 * 
 * This module provides an interface to OpenAI API for the EMS,
 * handling model selection, API calls, and error handling.
 */

import OpenAI from 'openai';
import { BaseService } from './baseService';
import { config } from './config';
import { logger } from './logger';
import { ServiceUnavailableError } from './errors';

/**
 * Input type for text-based completions
 */
export interface CompletionInput {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Input type for image generation
 */
export interface ImageGenerationInput {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

/**
 * OpenAI service for interacting with OpenAI API
 */
export class OpenAiService extends BaseService {
  private client: OpenAI | null = null;
  private hasFailed: boolean = false;
  private hasChatModel: boolean = false;

  /**
   * Create a new OpenAI service
   */
  constructor() {
    super('openai');
  }

  /**
   * Initialize the OpenAI service
   */
  protected async onInitialize(): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY || config.openai?.apiKey;
    
    if (!apiKey) {
      logger.warn('OpenAI API key not provided, service will be disabled');
      this.hasFailed = true;
      return;
    }

    try {
      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey,
        timeout: 30000 // 30 seconds
      });
      
      // Verify API key and model availability
      await this.verifyApiKey();
      
      logger.info('OpenAI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI service', error);
      this.hasFailed = true;
    }
  }

  /**
   * Verify API key and model availability
   */
  private async verifyApiKey(): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      // Check if we can list models
      const models = await this.client.models.list();
      
      // Check if gpt-4o model is available
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      this.hasChatModel = models.data.some(model => model.id === 'gpt-4o' || model.id.startsWith('gpt-4o-'));
      
      if (!this.hasChatModel) {
        logger.warn('GPT-4o not available, falling back to other models');
      }
      
      logger.info('OpenAI API key verified successfully');
    } catch (error) {
      logger.error('Failed to verify OpenAI API key', error);
      throw error;
    }
  }

  /**
   * Start the OpenAI service
   */
  protected async onStart(): Promise<void> {
    if (this.hasFailed) {
      logger.warn('OpenAI service failed to initialize, starting in limited mode');
    } else {
      logger.info('OpenAI service started successfully');
    }
  }

  /**
   * Create a text completion
   */
  public async createCompletion(input: CompletionInput): Promise<string> {
    if (!this.client || this.hasFailed) {
      throw new ServiceUnavailableError('OpenAI service is not available');
    }

    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const model = input.model || config.openai?.model || 'gpt-4o';
      const temperature = input.temperature ?? config.openai?.temperature ?? 0.7;
      const maxTokens = input.maxTokens ?? config.openai?.maxTokens ?? 1024;
      
      const messages = [];
      
      // Add system message if provided
      if (input.systemPrompt) {
        messages.push({
          role: 'system',
          content: input.systemPrompt
        });
      }
      
      // Add user message
      messages.push({
        role: 'user',
        content: input.prompt
      });
      
      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      });
      
      // Extract and return the text
      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Error creating OpenAI completion', error);
      throw new ServiceUnavailableError('Failed to generate completion', 'OPENAI_ERROR', error);
    }
  }

  /**
   * Generate an image
   */
  public async generateImage(input: ImageGenerationInput): Promise<string> {
    if (!this.client || this.hasFailed) {
      throw new ServiceUnavailableError('OpenAI service is not available');
    }

    try {
      // Generate image
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: input.prompt,
        n: input.n || 1,
        size: input.size || '1024x1024',
        quality: input.quality || 'standard',
        style: input.style || 'vivid',
        response_format: 'url'
      });
      
      // Return the first image URL
      return response.data[0].url || '';
    } catch (error) {
      logger.error('Error generating image with OpenAI', error);
      throw new ServiceUnavailableError('Failed to generate image', 'OPENAI_ERROR', error);
    }
  }

  /**
   * Analyze an image
   */
  public async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    if (!this.client || this.hasFailed) {
      throw new ServiceUnavailableError('OpenAI service is not available');
    }

    try {
      // Create a vision request
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 1024
      });
      
      // Extract and return the text
      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Error analyzing image with OpenAI', error);
      throw new ServiceUnavailableError('Failed to analyze image', 'OPENAI_ERROR', error);
    }
  }

  /**
   * Check if the service is available
   */
  public isAvailable(): boolean {
    return !this.hasFailed && this.client !== null;
  }
}

// Export a singleton instance
export const openaiService = new OpenAiService();