# Chai RAG - Hitesh Choudhary Edition

A beautiful, modern RAG (Retrieval-Augmented Generation) application featuring Hitesh Choudhary's authentic teaching style and personality. This AI-powered knowledge assistant helps you create your own personal knowledge base by ingesting documents, websites, and text, then querying it with natural language in Hitesh's characteristic Hinglish communication style - complete with chai analogies and no-spoon-feeding approach!

## ✨ Features

### 🎯 Hitesh Sir's Authentic Experience
- **Authentic Hinglish Communication**: Natural mixing of Hindi-English with phrases like "Haan ji", "dekho", "samjha?", "chal"
- **Chai Analogies**: Programming concepts explained through chai references - "Python is like chai - simple, flexible, everyone loves it"
- **No-Spoon-Feeding Teaching**: Guides you to solutions with "Try karo pehle", "logic samjho", encourages independent thinking
- **Cultural References**: Everyday Indian examples - cricket teams, mom's recipes, tapri chai orders
- **Motivational Approach**: "Galti karna normal hai, seekhna important hai" - encouraging but challenging

### 💻 Technical Features
- **Enhanced Modern UI**: Glassmorphism design with improved typography, spacing, and visual hierarchy
- **Multi-format Document Support**: PDF, DOCX, TXT, MD, CSV, VTT, and SRT files with intelligent processing
- **Multiple File Upload**: Process up to 10 files simultaneously with batch processing
- **Smart Subtitle Handling**: Optional timestamp removal for VTT/SRT files with timing preservation
- **Recursive Website Crawling**: Automatically discover and index entire websites with robots.txt support
- **Real-time Progress Tracking**: Live updates during ingestion with Server-Sent Events (SSE)
- **Advanced Document Management**: View and refresh sources with read-only access for data integrity
- **Qdrant Cloud Integration**: Optional cloud-based vector database for enterprise scalability
- **Enhanced Text Formatting**: Improved readability with proper line breaks, spacing, and structure

## 🎨 Enhanced UI Design

The application features a stunning glassmorphism design with recent improvements:

### Visual Enhancements
- **Enhanced Layout**: Wider sidebar (384px) with better component spacing and breathing room
- **Improved Typography**: Better font sizes, line heights (1.8), and letter spacing for readability
- **Enhanced Glassmorphism**: Translucent panels with backdrop blur and optimized transparency
- **Better Color Scheme**: Purple-to-indigo gradients with improved contrast ratios
- **Modern Icons**: Lucide React icons with consistent sizing and styling
- **Responsive Chat Interface**: Larger message bubbles with better spacing and visual hierarchy

### User Experience Improvements
- **Enhanced Input Areas**: Larger text areas and input fields with better focus states
- **Improved Progress Visualization**: Real-time progress bars with better visual feedback
- **Better Loading States**: Smooth animations and micro-interactions for all loading states
- **Clear Visual Hierarchy**: Better section headers, spacing, and component organization
- **Mobile-First Design**: Responsive layout that works seamlessly across all devices

## 🏗️ High-level Architecture

```
├── frontend/                 # Next.js frontend with beautiful UI
├── backend/                  # Express.js API server
├── docs/                     # Documentation and project files
├── FIGMA_SAMPLE/            # Design reference and components
└── docker-compose.yml       # Container orchestration
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose (for local development)
- Valid Google API key for Gemini AI
- Node.js 18+ (for local development)
- Supabase account (for chat persistence)
- Qdrant Cloud account (for production deployment)

### Environment Setup

1. **Clone the repository**:
```bash
   git clone <repository-url>
   cd chai-rag-feat-add-nextjs-frontend
   ```

2. **Set up environment variables**:
   Create `backend/.env`:
   ```env
GOOGLE_API_KEY=your_google_api_key_here
   QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=documents
PORT=3000
```

   Create `frontend/.env.local` for chat persistence:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **Start the application**:
```bash
   # Build and start all services
   docker compose build
   docker compose up -d
