# Bulk PDF Ingestion System

This system allows you to process 500+ PDFs efficiently and upload them to your Qdrant vector database with resume capability and real-time progress tracking.

## Features

- **Bulk Processing**: Process hundreds of PDFs in parallel
- **Resume Capability**: Automatically resume from where you left off if the process crashes
- **Progress Tracking**: Real-time progress updates via SSE (Server-Sent Events)
- **Duplicate Prevention**: Uses file checksums to avoid reprocessing
- **Error Handling**: Robust error handling with retry logic
- **Memory Efficient**: Streams files and processes in batches
- **Configurable**: Adjustable concurrency, batch sizes, and chunk parameters

## Architecture

### 1. Backend Integration (Recommended)
- **Service**: `BulkPdfService` integrated with your existing RAG service
- **Endpoints**: REST API endpoints for bulk operations
- **Progress**: Real-time SSE progress updates
- **Resume**: Automatic resume capability

### 2. Standalone Script
- **File**: `bulk-pdf-ingest.js` - Independent script for command-line use
- **Features**: Same capabilities as backend service
- **Use Case**: When you want to run ingestion separately from your main application

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create or update your `.env` file:

```env
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=documents

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here

# Bulk Processing Configuration
BULK_CONCURRENCY=6
BULK_EMBED_BATCH=128
BULK_UPSERT_BATCH=256
BULK_CHUNK_SIZE=500
BULK_CHUNK_OVERLAP=200
```

### 3. Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `BULK_CONCURRENCY` | 6 | Number of PDFs to process simultaneously |
| `BULK_EMBED_BATCH` | 128 | Number of text chunks to embed in one API call |
| `BULK_UPSERT_BATCH` | 256 | Number of vectors to upsert to Qdrant in one batch |
| `BULK_CHUNK_SIZE` | 500 | Character size for each text chunk |
| `BULK_CHUNK_OVERLAP` | 200 | Character overlap between chunks |

## Usage

### Option 1: Backend API Integration (Recommended)

#### Start Bulk Processing

```bash
curl -X POST "http://localhost:3000/api/bulk-pdf/process?opId=bulk_001" \
  -H "Content-Type: application/json" \
  -d '{"pdfDirectory": "C:\\data\\pdfs"}'
```

#### Monitor Progress

```javascript
// Connect to SSE endpoint for real-time updates
const eventSource = new EventSource('/api/progress/bulk_001');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
  
  if (data.status === 'completed' || data.status === 'failed') {
    eventSource.close();
  }
};
```

#### Resume Processing

```bash
curl -X POST "http://localhost:3000/api/bulk-pdf/resume?opId=bulk_002"
```

#### Get Statistics

```bash
curl "http://localhost:3000/api/bulk-pdf/stats"
```

#### Clear Manifest

```bash
curl -X DELETE "http://localhost:3000/api/bulk-pdf/manifest"
```

### Option 2: Standalone Script

#### Run the Script

```bash
# Windows
node bulk-pdf-ingest.js "C:\data\pdfs"

# Linux/Mac
node bulk-pdf-ingest.js "/data/pdfs"
```

#### Script Output Example

```
[2024-01-15T10:30:00.000Z] ℹ️ 🚀 Starting bulk PDF ingestion...
[2024-01-15T10:30:00.000Z] ℹ️ 📁 PDF Directory: C:\data\pdfs
[2024-01-15T10:30:00.000Z] ℹ️ ⚙️  Concurrency: 6
[2024-01-15T10:30:00.000Z] ℹ️ 📦 Embed Batch Size: 128
[2024-01-15T10:30:00.000Z] ℹ️ 💾 Upsert Batch Size: 256
[2024-01-15T10:30:00.000Z] ℹ️ ✂️  Chunk Size: 500 chars
[2024-01-15T10:30:00.000Z] ℹ️ 🔄 Chunk Overlap: 200 chars
[2024-01-15T10:30:00.000Z] ℹ️ Collection 'documents' already exists
[2024-01-15T10:30:01.000Z] ℹ️ 🔍 Scanning for PDF files...
[2024-01-15T10:30:02.000Z] ℹ️ 📚 Found 500 PDF files to process
[2024-01-15T10:30:02.000Z] ℹ️ 🔄 Processing files...
[2024-01-15T10:30:05.000Z] ℹ️ 📈 Progress: 1.2% (6/500) - document1.pdf - Elapsed: 3s
[2024-01-15T10:30:08.000Z] ℹ️ 📈 Progress: 2.4% (12/500) - document2.pdf - Elapsed: 6s
...
```

## Resume Capability

The system automatically tracks progress in a SQLite database (`bulk_manifest.db`):

- **File Status**: `queued`, `processing`, `completed`, `error`
- **Checksums**: SHA256 hashes to detect file changes
- **Chunk Counts**: Number of text chunks per file
- **Error Details**: Specific error messages for failed files

### How Resume Works

