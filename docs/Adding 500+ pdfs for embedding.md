Add 500+ PDFs smoothly (no crashes)
Batch + concurrency limit: Process in small batches (20–50 files) with a global concurrency cap (5–15). Avoid “all at once.”
Stream I/O: Read and upload with streams; never load full PDFs into RAM.
Resumable/multipart uploads: Use S3/GCS/Azure resumable APIs; enable multipart with retries.
Idempotency + manifest: Keep a manifest (SQLite or JSONL) with per-file status (queued, uploading, uploaded, processed). Use checksums to skip dupes.
Robust retries: Exponential backoff, max-retry, and only mark “done” after the server confirms.
Backpressure: Use a queue; don’t start new tasks when workers are busy.
Validation: Pre-scan size, extension, corruption; quarantine bad files.
Separation of concerns: Upload first, then extract/index in a separate worker job.
Progress + metrics: Log successes/failures, ETA, and persist offsets so you can resume after crashes.

---
Node + Qdrant on Windows: safe 500+ PDF ingestion with resume
Approach: Limit concurrency, stream files, chunk text, batch-embed, batch-upsert to Qdrant, and persist a manifest (SQLite) so you can resume safely.
Defaults: Concurrency=6, chunk=500 chars with 200 overlap, OpenAI embeddings or Gemini , Qdrant Cosine, batch sizes: embeddings=128, upsert=256.
1) Install (PowerShell)
npm init -y
npm i @qdrant/js-client-rest openai pdf-parse p-limit p-retry fast-glob better-sqlite3 dotenv
2) .env
# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=pdf_chunks

# Embeddings (OpenAI or Azure OpenAI)
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=sk-...

# Ingestion
PDF_DIR=C:\data\pdfs
CONCURRENCY=6
EMBED_BATCH=128
UPSERT_BATCH=256
CHUNK_SIZE=1500
CHUNK_OVERLAP=200
3) package.json (set ESM)
{
  "name": "pdf-qdrant-ingest",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "ingest": "node ingest.js" },
  "dependencies": {}
}
4) ingest.js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import fg from 'fast-glob';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import pdfParse from 'pdf-parse';
import Database from 'better-sqlite3';
import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';

const {
  QDRANT_URL,
  QDRANT_API_KEY,
  QDRANT_COLLECTION = 'pdf_chunks',
  PDF_DIR,
  CONCURRENCY = '6',
  EMBED_BATCH = '128',
  UPSERT_BATCH = '256',
  CHUNK_SIZE = '1500',
  CHUNK_OVERLAP = '200',
  EMBEDDING_MODEL = 'text-embedding-3-small',
  OPENAI_API_KEY
} = process.env;

if (!PDF_DIR) throw new Error('Set PDF_DIR in .env');

const concurrency = Number(CONCURRENCY);
const embedBatchSize = Number(EMBED_BATCH);
const upsertBatchSize = Number(UPSERT_BATCH);
const chunkSize = Number(CHUNK_SIZE);
const chunkOverlap = Number(CHUNK_OVERLAP);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

const modelDims = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536
};
const vectorSize = modelDims[EMBEDDING_MODEL] ?? 1536;

const db = new Database('manifest.db');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    updated_at TEXT NOT NULL
  );
`);

const upsertFileStmt = db.prepare(`
  INSERT INTO files (path, checksum, status, error, updated_at)
  VALUES (@path, @checksum, @status, @error, @updated_at)
  ON CONFLICT(path) DO UPDATE SET
    checksum=excluded.checksum,
    status=excluded.status,
    error=excluded.error,
    updated_at=excluded.updated_at