```

4. **Access the application**:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Qdrant Vector DB: http://localhost:6333

## 🌐 Production Deployment

### Vercel Deployment (Recommended)

For production deployment, we recommend using **Vercel for the frontend** and **Railway for the backend**:

1. **Frontend on Vercel**: 
   - Automatic deployments from Git
   - Global CDN and edge functions
   - Built-in analytics and monitoring

2. **Backend on Railway**:
   - Easy Express.js deployment
   - Automatic scaling
   - Cost-effective for APIs

3. **Database on Qdrant Cloud**:
   - Managed vector database
   - Better performance than local instances
   - Enterprise-grade reliability

📖 **Complete deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

### Quick Deploy Commands

```bash
# Deploy backend to Railway
cd backend
railway up

# Deploy frontend to Vercel
cd frontend
vercel --prod
```

### Qdrant Cloud Configuration (Optional)

For enhanced scalability and performance, you can optionally use Qdrant Cloud instead of the local Qdrant instance:

1. **Get Qdrant Cloud Credentials**:
   - Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
   - Create a new cluster
   - Get your cluster URL and API key

2. **Configure in the Application**:
   - Open the application in your browser
   - Click "Use Qdrant Cloud" in the sidebar
   - Enter your cluster URL (e.g., `https://your-cluster.qdrant.io`)
   - Enter your API key
   - Specify a collection name (default: `documents`)
   - Click "Connect"

3. **Benefits of Qdrant Cloud**:
   - **Scalability**: Handle larger datasets and higher traffic
   - **Performance**: Optimized infrastructure for vector operations
   - **Reliability**: Managed service with high availability
   - **Security**: Enterprise-grade security and compliance
   - **Monitoring**: Built-in analytics and monitoring tools

### Supabase Setup for Chat Persistence

For enhanced chat experience with message history and session management:

