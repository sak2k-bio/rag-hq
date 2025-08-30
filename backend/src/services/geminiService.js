import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';

class GeminiService {
  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = 'gemini-1.5-flash';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  // Generate a response using the Gemini model
  async generateResponse(prompt, context = '', options = {}) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt provided');
      }

      const generationConfig = {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || 2048,
      };

      // Prepare the chat history if provided
      const chat = this.model.startChat({
        generationConfig,
        history: options.chatHistory || [],
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      });

      // Add context if provided
      const fullPrompt = context 
        ? `Context: ${context}\n\nQuestion: ${prompt}`
        : prompt;

      logger.debug(`Sending prompt to Gemini: ${fullPrompt.substring(0, 200)}...`);
      
      const result = await chat.sendMessage(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      logger.debug(`Received response from Gemini (${text.length} chars)`);
      
      return {
        text,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };
      
    } catch (error) {
      logger.error(`Error in Gemini response generation: ${error.message}`);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  // Generate a response using RAG context
  async generateRAGResponse(query, contextChunks, options = {}) {
    try {
      if (!query || !Array.isArray(contextChunks) || contextChunks.length === 0) {
        throw new Error('Invalid query or context chunks');
      }

      // Format the context for the prompt
      const formattedContext = contextChunks
        .map((chunk, index) => `Context ${index + 1}: ${chunk.text}`)
        .join('\n\n');

      const systemPrompt = `You are a helpful AI assistant. Use the following context to answer the user's question. 
If the context doesn't contain enough information, say so. Be concise and accurate.\n\nContext:\n${formattedContext}`;

      return this.generateResponse(query, systemPrompt, options);
      
    } catch (error) {
      logger.error(`Error in RAG response generation: ${error.message}`);
      throw new Error(`RAG response generation failed: ${error.message}`);
    }
  }
}

// Export a singleton instance
export default new GeminiService();
