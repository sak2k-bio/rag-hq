#!/usr/bin/env node

/**
 * Test API Similarity Threshold Reception
 * 
 * This script tests if the API endpoints are properly receiving
 * and using the similarity threshold parameter.
 */

import 'dotenv/config';
import axios from 'axios';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function testThresholdAPI() {
    console.log('🧪 Testing API Similarity Threshold Reception\n');
    
    try {
        // Test 1: Check if backend is running
        console.log('1️⃣ Testing backend connectivity...');
        const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
        console.log('✅ Backend is running');
        
        // Test 2: Test query endpoint with similarity threshold
        console.log('\n2️⃣ Testing query endpoint with similarity threshold...');
        const queryResponse = await axios.post(`${BACKEND_URL}/api/query`, {
            question: 'What is a pleural effusion?',
            topK: 5,
            similarityThreshold: 0.9
        });
        
        console.log('✅ Query endpoint successful');
        console.log(`   Response: ${queryResponse.data.answer?.substring(0, 100)}...`);
        console.log(`   Sources: ${queryResponse.data.sources?.length || 0}`);
        
        // Test 3: Test chat endpoint with similarity threshold
        console.log('\n3️⃣ Testing chat endpoint with similarity threshold...');
        const chatResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
            messages: [
                { role: 'user', content: 'What is a pleural effusion?' }
            ],
            topK: 5,
            similarityThreshold: 0.8
        });
        
        console.log('✅ Chat endpoint successful');
        console.log(`   Response: ${chatResponse.data.answer?.substring(0, 100)}...`);
        console.log(`   Sources: ${chatResponse.data.sources?.length || 0}`);
        
        // Test 4: Test with different threshold values
        console.log('\n4️⃣ Testing different threshold values...');
        const thresholds = [0.3, 0.7, 0.9];
        
        for (const threshold of thresholds) {
            console.log(`   Testing threshold: ${threshold}`);
            const response = await axios.post(`${BACKEND_URL}/api/query`, {
                question: 'What is a pleural effusion?',
                topK: 5,
                similarityThreshold: threshold
            });
            
            console.log(`     Sources: ${response.data.sources?.length || 0}`);
        }
        
        console.log('\n🎉 All API tests completed successfully!');
        console.log('\n💡 Check the backend logs to see if similarityThreshold is being received and used.');
        
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
testThresholdAPI();
