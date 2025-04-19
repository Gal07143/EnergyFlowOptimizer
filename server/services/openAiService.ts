import OpenAI from "openai";

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// Singleton OpenAI service
class OpenAiService {
  private static instance: OpenAiService;
  private client: OpenAI | null = null;
  private initialized: boolean = false;

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY environment variable not set. OpenAI features will be disabled.');
      this.initialized = false;
      this.client = null;
    } else {
      this.client = openai;
      this.initialized = true;
    }
  }

  // Get singleton instance
  public static getInstance(): OpenAiService {
    if (!OpenAiService.instance) {
      OpenAiService.instance = new OpenAiService();
    }
    return OpenAiService.instance;
  }

  // Check if service is initialized
  public isInitialized(): boolean {
    return this.initialized;
  }

  // Get the OpenAI client
  public getClient(): OpenAI | null {
    if (!this.initialized) {
      return null;
    }
    return this.client;
  }

  // Basic chat completion method
  public async chatCompletion(messages: any[], model = DEFAULT_MODEL): Promise<string | null> {
    if (!this.initialized) {
      console.warn('OpenAI service not initialized. Cannot use chatCompletion.');
      return null;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI chat completion:', error);
      return null;
    }
  }

  // Chat completion with JSON output
  public async chatCompletionWithJson(messages: any[], model = DEFAULT_MODEL): Promise<any | null> {
    if (!this.initialized) {
      console.warn('OpenAI service not initialized. Cannot use chatCompletionWithJson.');
      return null;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Error calling OpenAI chat completion with JSON:', error);
      return null;
    }
  }

  // Optimization specific method for energy algorithms
  public async optimizeEnergy(
    optimizationGoal: string, 
    constraints: any, 
    data: any,
    model = DEFAULT_MODEL
  ): Promise<any | null> {
    if (!this.initialized) {
      console.warn('OpenAI service not initialized. Cannot use optimizeEnergy.');
      return null;
    }

    try {
      const messages = [
        {
          role: "system",
          content: `You are an advanced energy optimization AI specializing in creating optimal schedules for energy assets.
Your task is to analyze the provided data and constraints and create an optimal schedule for ${optimizationGoal}.
Provide your response in JSON format with detailed schedule information and explanations for your decisions.`
        },
        {
          role: "user",
          content: JSON.stringify({
            optimizationGoal,
            constraints,
            data
          })
        }
      ];

      return await this.chatCompletionWithJson(messages, model);
    } catch (error) {
      console.error('Error in optimizeEnergy:', error);
      return null;
    }
  }
}

// Export singleton getter
export const getOpenAiService = (): OpenAiService => {
  return OpenAiService.getInstance();
};