#!/usr/bin/env node

/**
 * Test script to send a single point to Qdrant and debug the upsert issue
 */

import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import crypto from 'node:crypto';

// Configuration
const {
  QDRANT_URL = 'http://localhost:6333',
  QDRANT_COLLECTION = 'pulmo',
  GOOGLE_API_KEY
} = process.env;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY is required in .env file');
  process.exit(1);
}

// Initialize clients
const qdrant = new QdrantClient({ url: QDRANT_URL });
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  model: 'embedding-001',
});

async function testQdrantUpsert() {
  try {
    console.log('🧪 Testing Qdrant upsert with single point...');
    
    // Generate a test embedding
    const testText = "This is a test document for pulmonary medicine.";
    console.log(`📝 Test text: "${testText}"`);
    
    const embedding = await embeddings.embedQuery(testText);
    console.log(`✅ Embedding generated: ${embedding.length} dimensions`);
    
    // Create a test point
    const testPoint = {
      id: crypto.createHash('sha1').update(`test-file|0`).digest('hex'),
      vector: embedding,
      payload: {
        source: 'test-file.pdf',
        chunk_index: 0,
        text: testText,
        file_type: 'pdf',
        total_chunks: 1
      }
    };
    
    console.log('📊 Test point structure:');
    console.log(`  ID: ${testPoint.id}`);
    console.log(`  Vector length: ${testPoint.vector.length}`);
    console.log(`  Payload keys: ${Object.keys(testPoint.payload).join(', ')}`);
    
    // Try to upsert the point
    console.log('\n🔄 Attempting to upsert to Qdrant...');
    
    const result = await qdrant.upsert(QDRANT_COLLECTION, {
      wait: true,
      points: [testPoint]
    });
    
    console.log('✅ Upsert successful!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Upsert failed with error:');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Response:', error.response);
    
    // Try to get more details about the error
    if (error.response) {
      try {
        const errorDetails = await error.response.text();
        console.error('Error details:', errorDetails);
      } catch (e) {
        console.error('Could not read error response:', e.message);
      }
    }
  }
}

// Run the test
testQdrantUpsert();
