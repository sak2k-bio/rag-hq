#!/usr/bin/env node

/**
 * Test script to verify which endpoint is being called
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testEndpoints() {
  console.log('🔍 Testing API Endpoints...\n');

  try {
    // Test 1: Check if chat endpoint exists
    console.log('1️⃣ Testing /api/chat endpoint...');
    try {
      const chatResponse = await axios.post(`${API_URL}/chat`, {
        messages: [
          { role: 'user', content: 'What are pleural effusions?' },
          { role: 'assistant', content: 'Pleural effusions are...' },
          { role: 'user', content: 'How do you treat them?' }
        ],
        excludedSources: [],
        topK: 2
      });
      
      console.log('✅ /api/chat endpoint working!');
      console.log('Response:', chatResponse.data);
    } catch (error) {
      console.log('❌ /api/chat endpoint failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
    }

    // Test 2: Check if query endpoint still exists
    console.log('\n2️⃣ Testing /api/query endpoint...');
    try {
      const queryResponse = await axios.post(`${API_URL}/query`, {
        question: 'What are pleural effusions?',
        topK: 2
      });
      
      console.log('✅ /api/query endpoint still working!');
      console.log('Response:', queryResponse.data);
    } catch (error) {
      console.log('❌ /api/query endpoint failed:', error.message);
    }

    // Test 3: Check backend logs
    console.log('\n3️⃣ Backend should show "Query with history" for chat endpoint');
    console.log('   Check docker-compose logs backend for the difference');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEndpoints().catch(console.error);
