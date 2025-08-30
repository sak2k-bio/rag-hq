// Test script for Dynamic Top-K functionality
import dotenv from 'dotenv';
import RAGService from './src/services/ragService.js';

// Load environment variables
dotenv.config();

async function testDynamicTopK() {
  try {
    console.log('🚀 Testing Dynamic Top-K Selection...\n');
    
    // Initialize RAG service
    const ragService = new RAGService();
    
    // Test queries of different complexities
    const testQueries = [
      "What is Python?",
      "How does machine learning work and what are the key algorithms?",
      "Explain the difference between supervised and unsupervised learning with examples",
      "What are the benefits of using Docker containers in microservices architecture?",
      "Compare and contrast REST APIs vs GraphQL, including performance implications and use cases"
    ];
    
    for (const query of testQueries) {
      console.log(`📝 Query: "${query}"`);
      
      // Get analysis
      const analysis = await ragService.analyzeQuery(query);
      console.log(`   Complexity: ${analysis.analysis.complexity}`);
      console.log(`   Recommended Top-K: ${analysis.analysis.recommendedTopK}`);
      console.log(`   Reasoning: ${analysis.analysis.reasoning}`);
      
      // Test with different user Top-K values
      const userTopK = 5;
      const optimalTopK = await ragService.getOptimalTopK(query, userTopK);
      console.log(`   With user Top-K=${userTopK}: ${optimalTopK}`);
      
      const autoTopK = await ragService.getOptimalTopK(query);
      console.log(`   Auto-detected Top-K: ${autoTopK}`);
      
      console.log('   ---');
    }
    
    console.log('✅ Dynamic Top-K testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing Dynamic Top-K:', error.message);
  }
}

// Run the test
testDynamicTopK();
