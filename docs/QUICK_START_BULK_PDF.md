# Quick Start: Bulk PDF Processing

Get your bulk PDF processing system running in 5 minutes!

## 🚀 Step 1: Install Dependencies

```bash
cd backend
npm install
```

## ⚙️ Step 2: Configure Environment

Create or update your `.env` file:

```env
# Required
GOOGLE_API_KEY=your_google_api_key_here

# Qdrant (defaults to localhost)
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=documents

# Bulk Processing (optional - these are the defaults)
BULK_CONCURRENCY=6
BULK_EMBED_BATCH=128
BULK_UPSERT_BATCH=256
BULK_CHUNK_SIZE=500
BULK_CHUNK_OVERLAP=200
```

## 🧪 Step 3: Test the System

```bash
# Test the bulk PDF service
node test-bulk-pdf.js
```

You should see: `🎉 All tests passed! Bulk PDF Service is working correctly.`

## 📚 Step 4: Process Your PDFs

### Option A: Backend API (Recommended for production)

1. **Start your backend:**
   ```bash
   npm start
   ```

2. **Start bulk processing:**
   ```bash
   curl -X POST "http://localhost:3000/api/bulk-pdf/process?opId=bulk_001" \
     -H "Content-Type: application/json" \
     -d '{"pdfDirectory": "C:\\your\\pdf\\folder"}'
   ```

3. **Monitor progress:**
   ```bash
   curl "http://localhost:3000/api/progress/bulk_001"
   ```

### Option B: Standalone Script (Great for testing)

```bash
# Process all PDFs in a directory
node bulk-pdf-ingest.js "C:\your\pdf\folder"
```

## 📊 Step 5: Check Results

```bash
# Get processing statistics
curl "http://localhost:3000/api/bulk-pdf/stats"

# List all documents (including bulk processed ones)
curl "http://localhost:3000/api/documents"
```

## 🔄 Resume Capability

If the process crashes or stops:

```bash
# Resume processing
curl -X POST "http://localhost:3000/api/bulk-pdf/resume?opId=bulk_002"
```

The system automatically:
- ✅ Skips already processed files
- ✅ Retries failed files
- ✅ Continues from where it left off
- ✅ Prevents duplicates using file checksums

--
IF THINGS FAIL MIDWAY ::

Since you only have 6 files out of 1,354 that failed (99.6% success rate), I recommend:

# 1. Clear the 6 failed files
node clear-errors.js

# 2. Resume processing (will skip completed files automatically)
node bulk-pdf-ingest.js "your-directory"

# 3. Monitor progress
node check-status.js

---


## 🎯 Key Features Working

- **Concurrency Control**: Process 6 PDFs simultaneously (configurable)
- **Batch Processing**: Embed 128 chunks per API call, upsert 256 vectors per batch
- **Progress Tracking**: Real-time updates via SSE endpoints
- **Error Handling**: Automatic retries with exponential backoff
- **Memory Efficient**: Streaming and batch processing
- **Resume Safe**: Never lose progress, always resume from crashes

## 🚨 Troubleshooting

### Common Issues:

1. **"GOOGLE_API_KEY is required"**
   - Add your Google API key to `.env` file

2. **"Qdrant connection failed"**
   - Start Qdrant: `docker-compose up qdrant`
   - Check `QDRANT_URL` in `.env`

3. **"No PDF files found"**
   - Use absolute path: `C:\full\path\to\pdfs`
   - Ensure directory contains `.pdf` files

4. **Rate limiting errors**
   - Reduce `BULK_CONCURRENCY` to 3-4
   - Reduce `BULK_EMBED_BATCH` to 64

### Performance Tuning:

- **Start Conservative**: `BULK_CONCURRENCY=6`
- **Monitor Resources**: Watch CPU, memory, API rate limits
- **Adjust Up**: Increase if system handles load well
- **Adjust Down**: Decrease if you hit limits

## 📖 Next Steps

- Read the full documentation: `BULK_PDF_README.md`
- Test with a small folder first (10-20 PDFs)
- Monitor progress and adjust parameters
- Scale up to your full 500+ PDF collection

## 🎉 You're Ready!

Your bulk PDF processing system is now fully operational and ready to handle 500+ PDFs with enterprise-grade reliability and performance!
