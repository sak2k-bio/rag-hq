#!/usr/bin/env node

/**
 * Standalone Bulk PDF Ingestion Script
 * 
 * This script processes 500+ PDFs and uploads them to your Qdrant database
 * with resume capability and progress tracking.
 * 
 * Usage:
 *   node bulk-pdf-ingest.js <pdf-directory>
 * 
 * Example:
 *   node bulk-pdf-ingest.js "C:\data\pdfs"
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fg from 'fast-glob';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import Database from 'better-sqlite3';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// Configuration from environment variables
const {
  QDRANT_URL = 'http://localhost:6333',
  QDRANT_API_KEY = '',
  QDRANT_COLLECTION = 'documents',
  GOOGLE_API_KEY,
  BULK_CONCURRENCY = '6',
  BULK_EMBED_BATCH = '128',
  BULK_UPSERT_BATCH = '256',
  BULK_CHUNK_SIZE = '500',
  BULK_CHUNK_OVERLAP = '200'
} = process.env;

// Validate required environment variables
if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY is required in .env file');
  process.exit(1);
}

// Configuration
const concurrency = Number(BULK_CONCURRENCY);
const embedBatchSize = Number(BULK_EMBED_BATCH);
const upsertBatchSize = Number(BULK_UPSERT_BATCH);
const chunkSize = Number(BULK_CHUNK_SIZE);
const chunkOverlap = Number(BULK_CHUNK_OVERLAP);

// Initialize Google Gemini embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  model: 'embedding-001',
});

// Initialize Qdrant vector store
const vectorStore = new QdrantVectorStore(embeddings, {
  url: QDRANT_URL,
  collectionName: QDRANT_COLLECTION,
});

// Initialize database for manifest
const db = new Database('bulk_manifest.db');
db.pragma('journal_mode = WAL');

// Create manifest table
db.exec(`
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
const upsertFileStmt = db.prepare(`
  INSERT INTO bulk_files (path, checksum, status, error, chunks_count, updated_at)
  VALUES (@path, @checksum, @status, @error, @chunks_count, @updated_at)
  ON CONFLICT(path) DO UPDATE SET
    checksum=excluded.checksum,
    status=excluded.status,
    error=excluded.error,
    chunks_count=excluded.chunks_count,
    updated_at=excluded.updated_at
`);

const getFileStmt = db.prepare(`SELECT path, checksum, status, chunks_count FROM bulk_files WHERE path = ?`);
const getStatsStmt = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
    SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END) as pending,
    SUM(chunks_count) as total_chunks
  FROM bulk_files
`);

// Utility functions
function nowIso() {
  return new Date().toISOString();
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(filePath);
    rs.on('error', reject);
    rs.on('data', d => hash.update(d));
    rs.on('end', () => resolve(hash.digest('hex')));
  });
}

function splitIntoChunks(text, size = 500, overlap = 200) {
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

async function ensureCollection() {
  try {
    // The LangChain vector store will automatically create the collection if it doesn't exist
    // We just need to ensure the collection is initialized
    log(`Collection '${QDRANT_COLLECTION}' will be created automatically if needed`);
  } catch (error) {
    log(`Collection initialization error: ${error.message}`, 'error');
    throw error;
  }
}

async function embedBatch(texts) {
  try {
    log(`Embedding batch of ${texts.length} texts`);

    // Use Google Gemini embeddings with retry logic
    const embeddings_result = await pRetry(
      () => embeddings.embedDocuments(texts),
      {
        retries: 5,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true
      }
    );

    return embeddings_result;
  } catch (error) {
    log(`Embedding failed: ${error.message}`, 'error');
    throw error;
  }
}

async function upsertBatch(points) {
  try {
    // Convert points to LangChain Document format
    const documents = points.map(point => ({
      pageContent: point.payload.text,
      metadata: {
        source: point.payload.source,
        chunk_index: point.payload.chunk_index,
        file_type: point.payload.file_type,
        total_chunks: point.payload.total_chunks
      }
    }));
    
    // Use LangChain's addDocuments method which handles proper formatting
    await vectorStore.addDocuments(documents);
    log(`Upserted batch of ${points.length} points`);
  } catch (error) {
    log(`Upsert failed: ${error.message}`, 'error');
    throw error;
  }
}

async function processFile(filePath) {
  const normalizedPath = path.normalize(filePath);
  const checksum = await sha256File(normalizedPath);

  // Check if already processed
  const existing = getFileStmt.get(normalizedPath);
  if (existing && existing.status === 'completed' && existing.checksum === checksum) {
    log(`Skipping already processed file: ${path.basename(normalizedPath)}`);
    return { skipped: true, chunks: existing.chunks_count };
  }

  // Mark as queued
  upsertFileStmt.run({
    path: normalizedPath,
    checksum,
    status: 'queued',
    error: null,
    chunks_count: 0,
    updated_at: nowIso()
  });

  try {
    // Mark as processing
    upsertFileStmt.run({
      path: normalizedPath,
      checksum,
      status: 'processing',
      error: null,
      chunks_count: 0,
      updated_at: nowIso()
    });

    // Extract text from PDF
    const buffer = fs.readFileSync(normalizedPath);
    const pdfModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfModule.default || pdfModule;
    const data = await pdfParse(buffer);

    if (!data || !data.text || !data.text.trim()) {
      throw new Error('No text extracted from PDF');
    }

    const text = data.text.replace(/\r\n/g, '\n').trim();
    const chunks = splitIntoChunks(text, chunkSize, chunkOverlap);

    log(`Processing ${path.basename(normalizedPath)}: ${chunks.length} chunks`);

    // Embed in batches
    const vectors = [];
    for (let i = 0; i < chunks.length; i += embedBatchSize) {
      const batch = chunks.slice(i, i + embedBatchSize);
      const batchVecs = await embedBatch(batch);
      vectors.push(...batchVecs);
    }

    // Upsert to Qdrant in batches
    const points = chunks.map((chunk, idx) => ({
      id: crypto.createHash('sha1').update(`${normalizedPath}|${idx}`).digest('hex'),
      vector: vectors[idx],
      payload: {
        source: normalizedPath,
        chunk_index: idx,
        text: chunk,
        file_type: 'pdf',
        total_chunks: chunks.length
      }
    }));

    for (let i = 0; i < points.length; i += upsertBatchSize) {
      await upsertBatch(points.slice(i, i + upsertBatchSize));
    }

    // Mark as completed
    upsertFileStmt.run({
      path: normalizedPath,
      checksum,
      status: 'completed',
      error: null,
      chunks_count: chunks.length,
      updated_at: nowIso()
    });

    log(`✅ Successfully processed: ${path.basename(normalizedPath)} (${chunks.length} chunks)`);
    return { skipped: false, chunks: chunks.length };

  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    log(`❌ Failed to process ${path.basename(normalizedPath)}: ${errorMsg}`, 'error');

    // Mark as error
    upsertFileStmt.run({
      path: normalizedPath,
      checksum,
      status: 'error',
      error: errorMsg,
      chunks_count: 0,
      updated_at: nowIso()
    });

    throw error;
  }
}

async function getStats() {
  try {
    const stats = getStatsStmt.get();
    return {
      total: stats.total || 0,
      completed: stats.completed || 0,
      errors: stats.errors || 0,
      pending: stats.pending || 0,
      total_chunks: stats.total_chunks || 0
    };
  } catch (error) {
    log(`Failed to get stats: ${error.message}`, 'error');
    return { total: 0, completed: 0, errors: 0, pending: 0, total_chunks: 0 };
  }
}

async function main() {
  const pdfDir = process.argv[2];

  if (!pdfDir) {
    console.error('❌ Usage: node bulk-pdf-ingest.js <pdf-directory>');
    console.error('Example: node bulk-pdf-ingest.js "C:\\data\\pdfs"');
    process.exit(1);
  }

  if (!fs.existsSync(pdfDir)) {
    console.error(`❌ Directory does not exist: ${pdfDir}`);
    process.exit(1);
  }

  try {
    log('🚀 Starting bulk PDF ingestion...');
    log(`📁 PDF Directory: ${pdfDir}`);
    log(`⚙️  Concurrency: ${concurrency}`);
    log(`📦 Embed Batch Size: ${embedBatchSize}`);
    log(`💾 Upsert Batch Size: ${upsertBatchSize}`);
    log(`✂️  Chunk Size: ${chunkSize} chars`);
    log(`🔄 Chunk Overlap: ${chunkOverlap} chars`);

    // Ensure Qdrant collection exists
    await ensureCollection();

    // Find all PDF files recursively
    log('🔍 Scanning for PDF files...');
    const files = await fg(['**/*.pdf'], {
      cwd: pdfDir,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false
    });

    if (files.length === 0) {
      log(`❌ No PDF files found in directory: ${pdfDir}`, 'error');
      process.exit(1);
    }

    log(`📚 Found ${files.length} PDF files to process`);

    // Get initial stats
    const initialStats = await getStats();
    if (initialStats.total > 0) {
      log(`📊 Previous run stats: ${initialStats.completed} completed, ${initialStats.errors} errors, ${initialStats.total_chunks} total chunks`);
    }

    // Concurrency limiter
    const limit = pLimit(concurrency);

    let completed = 0;
    let skipped = 0;
    let errors = 0;
    let totalChunks = 0;

    const startTime = Date.now();

    // Process files with concurrency limit
    const tasks = files.map(filePath =>
      limit(async () => {
        try {
          const result = await processFile(filePath);

          if (result.skipped) {
            skipped += 1;
          } else {
            totalChunks += result.chunks;
          }

          completed += 1;

          // Progress update
          const progress = ((completed / files.length) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          log(`📈 Progress: ${progress}% (${completed}/${files.length}) - ${path.basename(filePath)} - Elapsed: ${elapsed}s`);

          return result;
        } catch (error) {
          errors += 1;
          log(`❌ Task failed for ${path.basename(filePath)}: ${error.message}`, 'error');
          throw error;
        }
      })
    );

    // Wait for all tasks to complete
    log('🔄 Processing files...');
    await Promise.allSettled(tasks);

    // Get final stats
    const finalStats = await getStats();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);

    log('🎉 Bulk PDF processing completed!', 'success');
    log(`📊 Final Results:`);
    log(`   📁 Total Files: ${files.length}`);
    log(`   ✅ Completed: ${finalStats.completed}`);
    log(`   ⏭️  Skipped: ${skipped}`);
    log(`   ❌ Errors: ${finalStats.errors}`);
    log(`   📝 Total Chunks: ${finalStats.total_chunks}`);
    log(`   ⏱️  Total Time: ${totalTime} seconds`);

    if (finalStats.errors > 0) {
      log(`⚠️  ${finalStats.errors} files had errors. Check the manifest database for details.`);
    }

  } catch (error) {
    log(`❌ Bulk PDF processing failed: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    db.close();
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});

// Run the main function
main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'error');
  db.close();
  process.exit(1);
});
