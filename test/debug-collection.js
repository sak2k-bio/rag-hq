#!/usr/bin/env node

/**
 * Debug script to test collection stats and analyze query
 * This will help us see what's happening without rebuilding containers
 */

import 'dotenv/config';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function debugCollection() {
  console.log('🔍 Debugging Collection Issues...\n');

  try {
    // Test 1: Collection Stats
    console.log('1️⃣ Testing Collection Stats...');
    const statsResponse = await axios.get(`${API_URL}/collection/stats`);
    
    if (statsResponse.data.success) {
      console.log('✅ Collection Stats Response:');
      console.log(JSON.stringify(statsResponse.data, null, 2));
    } else {
      console.log('❌ Collection Stats Failed:', statsResponse.data);
    }

    // Test 2: Analyze Query
    console.log('\n2️⃣ Testing Analyze Query...');
    const analyzeResponse = await axios.post(`${API_URL}/query/analyze`, {
      question: 'what works for pleurisy?'
    });
    
    if (analyzeResponse.data.success) {
      console.log('✅ Analyze Query Response:');
      console.log(JSON.stringify(analyzeResponse.data, null, 2));
    } else {
      console.log('❌ Analyze Query Failed:', analyzeResponse.data);
    }

    // Test 3: Direct Qdrant Check
    console.log('\n3️⃣ Testing Direct Qdrant Connection...');
    const qdrantResponse = await axios.get('http://localhost:6333/collections/pulmo');
    
    if (qdrantResponse.data) {
      console.log('✅ Direct Qdrant Response:');
      console.log(`   Points Count: ${qdrantResponse.data.result.points_count}`);
      console.log(`   Indexed Vectors: ${qdrantResponse.data.result.indexed_vectors_count}`);
    } else {
      console.log('❌ Direct Qdrant Failed:', qdrantResponse.data);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the debug
debugCollection().catch(console.error);