1. **Automatic Detection**: System detects files with `queued` or `processing` status
2. **Checksum Validation**: Compares current file checksums with stored ones
3. **Skip Completed**: Files marked as `completed` with matching checksums are skipped
4. **Retry Errors**: Files with `error` status are retried
5. **Continue Processing**: Resumes from where it left off

## Error Handling

### Retry Logic

- **Embeddings**: 5 retries with exponential backoff (1s to 10s)
- **Qdrant Upserts**: 5 retries with exponential backoff (1s to 10s)
- **File Processing**: Individual file failures don't stop the entire process

### Error Recovery

- **Failed Files**: Marked with error status and details
- **Partial Processing**: Files partially processed are marked as errors
- **Manual Review**: Check manifest database for error details
- **Selective Retry**: Can retry specific failed files

## Performance Optimization

### Concurrency Tuning

- **Start Conservative**: Begin with `BULK_CONCURRENCY=6`
- **Monitor Resources**: Watch CPU, memory, and API rate limits
- **Adjust Up**: Increase if system handles load well
- **Adjust Down**: Decrease if you hit rate limits or resource constraints

### Batch Size Tuning

- **Embedding Batch**: Larger batches = fewer API calls but more memory
- **Upsert Batch**: Larger batches = fewer database round trips
- **Memory Consideration**: Monitor memory usage during processing

### Windows-Specific Considerations

- **Path Handling**: Use absolute paths (e.g., `C:\data\pdfs`)
- **Antivirus**: Add data folder to Windows Defender exclusions
- **File Locks**: Avoid accessing PDFs from other applications during processing

## Monitoring and Debugging

### Progress Tracking

- **Real-time Updates**: SSE endpoints provide live progress
- **File-level Progress**: Individual file processing status
- **Chunk-level Progress**: Text chunk processing updates
- **Error Reporting**: Detailed error messages for failed operations

### Logging

- **Console Output**: Rich console logging with emojis and timestamps
- **File Logging**: Winston logger integration for persistent logs
- **Error Details**: Full error stack traces and context

### Database Inspection

```bash
# View manifest database (requires SQLite)
sqlite3 bulk_manifest.db

# Check file statuses
SELECT path, status, chunks_count, error FROM bulk_files LIMIT 10;

# Check statistics
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM bulk_files;
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Reduce `BULK_CONCURRENCY` and `BULK_EMBED_BATCH`
2. **Memory Issues**: Reduce `BULK_EMBED_BATCH` and `BULK_UPSERT_BATCH`
3. **File Access Errors**: Check file permissions and antivirus exclusions
4. **Qdrant Connection**: Verify `QDRANT_URL` and network connectivity

### Performance Issues

1. **Slow Processing**: Increase concurrency (if resources allow)
2. **High Memory Usage**: Reduce batch sizes
3. **API Rate Limits**: Reduce concurrency and batch sizes
4. **Database Bottlenecks**: Reduce upsert batch size

## Best Practices

### Before Processing

1. **Test with Small Set**: Process 10-20 files first
2. **Check Resources**: Ensure sufficient RAM and CPU
3. **Verify API Limits**: Check Google Gemini API quotas
4. **Backup Data**: Backup existing Qdrant data if needed

### During Processing

1. **Monitor Progress**: Use SSE endpoints or script output
2. **Check Logs**: Monitor for errors and warnings
3. **Resource Monitoring**: Watch CPU, memory, and disk usage
4. **Network Stability**: Ensure stable connection to Qdrant

### After Processing

1. **Verify Results**: Check Qdrant collection statistics
2. **Review Errors**: Check manifest for failed files
3. **Cleanup**: Remove temporary files and logs if needed
4. **Documentation**: Record processing parameters and results

## Integration with Existing RAG System

The bulk PDF service integrates seamlessly with your existing RAG system:

- **Same Collection**: Uses the same Qdrant collection
- **Same Embeddings**: Uses Google Gemini embedding-001 model
- **Same Chunking**: Uses identical text splitting logic
- **Unified Querying**: All documents (individual + bulk) are searchable together

## Scaling Considerations

### For 1000+ PDFs

- **Increase Concurrency**: Gradually increase to 10-15
- **Larger Batches**: Increase batch sizes if memory allows
- **Multiple Runs**: Split into multiple processing sessions
- **Resource Monitoring**: Monitor system resources closely

### For Production Use

- **Environment Variables**: Use production-specific configurations
- **Monitoring**: Add metrics and alerting
- **Backup**: Regular Qdrant collection backups
- **Security**: Secure API keys and database access

## Support and Maintenance

### Regular Tasks

- **Monitor Logs**: Check for errors and warnings
- **Update Dependencies**: Keep packages updated
- **Backup Data**: Regular Qdrant collection backups
- **Performance Review**: Monitor and optimize parameters

### Troubleshooting Resources

- **Logs**: Check console output and Winston logs
- **Database**: Inspect manifest database for details
- **API Status**: Check Google Gemini API status
- **Qdrant Health**: Monitor Qdrant service health

---

This system provides a robust, scalable solution for processing large numbers of PDFs while maintaining data integrity and providing excellent user experience through real-time progress tracking and automatic resume capability.
