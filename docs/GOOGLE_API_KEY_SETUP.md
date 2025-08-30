# Google API Key Setup - Required for Bulk PDF Processing

## Issue Description
The bulk PDF processing is failing with "Bad Request" errors during Qdrant upsert operations. This occurs because:

1. **Missing Google API Key**: The backend requires a valid Google Generative AI API key to generate embeddings
2. **Empty Embeddings**: Without the API key, embeddings cannot be generated, resulting in empty or invalid vectors
3. **Qdrant Rejection**: Qdrant rejects the upsert requests due to invalid vector data

## Root Cause
The backend `.env` file is missing the required `GOOGLE_API_KEY` environment variable. This key is essential for:
- Generating text embeddings using Google's `embedding-001` model
- Converting text chunks into 768-dimensional vectors for Qdrant storage
- Enabling the RAG (Retrieval-Augmented Generation) functionality

## Solution

### Step 1: Get Your Google API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 2: Create Backend Environment File
1. In the `backend/` directory, create a `.env` file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Edit the `.env` file and replace `your_google_api_key_here` with your actual API key:
   ```env
   GOOGLE_API_KEY=your_actual_api_key_here
   QDRANT_URL=http://qdrant:6333
   QDRANT_COLLECTION=pulmo
   PORT=3000
   NODE_ENV=development
   DATA_DIR=/app/data
   ```

### Step 3: Restart the Backend Service
```bash
docker-compose restart backend
```

## Verification

### Check Backend Logs
After restarting, the backend should show:
```
[info] Server is running on port 3000
[info] Bulk PDF manifest database initialized
```

### Test Embedding Generation
The backend should now be able to:
- Generate embeddings for text chunks
- Successfully upsert vectors to Qdrant
- Process bulk PDF files without "Bad Request" errors

## Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `GOOGLE_API_KEY` | ✅ | Google Generative AI API key | None |
| `QDRANT_URL` | ✅ | Qdrant service URL | `http://qdrant:6333` |
| `QDRANT_COLLECTION` | ❌ | Qdrant collection name | `pulmo` |
| `PORT` | ❌ | Backend port | `3000` |
| `NODE_ENV` | ❌ | Environment mode | `development` |
| `DATA_DIR` | ❌ | Data directory path | `/app/data` |

## Bulk PDF Processing Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BULK_CONCURRENCY` | `6` | Number of PDFs to process simultaneously |
| `BULK_EMBED_BATCH` | `128` | Text chunks per embedding API call |
| `BULK_UPSERT_BATCH` | `256` | Vectors per Qdrant upsert |
| `BULK_CHUNK_SIZE` | `500` | Character size for text chunks |
| `BULK_CHUNK_OVERLAP` | `200` | Character overlap between chunks |

## Troubleshooting

### Common Issues

1. **"Bad Request" errors persist after adding API key**
   - Verify the API key is correct and has sufficient quota
   - Check that the `.env` file is in the `backend/` directory
   - Ensure the backend service was restarted after adding the key

2. **"API key is used with unsecure connection" warning**
   - This is normal in development with local Qdrant
   - The warning doesn't affect functionality

3. **Embedding generation fails**
   - Verify your Google API key has access to the Generative AI API
   - Check your API quota and billing status
   - Ensure the `embedding-001` model is available in your region

### API Key Security
- **Never commit** the `.env` file to version control
- **Never share** your API key publicly
- **Rotate keys** if they are accidentally exposed
- **Use environment variables** in production deployments

## Next Steps
After setting up the Google API key:
1. Test bulk PDF processing with a small directory
2. Monitor backend logs for successful embedding generation
3. Verify vectors are being stored in Qdrant
4. Test the RAG query functionality

## Support
If you continue to experience issues after setting up the API key:
1. Check the backend logs for specific error messages
2. Verify the Qdrant collection configuration
3. Test with a single PDF file first
4. Ensure all required environment variables are set correctly
