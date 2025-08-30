# Qdrant Cloud Quick Reference

Quick commands and configurations for using your bulk PDF system with Qdrant Cloud.

## 🚀 **Quick Setup**

### **Environment Variables**
```env
# Qdrant Cloud
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=your_api_key_here
QDRANT_COLLECTION=documents

# Google Gemini
GOOGLE_API_KEY=your_google_key_here

# Bulk Processing (cloud-optimized)
BULK_CONCURRENCY=4
BULK_EMBED_BATCH=64
BULK_UPSERT_BATCH=128
BULK_CHUNK_SIZE=500
BULK_CHUNK_OVERLAP=200
```

## 🔗 **Connection Testing**

### **Test Basic Connection**
```bash
curl -v "https://your-cluster.cloud.qdrant.io:6333/collections"
```

### **Test with API Key**
```bash
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections"
```

### **Test Collection Access**
```bash
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents"
```

## 📚 **Bulk PDF Processing**

### **Start Processing**
```bash
# Via API
curl -X POST "http://localhost:3000/api/bulk-pdf/process?opId=bulk_001" \
  -H "Content-Type: application/json" \
  -d '{"pdfDirectory": "C:\\your\\pdf\\folder"}'

# Via Standalone Script
node bulk-pdf-ingest.js "C:\your\pdf\folder"
```

### **Monitor Progress**
```bash
# Check stats
curl "http://localhost:3000/api/bulk-pdf/stats"

# Monitor progress (SSE)
curl "http://localhost:3000/api/progress/bulk_001"
```

### **Resume Processing**
```bash
curl -X POST "http://localhost:3000/api/bulk-pdf/resume?opId=bulk_002"
```

## 🔧 **Collection Management**

### **Create Collection**
```bash
curl -X PUT \
  -H "api-key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}' \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents"
```

### **List Collections**
```bash
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections"
```

### **Get Collection Info**
```bash
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents"
```

### **Delete Collection**
```bash
curl -X DELETE \
  -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents"
```

## 📊 **Monitoring & Debugging**

### **Check Collection Stats**
```bash
# Point count
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents/points/count"

# Collection info
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents"
```

### **Check Manifest Database**
```bash
# View all files
sqlite3 bulk_manifest.db "SELECT * FROM bulk_files;"

# Check errors
sqlite3 bulk_manifest.db "SELECT path, error FROM bulk_files WHERE status = 'error';"

# Get stats
sqlite3 bulk_manifest.db "SELECT COUNT(*), status FROM bulk_files GROUP BY status;"
```

## 🚨 **Troubleshooting**

### **Common Error Solutions**

#### **401 Unauthorized**
```bash
# Check API key
echo $QDRANT_API_KEY

# Test with key
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections"
```

#### **429 Rate Limited**
```bash
# Reduce batch sizes
export BULK_CONCURRENCY=2
export BULK_UPSERT_BATCH=64
export BULK_EMBED_BATCH=32
```

#### **Connection Timeout**
```bash
# Check network
ping your-cluster.cloud.qdrant.io
telnet your-cluster.cloud.qdrant.io 6333

# Increase memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### **File Not Found**
```bash
# Check collection exists
curl -H "api-key: your_key" \
  "https://your-cluster.cloud.qdrant.io:6333/collections"

# Create if missing
curl -X PUT \
  -H "api-key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}' \
  "https://your-cluster.cloud.qdrant.io:6333/collections/documents"
```

## ⚡ **Performance Tuning**

### **Conservative Settings (Start Here)**
```env
BULK_CONCURRENCY=2
BULK_EMBED_BATCH=32
BULK_UPSERT_BATCH=64
```

### **Balanced Settings (After Testing)**
```env
BULK_CONCURRENCY=4
BULK_EMBED_BATCH=64
BULK_UPSERT_BATCH=128
```

### **Aggressive Settings (If Resources Allow)**
```env
BULK_CONCURRENCY=6
BULK_EMBED_BATCH=128
BULK_UPSERT_BATCH=256
```

## 🌍 **Cloud Provider URLs**

### **AWS**
```env
# US East
QDRANT_URL=https://cluster-id.us-east-1-0.aws.cloud.qdrant.io:6333

# US West
QDRANT_URL=https://cluster-id.us-west-2-0.aws.cloud.qdrant.io:6333
```

### **GCP**
```env
QDRANT_URL=https://cluster-id.us-central1-0.gcp.cloud.qdrant.io:6333
```

### **Azure**
```env
QDRANT_URL=https://cluster-id.westeurope-0.azure.cloud.qdrant.io:6333
```

## 🔒 **Security Checklist**

- [ ] **HTTPS URLs**: All cloud connections use HTTPS
- [ ] **API Key**: Stored in environment variables, not in code
- [ ] **Permissions**: API key has appropriate permissions (read/write)
- [ ] **Environment Isolation**: Different keys for dev/staging/prod
- [ ] **Key Rotation**: Regular API key rotation (monthly)
- [ ] **Network Security**: Firewall allows outbound HTTPS to cloud

## 📈 **Performance Benchmarks**

| Setting | PDFs/Hour | Memory Usage | Network Calls |
|---------|-----------|--------------|---------------|
| **Conservative** | 50-100 | Low | High |
| **Balanced** | 100-200 | Medium | Medium |
| **Aggressive** | 200-400 | High | Low |

## 💰 **Cost Optimization**

### **Free Tier Limits**
- **Storage**: 1GB
- **Requests**: 1000/minute
- **Best for**: Testing and small projects

### **Starter Plan**
- **Storage**: 10GB  
- **Requests**: 10,000/minute
- **Cost**: ~$25/month

### **Professional Plan**
- **Storage**: 100GB
- **Requests**: 100,000/minute
- **Cost**: ~$250/month

## 🎯 **Quick Commands Summary**

```bash
# Test connection
curl -H "api-key: your_key" "https://your-cluster.cloud.qdrant.io:6333/collections"

# Start bulk processing
node bulk-pdf-ingest.js "C:\your\pdf\folder"

# Check progress
curl "http://localhost:3000/api/bulk-pdf/stats"

# Resume if interrupted
curl -X POST "http://localhost:3000/api/bulk-pdf/resume?opId=bulk_002"

# Check errors
sqlite3 bulk_manifest.db "SELECT path, error FROM bulk_files WHERE status = 'error';"
```

---

**Need Help?** 
- Full documentation: `QDRANT_CLOUD_INTEGRATION.md`
- Bulk PDF docs: `BULK_PDF_README.md`
- Quick start: `QUICK_START_BULK_PDF.md`
