# Similarity Threshold Guide

This guide explains how to use the new similarity threshold feature in your RAG system to control document retrieval quality and relevance.

## 🎯 What is Similarity Threshold?

The similarity threshold is a configurable parameter that controls how strictly the system filters retrieved documents based on their relevance to your query. It works with cosine similarity scoring where:

- **1.0** = Perfect match (100% relevant)
- **0.9+** = Very high relevance (90%+ relevant)
- **0.7-0.9** = High relevance (70-90% relevant)
- **0.5-0.7** = Medium relevance (50-70% relevant)
- **0.3-0.5** = Low relevance (30-50% relevant)
- **<0.3** = Very low relevance (<30% relevant)

## ⚙️ Configuration

### Environment Variables

Add these to your `backend/.env` file:

```env
# RAG Retrieval Configuration
SIMILARITY_THRESHOLD=0.7
MIN_SIMILARITY_SCORE=0.6
```

### Recommended Threshold Values

| Use Case | Threshold | Description |
|----------|-----------|-------------|
| **Production/Strict** | 0.8-0.9 | Only highly relevant documents, high accuracy |
| **Balanced** | 0.6-0.8 | Good balance of relevance and coverage |
| **Development/Testing** | 0.4-0.6 | More documents, lower relevance |
| **Research/Exploration** | 0.3-0.5 | Maximum coverage, may include less relevant content |

## 🚀 Frontend Usage

### 1. Show/Hide Threshold Control

Click the **"Show Threshold"** button to reveal the similarity threshold slider.

### 2. Adjust Threshold

Use the slider to set your desired threshold:
- **Left (0.1)**: Very loose retrieval, more documents
- **Right (1.0)**: Very strict retrieval, fewer documents
- **Middle (0.7)**: Balanced retrieval (default)

### 3. Real-time Feedback

The system shows the current threshold and its meaning:
- **Strict**: 0.8+ (high quality, fewer results)
- **Balanced**: 0.6-0.8 (good balance)
- **Loose**: <0.6 (more coverage, lower quality)

## 🔧 Backend API Usage

### Query Endpoint

```bash
POST /api/query
{
  "question": "What is a pleural effusion?",
  "topK": 5,
  "similarityThreshold": 0.8
}
```

### Chat Endpoint

```bash
POST /api/chat
{
  "messages": [...],
  "topK": 5,
  "similarityThreshold": 0.7
}
```

### Response Format

```json
{
  "success": true,
  "answer": "A pleural effusion is...",
  "sources": [...],
  "similarityThreshold": 0.8,
  "documentsRetrieved": 10,
  "documentsFiltered": 6
}
```

## 📊 Understanding Results

### Response Fields

- **`similarityThreshold`**: The threshold used for filtering
- **`documentsRetrieved`**: Total documents found before filtering
- **`documentsFiltered`**: Documents remaining after threshold filtering

### Example Scenarios

#### Scenario 1: Strict Threshold (0.9)
```
Query: "What is a pleural effusion?"
Threshold: 0.9
Documents Retrieved: 15
Documents Filtered: 3
Result: High-quality, highly relevant sources only
```

#### Scenario 2: Balanced Threshold (0.7)
```
Query: "What is a pleural effusion?"
Threshold: 0.7
Documents Retrieved: 15
Documents Filtered: 8
Result: Good balance of quality and coverage
```

#### Scenario 3: Loose Threshold (0.4)
```
Query: "What is a pleural effusion?"
Threshold: 0.4
Documents Retrieved: 15
Documents Filtered: 12
Result: Maximum coverage, may include less relevant content
```

## 🧪 Testing

### Run the Test Script

```bash
cd test
node test-similarity-threshold.js
```

This will test:
1. Backend connectivity
2. Default threshold (0.7)
3. Strict threshold (0.9)
4. Loose threshold (0.3)
5. Result comparison
6. Query analysis

### Manual Testing

1. **Set different thresholds** in the frontend
2. **Ask the same question** multiple times
3. **Compare source counts** and quality
4. **Check response relevance** to your query

## 🔍 Troubleshooting

### Common Issues

#### 1. No Documents Retrieved
- **Cause**: Threshold too high
- **Solution**: Lower the threshold (try 0.5 or 0.6)

#### 2. Too Many Irrelevant Documents
- **Cause**: Threshold too low
- **Solution**: Increase the threshold (try 0.8 or 0.9)

#### 3. Inconsistent Results
- **Cause**: Different document embeddings or collection changes
- **Solution**: Re-embed documents or check collection consistency

### Debug Information

Check backend logs for:
```
[info] Using similarity threshold: 0.8
[info] Filtering 15 documents by similarity threshold: 0.8
[info] Filtered to 6 documents above threshold 0.8
```

## 📈 Performance Impact

### Threshold vs Performance

| Threshold | Retrieval Speed | Memory Usage | Result Quality |
|-----------|----------------|--------------|----------------|
| **High (0.8+)** | Faster | Lower | Higher |
| **Medium (0.6-0.8)** | Balanced | Balanced | Balanced |
| **Low (0.4-)** | Slower | Higher | Lower |

### Optimization Tips

1. **Start with 0.7** for most use cases
2. **Use 0.8+** for production systems requiring high accuracy
3. **Use 0.5-0.6** for research or exploration
4. **Monitor response times** and adjust accordingly

## 🔄 Integration with Existing Features

### Top-K Selection

The similarity threshold works alongside Top-K selection:
- **Top-K**: Controls how many documents to retrieve
- **Similarity Threshold**: Filters retrieved documents by relevance

### Query Analysis

Query analysis now includes threshold information:
```
Complexity: MEDIUM
Recommended Top-K: 6
Current Top-K: Auto
Similarity Threshold: 0.8
🎯 Similarity threshold: 0.8 (Strict retrieval)
```

### Conversation History

Threshold settings persist across conversation turns for consistent retrieval quality.

## 🎯 Best Practices

1. **Start Conservative**: Begin with 0.7 and adjust based on results
2. **Test with Real Queries**: Use actual user questions to find optimal thresholds
3. **Monitor Quality**: Track user satisfaction and adjust thresholds accordingly
4. **Environment-Specific**: Use different thresholds for dev/staging/production
5. **Document Changes**: Update thresholds when adding new document types

## 🚀 Advanced Usage

### Dynamic Thresholds

You can change thresholds between queries:
```javascript
// First query with strict threshold
const strictResult = await query("What is X?", null, 0.9);

// Second query with loose threshold
const looseResult = await query("What is Y?", null, 0.4);
```

### Threshold Presets

Create threshold presets for different use cases:
```javascript
const THRESHOLD_PRESETS = {
  strict: 0.9,
  balanced: 0.7,
  loose: 0.5,
  research: 0.3
};
```

## 📚 Related Documentation

- [RAG Service Implementation](../backend/src/services/ragService.js)
- [API Endpoints](../backend/src/index.js)
- [Frontend Controls](../frontend/src/components/SimpleChat.tsx)
- [Environment Configuration](../backend/env.example)

---

**Need Help?** Check the backend logs for detailed information about threshold filtering and document retrieval.
