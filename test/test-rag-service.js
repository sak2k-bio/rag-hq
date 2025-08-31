import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the RAG service
const ragModule = await import(join(__dirname, '../src/services/ragService.js'));
const RAGService = ragModule.default;

async function testRAGService() {
  try {
    console.log('Initializing RAG service...');
    const ragService = new RAGService();
    
    console.log('RAG service initialized successfully');
    
    // Test with a simple query
    console.log('\nTesting simple query...');
    const simpleResult = await ragService.query('What is a pleural effusion?');
    console.log('Simple query result:', simpleResult);
    
    // Test with conversation history
    console.log('\nTesting query with history...');
    const historyResult = await ragService.queryWithHistory(
      'What are the symptoms?',
      [
        { role: 'user', content: 'What is a pleural effusion?' },
        { role: 'assistant', content: 'A pleural effusion is...' }
      ]
    );
    console.log('History query result:', historyResult);
    
  } catch (error) {
    console.error('Error testing RAG service:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testRAGService();
