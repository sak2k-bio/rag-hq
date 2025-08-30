# Docker SQLite Database Permission Fix

## Issue Description
The backend service was failing to start with the error:
```
Failed to initialize bulk manifest database: unable to open database file
Failed to start server: SqliteError: unable to open database file
```

This occurred because the Docker container was running as a non-root user (`node`) and didn't have write permissions to create the SQLite database file (`bulk_manifest.db`) in the container's working directory.

## Root Cause
1. **Permission Issues**: The container ran as `node` user without proper directory permissions
2. **Missing Volume**: No persistent volume was mounted for the backend's data directory
3. **File Location**: SQLite database was being created in `/app` directory without proper permissions

## Solution Implemented

### 1. Docker Compose Changes
Added a persistent volume for the backend data directory:
```yaml
backend:
  # ... other config
  volumes:
    - backend_data:/app/data
  environment:
    - DATA_DIR=/app/data

volumes:
  backend_data:
```

### 2. Dockerfile Updates
Modified the backend Dockerfile to create the data directory with proper permissions:
```dockerfile
# Create data directory for SQLite database and other persistent files
RUN mkdir -p /app/data && chown -R node:node /app/data
```

### 3. BulkPdfService Code Changes
Updated the `initDatabase()` method to use the data directory:
```javascript
initDatabase() {
  try {
    // Use data directory for SQLite database
    const dataDir = process.env.DATA_DIR || '/app/data';
    const dbPath = path.join(dataDir, 'bulk_manifest.db');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    // ... rest of the method
  }
}
```

## Benefits of the Fix
1. **Persistent Storage**: SQLite database persists across container restarts
2. **Proper Permissions**: Container has write access to the data directory
3. **Scalability**: Data directory can accommodate other persistent files
4. **Environment Flexibility**: DATA_DIR can be configured per environment

## Testing
After implementing the fix:
- ✅ Backend starts successfully without SQLite errors
- ✅ Qdrant collection initializes properly
- ✅ Health endpoint returns 200 status
- ✅ Frontend connects successfully
- ✅ Bulk PDF service can create and access manifest database

## Files Modified
- `docker-compose.yml` - Added backend data volume and DATA_DIR environment variable
- `backend/Dockerfile` - Added data directory creation with proper permissions
- `backend/src/services/bulkPdfService.js` - Updated database path to use data directory

## Future Considerations
- The data directory can be used for other persistent files (logs, cache, etc.)
- Consider environment-specific data directories for dev/test/prod separation
- Monitor volume usage to ensure adequate storage allocation
