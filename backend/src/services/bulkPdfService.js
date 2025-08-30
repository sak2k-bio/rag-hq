import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fg from 'fast-glob';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import Database from 'better-sqlite3';
import logger from '../config/logger.js';
import { emitProgress, emitDone } from './progress.js';

class BulkPdfService {
  constructor(ragService) {
    this.ragService = ragService;
    this.collectionName = process.env.QDRANT_COLLECTION || 'documents';
    
    // Configuration
    this.concurrency = Number(process.env.BULK_CONCURRENCY || '6');
    this.embedBatchSize = Number(process.env.BULK_EMBED_BATCH || '128');
    this.upsertBatchSize = Number(process.env.BULK_UPSERT_BATCH || '256');
    this.chunkSize = Number(process.env.BULK_CHUNK_SIZE || '500');
    this.chunkOverlap = Number(process.env.BULK_CHUNK_OVERLAP || '200');
    
    // Initialize database for manifest
    this.initDatabase();
    
    // Concurrency limiter
    this.limit = pLimit(this.concurrency);
  }

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
      this.db.pragma('journal_mode = WAL');
      
      // Create manifest table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS bulk_files (
          path TEXT PRIMARY KEY,
          checksum TEXT NOT NULL,
          status TEXT NOT NULL,
          error TEXT,
          chunks_count INTEGER DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_bulk_files_status ON bulk_files(status);
        CREATE INDEX IF NOT EXISTS idx_bulk_files_checksum ON bulk_files(checksum);
      `);

      // Prepared statements
      this.upsertFileStmt = this.db.prepare(`
        INSERT INTO bulk_files (path, checksum, status, error, chunks_count, updated_at)
        VALUES (@path, @checksum, @status, @error, @chunks_count, @updated_at)
        ON CONFLICT(path) DO UPDATE SET
          checksum=excluded.checksum,
          status=excluded.status,
          error=excluded.error,
          chunks_count=excluded.chunks_count,
          updated_at=excluded.updated_at
      `);
      
      this.getFileStmt = this.db.prepare(`SELECT path, checksum, status, chunks_count FROM bulk_files WHERE path = ?`);
      this.getPendingFilesStmt = this.db.prepare(`SELECT path FROM bulk_files WHERE status IN ('queued', 'processing')`);
      this.getStatsStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
          SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END) as pending,
          SUM(chunks_count) as total_chunks
        FROM bulk_files
      `);
      
      logger.info('Bulk PDF manifest database initialized');
    } catch (error) {
      logger.error(`Failed to initialize bulk manifest database: ${error.message}`);
      throw error;
    }
  }

  nowIso() {
    return new Date().toISOString();
  }

  async sha256File(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const rs = fs.createReadStream(filePath);
      rs.on('error', reject);
      rs.on('data', d => hash.update(d));
      rs.on('end', () => resolve(hash.digest('hex')));
    });
  }

  async sha1String(s) {
    return crypto.createHash('sha1').update(s).digest('hex');
  }

  splitIntoChunks(text, size = 500, overlap = 200) {
    const chunks = [];
    const len = text.length;
    let start = 0;
    
    while (start < len) {
      const end = Math.min(start + size, len);
      const chunk = text.slice(start, end).trim();
      if (chunk) chunks.push(chunk);
      if (end === len) break;
      start = end - overlap;
      if (start < 0) start = 0;
    }
    
    return chunks;
  }

  async processFile(filePath, operationId) {
    const normalizedPath = path.normalize(filePath);
    const checksum = await this.sha256File(normalizedPath);
    
    // Check if already processed
    const existing = this.getFileStmt.get(normalizedPath);
    if (existing && existing.status === 'completed' && existing.checksum === checksum) {
      logger.info(`Skipping already processed file: ${normalizedPath}`);
      return { skipped: true, chunks: existing.chunks_count };
    }

    // Mark as queued
    this.upsertFileStmt.run({
      path: normalizedPath,
      checksum,
      status: 'queued',
      error: null,
      chunks_count: 0,
      updated_at: this.nowIso()
    });

    try {
      // Mark as processing
      this.upsertFileStmt.run({
        path: normalizedPath,
        checksum,
        status: 'processing',
        error: null,
        chunks_count: 0,
        updated_at: this.nowIso()
      });

      // Extract text using the same method as RAG service
      const buffer = fs.readFileSync(normalizedPath);
      const pdfModule = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = pdfModule.default || pdfModule;
      const data = await pdfParse(buffer);
      
      if (!data || !data.text || !data.text.trim()) {
        throw new Error('No text extracted from PDF');
      }

      const text = data.text.replace(/\r\n/g, '\n').trim();
      const chunks = this.splitIntoChunks(text, this.chunkSize, this.chunkOverlap);

      // Create documents for RAG service
      const documents = chunks.map((chunk, index) => ({
        pageContent: chunk,
        metadata: {
          source: normalizedPath,
          chunk_index: index,
          file_type: 'pdf',
          total_chunks: chunks.length
        }
      }));

      // Process documents using RAG service's bulk processing method
      const result = await this.ragService.processBulkDocuments(documents, operationId);
      const processedChunks = result.chunksAdded;

      // Mark as completed
      this.upsertFileStmt.run({
        path: normalizedPath,
        checksum,
        status: 'completed',
        error: null,
        chunks_count: chunks.length,
        updated_at: this.nowIso()
      });

      logger.info(`Successfully processed: ${normalizedPath} (${chunks.length} chunks)`);
      return { skipped: false, chunks: chunks.length };

    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      logger.error(`Failed to process ${normalizedPath}: ${errorMsg}`);
      
      // Mark as error
      this.upsertFileStmt.run({
        path: normalizedPath,
        checksum,
        status: 'error',
        error: errorMsg,
        chunks_count: 0,
        updated_at: this.nowIso()
      });
      
      throw error;
    }
  }

  async getStats() {
    try {
      const stats = this.getStatsStmt.get();
      return {
        total: stats.total || 0,
        completed: stats.completed || 0,
        errors: stats.errors || 0,
        pending: stats.pending || 0,
        total_chunks: stats.total_chunks || 0
      };
    } catch (error) {
      logger.error(`Failed to get stats: ${error.message}`);
      return { total: 0, completed: 0, errors: 0, pending: 0, total_chunks: 0 };
    }
  }

  async getPendingFiles() {
    try {
      const rows = this.getPendingFilesStmt.all();
      return rows.map(row => row.path);
    } catch (error) {
      logger.error(`Failed to get pending files: ${error.message}`);
      return [];
    }
  }

  async processDirectory(pdfDir, operationId) {
    try {
      logger.info(`Starting bulk PDF processing for directory: ${pdfDir}`);
      
      // Find all PDF files recursively
      const files = await fg(['**/*.pdf'], {
        cwd: pdfDir,
        absolute: true,
        onlyFiles: true,
        followSymbolicLinks: false
      });

      if (files.length === 0) {
        throw new Error(`No PDF files found in directory: ${pdfDir}`);
      }

      logger.info(`Found ${files.length} PDF files to process`);
      
      // Emit initial progress
      emitProgress(operationId, {
        total_files: files.length,
        current_file: 0,
        status: 'starting'
      });

      let completed = 0;
      let skipped = 0;
      let errors = 0;
      let totalChunks = 0;

      // Process files with concurrency limit
      const tasks = files.map(filePath =>
        this.limit(async () => {
          try {
            const result = await this.processFile(filePath, operationId);
            
            if (result.skipped) {
              skipped += 1;
            } else {
              totalChunks += result.chunks;
            }
            
            completed += 1;
            
            // Emit progress update
            emitProgress(operationId, {
              total_files: files.length,
              current_file: completed,
              completed,
              skipped,
              errors,
              total_chunks: totalChunks,
              current_file_name: path.basename(filePath),
              status: 'processing'
            });

            return result;
          } catch (error) {
            errors += 1;
            logger.error(`Task failed for ${filePath}: ${error.message}`);
            
            // Emit error progress
            emitProgress(operationId, {
              total_files: files.length,
              current_file: completed,
              completed,
              skipped,
              errors,
              total_chunks: totalChunks,
              current_file_name: path.basename(filePath),
              error: error.message,
              status: 'error'
            });
            
            throw error;
          }
        })
      );

      // Wait for all tasks to complete
      await Promise.allSettled(tasks);

      // Get final stats
      const stats = await this.getStats();
      
      // Emit completion
      emitDone(operationId, {
        total_files: files.length,
        completed: stats.completed,
        skipped,
        errors: stats.errors,
        total_chunks: stats.total_chunks,
        status: 'completed'
      });

      logger.info(`Bulk PDF processing completed. Files: ${files.length}, Completed: ${stats.completed}, Errors: ${stats.errors}, Total Chunks: ${stats.total_chunks}`);
      
      return {
        total_files: files.length,
        completed: stats.completed,
        skipped,
        errors: stats.errors,
        total_chunks: stats.total_chunks
      };

    } catch (error) {
      logger.error(`Bulk PDF processing failed: ${error.message}`);
      
      emitDone(operationId, {
        error: error.message,
        status: 'failed'
      });
      
      throw error;
    }
  }

  async resumeProcessing(operationId) {
    try {
      const pendingFiles = await this.getPendingFiles();
      
      if (pendingFiles.length === 0) {
        logger.info('No pending files to resume');
        return { message: 'No pending files to resume' };
      }

      logger.info(`Resuming processing for ${pendingFiles.length} pending files`);
      
      // Reset status to queued for retry
      const resetStmt = this.db.prepare(`
        UPDATE bulk_files 
        SET status = 'queued', error = NULL, updated_at = ? 
        WHERE status IN ('queued', 'processing')
      `);
      resetStmt.run(this.nowIso());

      // Process pending files
      return await this.processDirectory(path.dirname(pendingFiles[0]), operationId);
      
    } catch (error) {
      logger.error(`Resume processing failed: ${error.message}`);
      throw error;
    }
  }

  async clearManifest() {
    try {
      this.db.exec('DELETE FROM bulk_files');
      logger.info('Bulk PDF manifest cleared');
      return { message: 'Manifest cleared successfully' };
    } catch (error) {
      logger.error(`Failed to clear manifest: ${error.message}`);
      throw error;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default BulkPdfService;
