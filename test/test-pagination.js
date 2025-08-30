#!/usr/bin/env node

/**
 * Test script to verify pagination implementation
 * This script tests the new listDocuments method with proper pagination
 */

import 'dotenv/config';
import axios from 'axios';

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';

async function testPagination() {
  console.log('🧪 Testing pagination implementation...\n');

  try {
    // Test 1: Get collection statistics
    console.log('1️⃣ Testing collection statistics endpoint...');
    const statsResponse = await axios.get(`${API_URL}/collection/stats`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.stats;
      console.log('✅ Collection stats retrieved successfully:');
      console.log(`   📊 Total Vectors: ${stats.totalVectors.toLocaleString()}`);
      console.log(`   📚 Unique Sources: ${stats.uniqueSources.toLocaleString()}`);
      console.log(`   🔢 Total Chunks: ${stats.totalChunks.toLocaleString()}`);
      console.log(`   📁 Collection Status: ${stats.exists ? 'Active' : 'Empty'}`);
    } else {
      console.log('❌ Failed to get collection stats:', statsResponse.data);
    }

    console.log('\n2️⃣ Testing documents listing with pagination...');
    const documentsResponse = await axios.get(`${API_URL}/documents`);
    
    if (documentsResponse.data.success) {
      const result = documentsResponse.data;
      console.log('✅ Documents retrieved successfully:');
      console.log(`   📚 Unique Documents: ${result.documents.length.toLocaleString()}`);
      console.log(`   🔢 Total Chunks: ${result.totalChunks.toLocaleString()}`);
      
      // Check if we're getting all documents
      if (statsResponse.data.success) {
        const stats = statsResponse.data.stats;
        const expectedSources = stats.uniqueSources;
        const actualSources = result.documents.length;
        
        if (actualSources >= expectedSources * 0.9) { // Allow 10% variance for estimation
          console.log(`   ✅ Pagination working: Retrieved ${actualSources} sources (expected ~${expectedSources})`);
        } else {
          console.log(`   ⚠️  Pagination may have issues: Retrieved ${actualSources} sources (expected ~${expectedSources})`);
        }
      }
      
      // Show first few documents
      console.log('\n   📋 Sample documents:');
      result.documents.slice(0, 5).forEach((doc, i) => {
        console.log(`      ${i + 1}. ${doc.title} (${doc.chunks} chunks)`);
      });
      
      if (result.documents.length > 5) {
        console.log(`      ... and ${result.documents.length - 5} more`);
      }
    } else {
      console.log('❌ Failed to get documents:', documentsResponse.data);
    }

    // Test 3: Performance test for large collections
    if (statsResponse.data.success && statsResponse.data.stats.totalVectors > 1000) {
      console.log('\n3️⃣ Testing performance with large collection...');
      const startTime = Date.now();
      
      const perfResponse = await axios.get(`${API_URL}/documents`);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (perfResponse.data.success) {
        console.log(`   ⚡ Retrieved ${perfResponse.data.documents.length} documents in ${duration}ms`);
        console.log(`   📊 Performance: ${(perfResponse.data.documents.length / (duration / 1000)).toFixed(1)} docs/second`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testPagination().catch(console.error);
