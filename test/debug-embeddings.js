#!/usr/bin/env node

/**
 * Debug script to test embedding generation and format
 */

import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// Configuration
const { GOOGLE_API_KEY } = process.env;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY is required in .env file');
  process.exit(1);
}

// Initialize Google Gemini embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  model: 'embedding-001',
});

async function testEmbeddings() {
  try {
    console.log('🧪 Testing embedding generation...');
    
    // Test with a simple text
    const testText = "This is a test document for pulmonary medicine.";
    console.log(`📝 Test text: "${testText}"`);
    
    // Generate embedding
    console.log('🔄 Generating embedding...');
    const embedding = await embeddings.embedQuery(testText);
    
    console.log('✅ Embedding generated successfully!');
    console.log(`📊 Vector length: ${embedding.length}`);
    console.log(`🔢 First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
    console.log(`🔢 Last 5 values: [${embedding.slice(-5).join(', ')}]`);
    
    // Check if it's exactly 768 dimensions
    if (embedding.length === 768) {
      console.log('✅ Vector dimension is correct (768)');
    } else {
      console.log(`❌ Vector dimension mismatch! Expected 768, got ${embedding.length}`);
    }
    
    // Check data types
    const allNumbers = embedding.every(val => typeof val === 'number');
    const hasNaN = embedding.some(val => isNaN(val));
    const hasInfinity = embedding.some(val => !isFinite(val));
    
    console.log(`🔍 Data type check: ${allNumbers ? '✅ All values are numbers' : '❌ Some values are not numbers'}`);
    console.log(`🔍 NaN check: ${hasNaN ? '❌ Contains NaN values' : '✅ No NaN values'}`);
    console.log(`🔍 Infinity check: ${hasInfinity ? '❌ Contains infinite values' : '✅ No infinite values'}`);
    
    // Test batch embedding
    console.log('\n🧪 Testing batch embedding...');
    const testTexts = [
      "First test document about lungs.",
      "Second test document about breathing.",
      "Third test document about pulmonary function."
    ];
    
    const batchEmbeddings = await embeddings.embedDocuments(testTexts);
    console.log(`✅ Batch embeddings generated: ${batchEmbeddings.length} vectors`);
    
    batchEmbeddings.forEach((emb, idx) => {
      console.log(`  Vector ${idx + 1}: ${emb.length} dimensions`);
    });
    
  } catch (error) {
    console.error('❌ Error during embedding test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testEmbeddings();
