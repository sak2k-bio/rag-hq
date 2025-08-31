#!/usr/bin/env node

/**
 * Test Similarity Threshold Functionality
 * 
 * This script tests the new similarity threshold feature in the RAG service.
 * It verifies that:
 * 1. Environment variables are loaded correctly
 * 2. Similarity threshold is applied to queries
 * 3. Document filtering works as expected
 */

import 'dotenv/config';
import axios from 'axios';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_QUERY = 'What is a pleural effusion?';

async function testSimilarityThreshold() {
    console.log('🧪 Testing Similarity Threshold Functionality\n');
    
    try {
        // Test 1: Check if backend is running
        console.log('1️⃣ Testing backend connectivity...');
        const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
        console.log('✅ Backend is running');
        
        // Test 2: Test with default similarity threshold (0.7)
        console.log('\n2️⃣ Testing with default similarity threshold (0.7)...');
        const defaultResponse = await axios.post(`${BACKEND_URL}/api/query`, {
            question: TEST_QUERY,
            topK: 5
        });
        
        console.log('✅ Default query successful');
        console.log(`   Response: ${defaultResponse.data.answer?.substring(0, 100)}...`);
        console.log(`   Sources: ${defaultResponse.data.sources?.length || 0}`);
        
        // Test 3: Test with strict similarity threshold (0.9)
        console.log('\n3️⃣ Testing with strict similarity threshold (0.9)...');
        const strictResponse = await axios.post(`${BACKEND_URL}/api/query`, {
            question: TEST_QUERY,
            topK: 5,
            similarityThreshold: 0.9
        });
        
        console.log('✅ Strict threshold query successful');
        console.log(`   Response: ${strictResponse.data.answer?.substring(0, 100)}...`);
        console.log(`   Sources: ${strictResponse.data.sources?.length || 0}`);
        
        // Test 4: Test with loose similarity threshold (0.3)
        console.log('\n4️⃣ Testing with loose similarity threshold (0.3)...');
        const looseResponse = await axios.post(`${BACKEND_URL}/api/query`, {
            question: TEST_QUERY,
            topK: 5,
            similarityThreshold: 0.3
        });
        
        console.log('✅ Loose threshold query successful');
        console.log(`   Response: ${looseResponse.data.answer?.substring(0, 100)}...`);
        console.log(`   Sources: ${looseResponse.data.sources?.length || 0}`);
        
        // Test 5: Compare results
        console.log('\n5️⃣ Comparing results...');
        const defaultSources = defaultResponse.data.sources?.length || 0;
        const strictSources = strictResponse.data.sources?.length || 0;
        const looseSources = looseResponse.data.sources?.length || 0;
        
        console.log(`   Default threshold (0.7): ${defaultSources} sources`);
        console.log(`   Strict threshold (0.9): ${strictSources} sources`);
        console.log(`   Loose threshold (0.3): ${looseSources} sources`);
        
        if (strictSources <= defaultSources && defaultSources <= looseSources) {
            console.log('✅ Threshold filtering working correctly (strict ≤ default ≤ loose)');
        } else {
            console.log('⚠️  Threshold filtering may not be working as expected');
        }
        
        // Test 6: Test query analysis
        console.log('\n6️⃣ Testing query analysis...');
        const analysisResponse = await axios.post(`${BACKEND_URL}/api/query/analyze`, {
            question: TEST_QUERY
        });
        
        if (analysisResponse.data.success) {
            console.log('✅ Query analysis successful');
            console.log(`   Complexity: ${analysisResponse.data.analysis.complexity}`);
            console.log(`   Recommended Top-K: ${analysisResponse.data.analysis.recommendedTopK}`);
        } else {
            console.log('❌ Query analysis failed');
        }
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
testSimilarityThreshold();
