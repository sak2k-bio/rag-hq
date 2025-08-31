import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import logger from './config/logger.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure file upload
const upload = multer({ storage: multer.memoryStorage() });

// Initialize RAG service
let ragService;
let bulkPdfService;

async function initializeApp() {
  try {
    // Import RAG service dynamically
    const ragModule = await import('./services/ragService.js');
    ragService = ragModule.default;

    // Import Bulk PDF service
    const bulkPdfModule = await import('./services/bulkPdfService.js');
    bulkPdfService = new bulkPdfModule.default(ragService);

    // Progress SSE
    const progressModule = await import('./services/progress.js');
    const { sseHandler, emitProgress } = progressModule;

    // --- API Routes ---

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // SSE channel for progress
    app.get('/api/progress/:opId', sseHandler);

    // Ingest documents from file upload
    app.post('/api/documents', upload.array('document', 10), async (req, res, next) => {
      try {
        const { opId, removeTimestamps } = req.query;
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        const fileNames = req.files.map(file => file.originalname).join(', ');
        emitProgress?.(opId, `Uploading ${req.files.length} files: ${fileNames}`);

        const result = await ragService.processFile(req.files, opId, removeTimestamps === 'true');
        emitProgress?.(opId, `Files processed: ${fileNames}`, result);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    });

    // Ingest content from a website URL
    app.post('/api/crawl', async (req, res, next) => {
      try {
        const { url } = req.body;
        const { opId } = req.query;
        if (!url) {
          return res.status(400).json({ error: 'URL is required' });
        }
        emitProgress?.(opId, `Starting crawl: ${url}`);
        const result = await ragService.processWebUrl(url, opId);
        emitProgress?.(opId, `Crawl complete: ${url}`, result);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    });

    // Ingest raw text
    app.post('/api/text', async (req, res, next) => {
      try {
        const { text } = req.body;
        const { opId } = req.query;
        if (!text) {
          return res.status(400).json({ error: 'Text content is required' });
        }
        emitProgress?.(opId, `Processing text input`);
        const result = await ragService.processText(text, opId);
        emitProgress?.(opId, `Text processed`, result);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    });

    // Query endpoint with conversation history support
    app.post('/api/query', async (req, res, next) => {
      try {
        const { question, topK, messages, excludedSources, similarityThreshold } = req.body;
        
        console.log(`Query endpoint: Received similarityThreshold: ${similarityThreshold}`);
        
        if (!question && !messages) {
          return res.status(400).json({ error: 'Either question or messages array is required' });
        }

        // If messages array is provided, use conversation history
        if (messages && Array.isArray(messages) && messages.length > 0) {
          console.log(`Query endpoint: Processing with conversation history (${messages.length} messages)`);
          
          // Get the latest user message
          const latestMessage = messages[messages.length - 1];
          if (latestMessage.role !== 'user') {
            return res.status(400).json({ error: 'Last message must be from user' });
          }

          // Create conversation context from previous messages
          const conversationHistory = messages.slice(0, -1).map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          console.log(`Using conversation history with ${conversationHistory.length} previous messages`);
          console.log(`Latest user message: ${latestMessage.content}`);

          // Call RAG service with conversation history
          const result = await ragService.queryWithHistory(
            latestMessage.content, 
            conversationHistory, 
            topK ? parseInt(topK) : null,
            excludedSources
          );

          // Ensure response format matches what frontend expects
          res.json({
            answer: result.answer || result.response,
            sources: result.sources || []
          });
        } else {
          // Fallback to old behavior for backward compatibility
          console.log(`Query endpoint: Processing single question without history`);
          const answer = await ragService.query(question, topK ? parseInt(topK) : null, similarityThreshold ? parseFloat(similarityThreshold) : null);
          res.json({ answer });
        }
      } catch (error) {
        console.error('Query endpoint error:', error);
        next(error);
      }
    });

    // Chat endpoint with conversation history
    app.post('/api/chat', async (req, res, next) => {
      try {
        const { messages, excludedSources, topK, similarityThreshold } = req.body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return res.status(400).json({ error: 'Messages array is required' });
        }

        // Get the latest user message
        const latestMessage = messages[messages.length - 1];
        if (latestMessage.role !== 'user') {
          return res.status(400).json({ error: 'Last message must be from user' });
        }

        // Create conversation context from previous messages
        const conversationHistory = messages.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        console.log(`Chat endpoint: Processing message with ${conversationHistory.length} previous messages`);
        console.log(`Latest user message: ${latestMessage.content}`);

        // Call RAG service with conversation history
        const result = await ragService.queryWithHistory(
          latestMessage.content, 
          conversationHistory, 
          topK ? parseInt(topK) : null,
          excludedSources,
          similarityThreshold ? parseFloat(similarityThreshold) : null
        );

        res.json(result);
      } catch (error) {
        console.error('Chat endpoint error:', error);
        next(error);
      }
    });

    // Query analysis endpoint - get Top-K recommendations
    app.post('/api/query/analyze', async (req, res, next) => {
      try {
        const { question } = req.body;
        if (!question) {
          return res.status(400).json({ error: 'Question is required' });
        }
        
        const analysis = await ragService.analyzeQuery(question);
        res.json(analysis);
      } catch (error) {
        next(error);
      }
    });

    // List all documents endpoint
    app.get('/api/documents', async (req, res, next) => {
      try {
        const result = await ragService.listDocuments();
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Get collection statistics endpoint
    app.get('/api/collection/stats', async (req, res, next) => {
      try {
        const result = await ragService.getCollectionStats();
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Delete document endpoint
    app.delete('/api/documents/:source', async (req, res, next) => {
      try {
        const { source } = req.params;
        if (!source) {
          return res.status(400).json({ error: 'Source is required' });
        }
        const result = await ragService.deleteDocument(decodeURIComponent(source));
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Qdrant Cloud connection endpoints
    app.post('/api/qdrant-cloud/connect', async (req, res, next) => {
      try {
        const { url, apiKey, collectionName } = req.body;
        if (!url || !apiKey) {
          return res.status(400).json({ error: 'URL and API Key are required' });
        }
        const result = await ragService.connectToQdrantCloud(url, apiKey, collectionName);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    app.post('/api/qdrant-cloud/disconnect', async (req, res, next) => {
      try {
        const result = await ragService.disconnectFromQdrantCloud();
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    app.get('/api/qdrant-cloud/status', async (req, res, next) => {
      try {
        const result = await ragService.getQdrantCloudStatus();
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // --- Bulk PDF Processing Endpoints ---

    // Start bulk PDF processing
    app.post('/api/bulk-pdf/process', async (req, res, next) => {
      try {
        const { pdfDirectory } = req.body;
        const { opId } = req.query;
        
        if (!pdfDirectory) {
          return res.status(400).json({ error: 'PDF directory path is required' });
        }

        if (!opId) {
          return res.status(400).json({ error: 'Operation ID is required for progress tracking' });
        }

        // Start processing in background
        bulkPdfService.processDirectory(pdfDirectory, opId)
          .catch(error => {
            logger.error(`Bulk PDF processing failed: ${error.message}`);
          });

        res.status(202).json({ 
          message: 'Bulk PDF processing started',
          operationId: opId,
          status: 'processing'
        });
      } catch (error) {
        next(error);
      }
    });

    // Resume bulk PDF processing
    app.post('/api/bulk-pdf/resume', async (req, res, next) => {
      try {
        const { opId } = req.query;
        
        if (!opId) {
          return res.status(400).json({ error: 'Operation ID is required for progress tracking' });
        }

        // Start resume processing in background
        bulkPdfService.resumeProcessing(opId)
          .catch(error => {
            logger.error(`Bulk PDF resume failed: ${error.message}`);
          });

        res.status(202).json({ 
          message: 'Bulk PDF processing resumed',
          operationId: opId,
          status: 'resuming'
        });
      } catch (error) {
        next(error);
      }
    });

    // Get bulk PDF processing stats
    app.get('/api/bulk-pdf/stats', async (req, res, next) => {
      try {
        const stats = await bulkPdfService.getStats();
        res.json(stats);
      } catch (error) {
        next(error);
      }
    });

    // Clear bulk PDF manifest
    app.delete('/api/bulk-pdf/manifest', async (req, res, next) => {
      try {
        const result = await bulkPdfService.clearManifest();
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      logger.error(err.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
      });
    });

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      console.log(`Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to initialize application:', error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize the application
initializeApp().catch(error => {
  logger.error('Fatal error during initialization:', error);
  console.error('Fatal error during initialization:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (bulkPdfService) {
    bulkPdfService.close();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (bulkPdfService) {
    bulkPdfService.close();
  }
  process.exit(0);
});