1. **Create Supabase Project**:
   - Sign up at [Supabase](https://supabase.com/)
   - Create a new project
   - Get your project URL and anon key

2. **Set up Database Tables**:
   Run the SQL schema from `frontend/supabase-schema.sql` in your Supabase SQL editor:
   ```sql
   -- Create chat_messages table for storing chat history
   CREATE TABLE IF NOT EXISTS chat_messages (
       id TEXT PRIMARY KEY,
       role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
       content TEXT NOT NULL,
       session_id TEXT NOT NULL,
       timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create chat_sessions table for managing chat sessions
   CREATE TABLE IF NOT EXISTS chat_sessions (
       id TEXT PRIMARY KEY,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Configure Environment Variables**:
   Add your Supabase credentials to `frontend/.env.local`

4. **Benefits of Chat Persistence**:
   - **Session Management**: Maintain conversation context across browser sessions
   - **Chat History**: Access to previous conversations and learning progress
   - **Source Attribution**: Track which documents informed each AI response
   - **Better UX**: Seamless conversation flow without losing context

## 🛠️ Technology Stack

### Backend
- **Node.js & Express**: Fast, unopinionated web framework
- **LangChain**: LLM framework for RAG implementation
- **Google Gemini AI**: Advanced language model for embeddings and chat
- **Qdrant**: High-performance vector database
- **Cheerio**: Server-side HTML parsing for web crawling
- **pdf-parse & mammoth**: Document parsing for PDF and DOCX files

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first styling with custom design system
- **Glassmorphism**: Modern UI effects with backdrop blur and transparency
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Real-time Updates**: SSE integration for live progress tracking

### API Endpoints

#### Core Functionality
- `POST /api/text` - Add raw text content to the knowledge base
- `POST /api/crawl` - Recursively crawl websites with robots.txt support
- `POST /api/documents` - Upload and process multiple files (up to 10 files)
- `POST /api/query` - Query the knowledge base in Hitesh's Hinglish style
- `GET /api/documents` - List all documents with metadata and chunk counts
- `GET /api/documents` - List all documents with metadata and chunk counts (read-only)
- `GET /api/progress/:opId` - SSE endpoint for real-time progress updates

#### Chat Functionality
- `POST /api/chat` - Frontend chat endpoint that proxies to backend query API
- **Response Format**: Returns both answer and sources for enhanced transparency
- **Session Management**: Integrates with Supabase for chat persistence
- **Source Attribution**: Includes document sources with each AI response

#### Qdrant Cloud Integration
- `POST /api/qdrant-cloud/connect` - Connect to Qdrant Cloud instance
- `POST /api/qdrant-cloud/disconnect` - Switch back to local Qdrant
- `GET /api/qdrant-cloud/status` - Check cloud connection status

## 🌟 Website Crawling Features

The recursive website crawler includes:

- **Link Discovery**: Automatically finds and follows internal links
- **Domain Filtering**: Only crawls pages within the same domain
- **Robots.txt Support**: Respects website crawling policies
- **Rate Limiting**: Configurable delays between requests (1 second default)
- **Page Limits**: Maximum 50 pages per crawl to prevent infinite loops
- **Content Extraction**: Cleans HTML and extracts meaningful text content
- **Error Handling**: Gracefully handles failed requests and continues crawling
- **Flexible URL Matching**: Handles URL encoding variations and trailing slashes

## 📊 Progress Tracking

Real-time progress updates include:

- **Overall Progress**: Percentage-based progress bar
- **Step-by-step Updates**: Detailed status for each operation
- **Visual Indicators**: Icons showing completed, active, and pending steps
- **Error Reporting**: Clear error messages with retry options
- **Auto-refresh**: Document list updates automatically after ingestion

## 🗂️ Document Management

The Sources panel provides:

- **Document Overview**: Shows titles, URLs, and chunk counts
- **Clickable Links**: Direct access to web sources
- **Smart Filtering**: Include/exclude sources from AI responses without data loss
- **Refresh Capability**: Manual refresh of the document list
- **Loading States**: Visual feedback during operations
- **Error Handling**: Improved error messages for failed operations

## 🐳 Docker Configuration

### Leaner Images

The Docker setup has been optimized for size and performance:

- **Multi-stage Builds**: Separate build and runtime stages
- **Production Dependencies**: Only necessary packages included
- **Non-root Users**: Enhanced security with dedicated users
- **Node.js 20**: Latest LTS version with global APIs
- **Next.js Standalone**: Optimized output for containerized deployments

### Services

- **Frontend**: Next.js application on port 3001
- **Backend**: Express.js API on port 3000
- **Qdrant**: Vector database on port 6333

## 🔒 Security Features

- **Environment Variables**: Secure configuration management
- **Non-root Containers**: Enhanced container security
- **Input Validation**: Server-side validation of all inputs
- **Error Handling**: Graceful error handling without information leakage
- **Rate Limiting**: Protection against abuse

## 🎯 Ingestion Behaviors

### File Processing
- **PDF**: Direct text extraction using pdf-parse
- **DOCX**: Raw text extraction using mammoth
- **TXT/MD**: UTF-8 text processing for plain text and markdown files
- **CSV**: Tabular data conversion to readable text format
- **VTT/SRT**: Subtitle file processing with optional timestamp removal
- **Multiple Files**: Batch processing of up to 10 files simultaneously
- **Chunking**: 1000-character chunks with 200-character overlap

### Website Crawling
- **Recursive Discovery**: Finds all internal links automatically
- **Content Cleaning**: Removes scripts, styles, and navigation elements
- **Text Extraction**: Converts HTML to clean, readable text
- **Metadata Preservation**: Maintains source URLs and page titles
- **Robust Error Handling**: Continues crawling even if individual pages fail

### Text Processing
- **Direct Input**: Immediate processing of typed text
- **Chunking**: Automatic text splitting for optimal retrieval
- **Metadata**: Source tracking for attribution

## 🚀 Performance Optimizations

- **Vector Indexing**: Efficient similarity search with Qdrant
- **Chunked Storage**: Optimal document splitting for retrieval
- **Lazy Loading**: Progressive loading of UI components
- **Caching**: Intelligent caching of frequently accessed data
- **Background Processing**: Non-blocking ingestion operations

## 🔧 Latest Updates & Improvements

### ✨ Hitesh Choudhary Persona Integration
- **Authentic Personality**: Real Hitesh teaching style with natural Hinglish communication
- **Chai Analogies**: Programming concepts explained through chai references and cultural examples
- **No-Spoon-Feeding Philosophy**: Guides users with "Try karo pehle", "logic samjho" approach
- **Motivational Teaching**: Encouraging but challenging approach with Indian cultural context
- **Short & Concise Responses**: Maximum 150 words with proper formatting and line breaks

### 🎨 Enhanced User Interface
- **Wider Sidebar**: Increased from 320px to 384px for better component spacing
- **Improved Typography**: Better font sizes, line heights (1.8), and letter spacing
- **Enhanced Chat Interface**: Larger message bubbles with better visual hierarchy
- **Better Input Areas**: Larger text areas and improved focus states
- **Visual Hierarchy**: Clear section headers, proper spacing, and component organization
- **Chat Input at Top**: Input bar positioned at top for better UX and accessibility
- **Newest Messages First**: Latest chat messages appear at top for intuitive conversation flow
- **Scroll to Bottom Button**: Easy access to older messages with floating navigation button

### 🚀 Advanced Features
- **Qdrant Cloud Support**: Optional cloud-based vector database with connection management
- **Multiple File Upload**: Process up to 10 files simultaneously with batch processing
- **Smart Subtitle Processing**: VTT/SRT support with optional timestamp removal
- **Enhanced Text Formatting**: Improved readability with proper line breaks and structure
- **Smart Source Filtering**: Choose which sources to include/exclude from AI responses without deleting data

### 💬 Enhanced Chat Experience
- **Intuitive Chat Flow**: Input bar at top, newest messages at top for natural conversation
- **Message Persistence**: Supabase integration for chat history and session management
- **Source Attribution**: Display of document sources below AI responses for transparency
- **Session Management**: Clear session button to start fresh conversations
- **Auto-resizing Input**: Smart textarea that grows with content for better typing experience
- **Real-time Loading**: Visual feedback during AI processing with animated indicators

### 🐛 Critical Bug Fixes
- **Crawler Delay Conflict**: Fixed naming conflict between delay property and method
- **Frontend Syntax Errors**: Resolved template literal and JSX compilation issues
- **URL Matching Issues**: Enhanced document deletion with flexible URL handling
- **Sources Panel Restoration**: Re-added document management interface
- **Progress Tracking**: Improved real-time updates with better error handling

### 🎯 Latest Chat Interface Improvements
- **Input Bar Positioning**: Moved chat input to top for better accessibility and UX
- **Message Ordering**: Newest messages appear at top for intuitive conversation flow
- **Scroll Navigation**: Added floating scroll-to-bottom button for easy access to older messages
- **ESLint Compliance**: Fixed all TypeScript/ESLint errors for clean Docker builds
- **Type Safety**: Replaced `any` types with proper `Source` interface for better code quality
- **Chat Persistence**: Full Supabase integration for message history and session management

## 📝 Development

### Local Development

1. Clone the repository
2. Install dependencies: `npm install` in both frontend and backend
3. Set up environment variables
4. Start services: `docker compose up -d`
5. Access the application at http://localhost:3001

### Building for Production

```bash
# Build all services
docker compose build

# Start in production mode
docker compose -f docker-compose.yml up -d
```

### Troubleshooting

#### Common Issues
- **Crawler Issues**: Check the backend logs for detailed error messages, verify robots.txt compliance
- **Document Deletion**: Try refreshing sources list, check URL encoding variations
- **File Upload Errors**: Ensure files are under size limits, check supported formats
- **Formatting Issues**: Verify system prompt is properly loaded, check post-processing functions
- **Qdrant Cloud**: Verify credentials, check network connectivity to cloud instance
- **Chat Persistence**: Ensure Supabase credentials are correct, check database table setup
- **Message Ordering**: Verify chat component is using latest version with proper message ordering
- **ESLint Build Errors**: Check for TypeScript type issues, ensure all `any` types are properly defined

#### Performance Optimization
- **Large Datasets**: Consider using Qdrant Cloud for better performance
- **Slow Responses**: Check chunk size configuration and vector database performance
- **Memory Usage**: Monitor container resources during large file processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful language model capabilities
- **LangChain** for the excellent RAG framework
- **Qdrant** for high-performance vector storage
- **Next.js** for the modern React framework
- **Tailwind CSS** for the utility-first styling approach
