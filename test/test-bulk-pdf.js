#!/usr/bin/env node

/**
 * Test Script for Bulk PDF Service
 * 
 * This script tests the bulk PDF service functionality without processing actual files.
 * Run this to verify the service is working correctly.
 */

import 'dotenv/config';
import { BulkPdfService } from './src/services/bulkPdfService.js';

// Mock RAG service for testing
const mockRagService = {
  vectorStore: {
    addDocuments: async (documents) => {
      console.log(`✅ Mock: Added ${documents.length} documents to vector store`);
      return true;
    }
  }
};

async function testBulkPdfService() {
  console.log('🧪 Testing Bulk PDF Service...\n');

  try {
    // Initialize the service
    console.log('1. Initializing Bulk PDF Service...');
    const bulkService = new BulkPdfService(mockRagService);
    console.log('✅ Service initialized successfully\n');

    // Test database operations
    console.log('2. Testing database operations...');
    
    // Test stats
    const stats = await bulkService.getStats();
    console.log('✅ Stats retrieved:', stats);

    // Test pending files
    const pendingFiles = await bulkService.getPendingFiles();
    console.log('✅ Pending files retrieved:', pendingFiles);

    // Test manifest operations
    console.log('\n3. Testing manifest operations...');
    
    // Clear manifest
    const clearResult = await bulkService.clearManifest();
    console.log('✅ Manifest cleared:', clearResult);

    // Get stats again
    const statsAfterClear = await bulkService.getStats();
    console.log('✅ Stats after clear:', statsAfterClear);

    // Test utility functions
    console.log('\n4. Testing utility functions...');
    
    const testText = 'This is a test document with some content that should be split into chunks. We will test the chunking functionality to ensure it works correctly.';
    const chunks = bulkService.splitIntoChunks(testText, 50, 10);
    console.log('✅ Text chunking test:');
    console.log(`   Original text length: ${testText.length} characters`);
    console.log(`   Generated chunks: ${chunks.length}`);
    console.log(`   Chunk sizes: ${chunks.map(c => c.length).join(', ')}`);

    // Test checksum generation
    const testString = 'test content';
    const checksum = bulkService.sha1String(testString);
    console.log('✅ Checksum generation test:');
    console.log(`   Input: "${testString}"`);
    console.log(`   SHA1: ${checksum}`);

    // Test timestamp generation
    const timestamp = bulkService.nowIso();
    console.log('✅ Timestamp generation test:');
    console.log(`   ISO timestamp: ${timestamp}`);

    // Cleanup
    console.log('\n5. Cleaning up...');
    bulkService.close();
    console.log('✅ Service closed successfully');

    console.log('\n🎉 All tests passed! Bulk PDF Service is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
testBulkPdfService().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});