`);
const getFileStmt = db.prepare(`SELECT path, checksum, status FROM files WHERE path = ?`);

function nowIso() { return new Date().toISOString(); }

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(filePath);
    rs.on('error', reject);
    rs.on('data', d => hash.update(d));
    rs.on('end', () => resolve(hash.digest('hex')));
  });
}

function sha1String(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function splitIntoChunks(text, size = 1500, overlap = 200) {
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
    await qdrant.getCollection(QDRANT_COLLECTION);
  } catch {
    await qdrant.createCollection(QDRANT_COLLECTION, {
      vectors: { size: vectorSize, distance: 'Cosine' }
    });
  }
}

async function embedBatch(texts) {
  const res = await pRetry(
    () => openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts }),
    { retries: 5, factor: 2, minTimeout: 500, maxTimeout: 8000, randomize: true }
  );
  return res.data.map(d => d.embedding);
}

async function upsertBatch(points) {
  await pRetry(
    () => qdrant.upsert(QDRANT_COLLECTION, { wait: true, points }),
    { retries: 5, factor: 2, minTimeout: 500, maxTimeout: 8000, randomize: true }
  );
}

async function processFile(filePath) {
  const checksum = await sha256File(filePath);
  const rec = getFileStmt.get(filePath);
  if (rec && rec.status === 'indexed' && rec.checksum === checksum) {
    return { skipped: true };
  }
  upsertFileStmt.run({ path: filePath, checksum, status: 'queued', error: null, updated_at: nowIso() });

  // Extract text (pdf-parse reads Buffer; we keep overall concurrency small)
  const data = await pdfParse(fs.readFileSync(filePath));
  const text = (data.text || '').replace(/\r\n/g, '\n').trim();
  if (!text) throw new Error('No text extracted');

  const chunks = splitIntoChunks(text, chunkSize, chunkOverlap);

  // Embed in batches
  const vectors = [];
  for (let i = 0; i < chunks.length; i += embedBatchSize) {
    const batch = chunks.slice(i, i + embedBatchSize);
    const batchVecs = await embedBatch(batch);
    vectors.push(...batchVecs);
  }

  // Upsert to Qdrant in batches
  const points = chunks.map((chunk, idx) => ({
    id: sha1String(`${filePath}|${idx}`),
    vector: vectors[idx],
    payload: {
      file_path: filePath,
      chunk_index: idx,
      text: chunk
    }
  }));

  for (let i = 0; i < points.length; i += upsertBatchSize) {
    await upsertBatch(points.slice(i, i + upsertBatchSize));
  }

  upsertFileStmt.run({ path: filePath, checksum, status: 'indexed', error: null, updated_at: nowIso() });
  return { skipped: false, chunks: chunks.length };
}

async function main() {
  await ensureCollection();

  // Find PDFs recursively (Windows-safe, absolute paths)
  const files = await fg(['**/*.pdf'], { cwd: PDF_DIR, absolute: true, onlyFiles: true, followSymbolicLinks: false });

  const limit = pLimit(concurrency);
  let done = 0, skipped = 0, totalChunks = 0;

  const tasks = files.map(f =>
    limit(async () => {
      try {
        const res = await processFile(path.normalize(f));
        if (res.skipped) skipped += 1;
        else totalChunks += res.chunks;
      } catch (err) {
        upsertFileStmt.run({ path: f, checksum: '', status: 'error', error: String(err), updated_at: nowIso() });
        console.error('Failed:', f, err.message);
      } finally {
        done += 1;
        if (done % 10 === 0 || done === files.length) {
          console.log(`Progress ${done}/${files.length} (skipped=${skipped}, chunks=${totalChunks})`);
        }
      }
    })
  );

  await Promise.all(tasks);
  console.log('Ingestion completed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
5) Run (PowerShell)
# Start Qdrant locally (if needed): docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
npm run ingest
Notes for Windows
Use absolute PDF_DIR (e.g., C:\data\pdfs). Paths are normalized automatically.
Keep Defender exclusions for your data folder to avoid file-lock stalls.
If you hit OpenAI rate limits, lower CONCURRENCY and EMBED_BATCH, or switch to Azure OpenAI with your deployment name.
To resume, just rerun; processed files (checksum + status=indexed) are skipped automatically.
If you prefer a different embedder (e.g., local Transformers on Windows), say which model and I’ll swap the embedding section and vector size accordingly