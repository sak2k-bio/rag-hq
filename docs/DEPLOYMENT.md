# 🚀 Deployment Guide - Chai RAG Application

## 📋 Deployment Options

### Option 1: Frontend on Vercel + Backend on Cloud Platform (Recommended)
- **Frontend**: Next.js app deployed on Vercel
- **Backend**: Express.js API on Railway/Render/Heroku
- **Database**: Qdrant Cloud for vector storage
- **Chat Storage**: Supabase for message persistence

### Option 2: Full Vercel Deployment (Advanced)
- **Frontend**: Next.js app on Vercel
- **Backend**: Converted to Vercel serverless functions
- **Database**: Qdrant Cloud
- **Storage**: Vercel KV for sessions

---

## 🎯 Option 1: Frontend on Vercel + Backend on Cloud

### Step 1: Deploy Backend to Railway

1. **Sign up for Railway**:
   - Go to [railway.app](https://railway.app/)
   - Sign in with GitHub

2. **Create New Project**:
   ```bash
   # Clone your repository
   git clone <your-repo-url>
   cd chai-rag-feat-add-nextjs-frontend
   
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

3. **Deploy Backend**:
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Set Environment Variables**:
   ```env
   GOOGLE_API_KEY=your_google_api_key
   QDRANT_URL=https://your-qdrant-cloud-url
   QDRANT_API_KEY=your_qdrant_api_key
   PORT=3000
   ```

5. **Get Backend URL**:
   - Railway will provide a public URL
   - Copy this URL for frontend configuration

### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy from Frontend Directory**:
   ```bash
   cd frontend
   vercel
   ```

3. **Configure Environment Variables**:
   ```bash
   vercel env add NEXT_PUBLIC_BACKEND_URL
   # Enter your Railway backend URL
   
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   # Enter your Supabase URL
   
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # Enter your Supabase anon key
   ```

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

---

## 🌐 Option 2: Full Vercel Deployment

### Step 1: Convert Backend to Serverless Functions

Create `frontend/src/app/api/query/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RAGService } from '../../../lib/ragService';

const ragService = new RAGService();

export async function POST(req: NextRequest) {
    try {
        const { question } = await req.json();
        
        const result = await ragService.query(question);
        
        return NextResponse.json({
            answer: result.answer,
            sources: result.sources
        });
    } catch (error) {
        console.error('Query error:', error);
        return NextResponse.json(
            { error: 'Failed to process query' },
            { status: 500 }
        );
    }
}
```

### Step 2: Create RAG Service Library

Create `frontend/src/lib/ragService.ts`:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from 'qdrant-js';

export class RAGService {
    private genAI: GoogleGenerativeAI;
    private qdrant: QdrantClient;
    
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        this.qdrant = new QdrantClient({
            url: process.env.QDRANT_URL!,
            apiKey: process.env.QDRANT_API_KEY
        });
    }
    
    async query(question: string) {
        // Implementation here
        // This is a simplified version
        return {
            answer: "Response from AI",
            sources: []
        };
    }
}
```

### Step 3: Update Package.json

Add required dependencies:
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.2.0",
    "qdrant-js": "^1.7.0"
  }
}
```

---

## 🔧 Environment Variables Setup

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env)
```env
GOOGLE_API_KEY=your_google_api_key
QDRANT_URL=https://your-qdrant-cloud-url
QDRANT_API_KEY=your_qdrant_api_key
PORT=3000
```

---

## 🚀 Quick Deploy Commands

### Railway Backend
```bash
cd backend
railway up
```

### Vercel Frontend
```bash
cd frontend
vercel --prod
```

---

## 📱 Post-Deployment

1. **Test Chat Functionality**: Ensure AI responses work
2. **Verify File Uploads**: Test document ingestion
3. **Check Sources Display**: Verify document sources appear
4. **Test Chat Persistence**: Ensure Supabase integration works

---

## 🆘 Troubleshooting

### Common Issues:
- **CORS Errors**: Ensure backend allows frontend domain
- **API Timeouts**: Increase function timeout in vercel.json
- **Environment Variables**: Verify all env vars are set correctly
- **Database Connection**: Check Qdrant Cloud connectivity

### Debug Commands:
```bash
# Check Vercel deployment status
vercel ls

# View Vercel logs
vercel logs

# Check Railway deployment
railway status
```

---

## 💡 Recommendations

1. **Start with Option 1**: Easier to implement and debug
2. **Use Qdrant Cloud**: Better performance than local instance
3. **Monitor Costs**: Vercel and Railway have usage-based pricing
4. **Set Up Monitoring**: Use Vercel Analytics and Railway metrics

---

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Qdrant Cloud](https://cloud.qdrant.io/)
- [Supabase Documentation](https://supabase.com/docs)
