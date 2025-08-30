# 🧪 Test Files Directory

This directory contains all test files and utilities for the RAG system.

## 📁 Test Files

### **Dynamic Top-K Testing**
- **`test-dynamic-topk.js`** - Full RAG service test for Dynamic Top-K functionality (requires Google API key)
- **`test-dynamic-topk-simple.js`** - Simple logic test for Dynamic Top-K without external dependencies

### **Connection Testing**
- **`test-connection.html`** - Browser-based test for frontend-backend connectivity and API endpoints

### **Backend Utilities**
- **`clear-errors.js`** - Utility to clear error logs and reset error states
- **`check-status.js`** - Check the status of various backend services and connections
- **`test-source-cleaning.js`** - Test source cleaning and metadata processing
- **`test-qdrant-upsert.js`** - Test Qdrant vector database operations
- **`debug-embeddings.js`** - Debug embedding generation and storage
- **`test-bulk-pdf.js`** - Test bulk PDF processing functionality

### **Bulk Processing**
- **`bulk-pdf-ingest.js`** - Standalone script for bulk PDF ingestion (can be run independently)

## 🚀 How to Use

### **Quick Test (No Dependencies)**
```bash
cd test
node test-dynamic-topk-simple.js
```

### **Full RAG Test (Requires Setup)**
```bash
cd test
# Make sure you have GOOGLE_API_KEY set
node test-dynamic-topk.js
```

### **Browser Test**
```bash
# Open test-connection.html in your browser
# Tests backend connectivity and API endpoints
```

### **Backend Utilities**
```bash
cd test
node clear-errors.js      # Clear error logs
node check-status.js      # Check service status
node debug-embeddings.js  # Debug embeddings
```

## 📋 Prerequisites

- **For full tests**: Google API key, Qdrant running, backend services
- **For simple tests**: Node.js only
- **For browser tests**: Backend running on localhost:3000

## 🎯 Test Coverage

- ✅ Dynamic Top-K selection logic
- ✅ Query complexity analysis
- ✅ Backend API endpoints
- ✅ Frontend-backend connectivity
- ✅ Bulk PDF processing
- ✅ Qdrant operations
- ✅ Error handling and logging

## 🔧 Running Tests

1. **Start your services**: `docker-compose up -d`
2. **Run simple tests**: `node test-dynamic-topk-simple.js`
3. **Test connectivity**: Open `test-connection.html` in browser
4. **Debug issues**: Use appropriate utility scripts

## 📝 Notes

- Simple tests don't require external services
- Full tests require complete RAG system setup
- Browser tests verify end-to-end functionality
- Utility scripts help with debugging and maintenance
