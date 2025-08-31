"use client";

import type { NextPage } from 'next';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { SimpleChat } from '../components/SimpleChat';

const API_URL = 'http://localhost:3000/api';

const Home: NextPage = () => {
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingestion progress and sources
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [allDocuments, setAllDocuments] = useState<Array<{ source: string; title: string; chunks: number; lastUpdated: string }>>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // State for timestamp removal
  const [removeTimestamps, setRemoveTimestamps] = useState(false);

  // State for Qdrant Cloud configuration
  const [useQdrantCloud, setUseQdrantCloud] = useState(false);
  const [qdrantCloudConfig, setQdrantCloudConfig] = useState({
    url: '',
    apiKey: '',
    collectionName: 'documents'
  });
  const [isConnectingToCloud, setIsConnectingToCloud] = useState(false);
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // State for source filtering
  const [excludedSources, setExcludedSources] = useState<Set<string>>(new Set());
  const [showSourceFilters, setShowSourceFilters] = useState(false);

  // State for collection statistics
  const [collectionStats, setCollectionStats] = useState<{
    totalVectors: number;
    uniqueSources: number;
    totalChunks: number;
    exists: boolean;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    return () => {
      // cleanup SSE on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Load all documents on component mount
  useEffect(() => {
    fetchAllDocuments();
    fetchCollectionStats();
    checkCloudConnectionStatus();
  }, []);

  const checkCloudConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/qdrant-cloud/status`);
      if (response.data.success) {
        if (response.data.isUsingCloud) {
          setCloudConnectionStatus('connected');
          setUseQdrantCloud(true);
          if (response.data.config) {
            setQdrantCloudConfig(prev => ({
              ...prev,
              url: response.data.config.url,
              collectionName: response.data.config.collectionName
            }));
          }
        } else {
          setCloudConnectionStatus('disconnected');
          setUseQdrantCloud(false);
        }
      }
    } catch (err) {
      console.error('Failed to check cloud connection status:', err);
      setCloudConnectionStatus('disconnected');
    }
  };

  const fetchAllDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await axios.get(`${API_URL}/documents`);
      if (response.data.success && Array.isArray(response.data.documents)) {
        setAllDocuments(response.data.documents);
      } else {
        console.error('Invalid response format:', response.data);
        setAllDocuments([]);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try refreshing.');
      setAllDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const fetchCollectionStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await axios.get(`${API_URL}/collection/stats`);
      if (response.data.success) {
        setCollectionStats(response.data.stats);
      } else {
        console.error('Invalid stats response format:', response.data);
        setCollectionStats(null);
      }
    } catch (err) {
      console.error('Failed to fetch collection stats:', err);
      setCollectionStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  };


  // Source filtering functions
  const toggleSourceExclusion = (source: string) => {
    setExcludedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(source)) {
        newSet.delete(source);
      } else {
        newSet.add(source);
      }
      return newSet;
    });
  };

  const resetSourceFilters = () => {
    setExcludedSources(new Set());
  };

  const getActiveSourcesCount = () => {
    return allDocuments.length - excludedSources.size;
  };

  const handleError = (err: unknown, defaultMessage: string) => {
    let message = defaultMessage;
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      message = err.response.data.message as string;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setError(message);
    console.error(err);
  };

  const explainProgress = (message: string) => {
    // Lightweight narrator for progress messages
    if (!message) return '';
    if (message.startsWith('Starting recursive crawl')) return 'Starting recursive website crawl…';
    if (message.startsWith('Checking robots.txt')) return 'Checking robots.txt…';
    if (message.startsWith('Crawling page')) return message; // Keep detailed page info
    if (message.startsWith('Processing page')) return message; // Keep detailed processing info
    if (message.startsWith('Processing') && message.includes('pages for embeddings')) return message;
    if (message.startsWith('Chunking all pages')) return 'Splitting all pages into chunks…';
    if (message.startsWith('Storing') && message.includes('chunks from')) return message;
    if (message.startsWith('Crawl complete')) return message;
    if (message.startsWith('Fetching page')) return 'Fetching page…';
    if (message.startsWith('Extracting content')) return 'Extracting content…';
    if (message.startsWith('Chunking')) return 'Splitting into chunks…';
    if (message.startsWith('Storing')) return 'Storing chunks…';
    if (message.startsWith('Uploading file')) return 'Uploading file…';
    if (message.startsWith('Reading file')) return 'Reading file…';
    if (message.startsWith('Extracting text from PDF')) return 'Reading PDF text…';
    if (message.startsWith('Extracting text from DOCX')) return 'Reading DOCX text…';
    if (message.startsWith('Reading text file')) return 'Reading text…';
    if (message.startsWith('Starting crawl')) return 'Starting crawl…';
    if (message.startsWith('Text processed')) return 'Text processed.';
    if (message.toLowerCase().startsWith('error')) return `Error: ${message.replace(/^Error:\s*/, '')}`;
    if (message.toLowerCase().includes('skipped')) return message; // Keep skip messages
    if (message.toLowerCase().includes('warning')) return message; // Keep warning messages
    return message;
  };

  const createOpId = () => `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const startProgressStream = (opId: string) => {
    // Reset state and open SSE
    setProgressLines([]);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    const url = `${API_URL}/progress/${opId}`.replace('/api/api/', '/api/'); // guard against double /api
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setProgressLines((prev: string[]) => [...prev, 'Connected.']);
    });

    es.addEventListener('progress', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data || '{}');
        const friendly = explainProgress(data.message as string);
        if (friendly) setProgressLines((prev: string[]) => [...prev, friendly]);
      } catch {
        setProgressLines((prev: string[]) => [...prev, 'Working…']);
      }
    });

    es.addEventListener('done', () => {
      try {
        setProgressLines((prev: string[]) => [...prev, 'Done.']);
        // Refresh the full documents list after new ingestion
        fetchAllDocuments();
      } catch {
        setProgressLines((prev: string[]) => [...prev, 'Done.']);
      } finally {
        es.close();
        eventSourceRef.current = null;
      }
    });

    es.onerror = () => {
      setProgressLines((prev: string[]) => [...prev, 'Connection lost.']);
    };
  };

  const handleAddText = async () => {
    if (!textInput.trim()) return;
    setIsLoadingText(true);
    setError(null);
    const opId = createOpId();
    startProgressStream(opId);
    try {
      await axios.post(`${API_URL}/text`, { text: textInput }, { params: { opId } });
      setTextInput('');
    } catch (err) {
      handleError(err, 'Failed to add text.');
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleCrawlUrl = async () => {
    if (!urlInput.trim()) return;
    setIsLoadingUrl(true);
    setError(null);
    const opId = createOpId();
    startProgressStream(opId);
    try {
      await axios.post(`${API_URL}/crawl`, { url: urlInput }, { params: { opId } });
      setUrlInput('');
    } catch (err) {
      handleError(err, 'Failed to crawl website.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;
    const files = Array.from(event.target.files);
    setIsLoadingFile(true);
    setError(null);
    const opId = createOpId();
    startProgressStream(opId);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('document', file));
      await axios.post(`${API_URL}/documents`, formData, {
        params: { opId, removeTimestamps },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      handleError(err, 'Failed to upload file.');
    } finally {
      setIsLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };



  const connectToQdrantCloud = async () => {
    if (!qdrantCloudConfig.url || !qdrantCloudConfig.apiKey) {
      setError('Please provide both Qdrant Cloud URL and API Key');
      return;
    }

    setIsConnectingToCloud(true);
    setCloudConnectionStatus('connecting');
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/qdrant-cloud/connect`, {
        url: qdrantCloudConfig.url,
        apiKey: qdrantCloudConfig.apiKey,
        collectionName: qdrantCloudConfig.collectionName
      });

      if (response.data.success) {
        setCloudConnectionStatus('connected');
        setError(null);
        // Refresh documents list to show cloud data
        await fetchAllDocuments();
      } else {
        throw new Error(response.data.message || 'Failed to connect to Qdrant Cloud');
      }
    } catch (err) {
      setCloudConnectionStatus('error');
      handleError(err, 'Failed to connect to Qdrant Cloud. Please check your credentials.');
    } finally {
      setIsConnectingToCloud(false);
    }
  };

  const disconnectFromQdrantCloud = async () => {
    try {
      await axios.post(`${API_URL}/qdrant-cloud/disconnect`);
      setCloudConnectionStatus('disconnected');
      setUseQdrantCloud(false);
      // Refresh documents list to show local data
      await fetchAllDocuments();
    } catch (err) {
      handleError(err, 'Failed to disconnect from Qdrant Cloud.');
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex">
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 backdrop-blur-sm border border-red-400/50 rounded-lg p-4 max-w-md">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-96 bg-black/20 backdrop-blur-md border-r border-white/10 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">RAG - High Quality Edition</h1>
            <p className="text-white/60 text-sm">High Quality Edition</p>
          </div>

          {/* Add Text Section */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <h3 className="font-semibold">Add Text</h3>
            </div>
            <textarea
              placeholder="Type or paste text here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full min-h-[100px] bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20 rounded-md p-3 resize-none mb-3"
              disabled={isLoadingText}
            />
            <button
              onClick={handleAddText}
              disabled={!textInput.trim() || isLoadingText}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingText ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              {isLoadingText ? 'Adding...' : 'Add Text'}
            </button>
          </div>

          {/* Crawl Website Section */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              <h3 className="font-semibold">Crawl Website</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-green-400 focus:ring-green-400/20 rounded-md p-2"
                disabled={isLoadingUrl}
              />
              <button
                onClick={handleCrawlUrl}
                disabled={!urlInput.trim() || isLoadingUrl}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingUrl ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="font-semibold">Progress</h3>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {progressLines.map((line, index) => (
                <div key={index} className="text-xs text-white/70 bg-white/5 rounded px-2 py-1">
                  {line}
                </div>
              ))}
              {progressLines.length === 0 && (
                <div className="text-xs text-white/40 italic">No recent activity</div>
              )}
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="font-semibold">Upload Files</h3>
            </div>

            {/* Timestamp Removal Toggle */}
            <div className="mb-3 p-2 bg-white/5 rounded border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/80 cursor-pointer">
                  Remove timestamps from subtitle files
                </label>
                <input
                  type="checkbox"
                  id="removeTimestamps"
                  checked={removeTimestamps}
                  onChange={(e) => setRemoveTimestamps(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                />
              </div>
              <p className="text-xs text-white/60 mt-1">
                {removeTimestamps
                  ? "Timestamps will be removed for cleaner text"
                  : "Timestamps will be preserved for timing information"
                }
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx,.md,.csv,.vtt,.srt"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingFile ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              {isLoadingFile ? 'Uploading...' : 'Upload Files'}
            </button>

            {/* Supported Formats */}
            <div className="mt-3 text-xs text-white/60">
              <p className="mb-2 font-medium">Supported formats:</p>
              <div className="grid grid-cols-2 gap-1">
                <span>• PDF (.pdf)</span>
                <span>• DOCX (.docx)</span>
                <span>• Text (.txt)</span>
                <span>• Markdown (.md)</span>
                <span>• CSV (.csv)</span>
                <span>• Subtitles (.vtt, .srt)</span>
              </div>
            </div>
          </div>

          {/* Collection Statistics Section */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-semibold">Collection Stats</h3>
              </div>
              <button
                onClick={fetchCollectionStats}
                disabled={isLoadingStats}
                className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded px-2 py-1 transition-colors disabled:opacity-50"
                title="Refresh collection statistics"
              >
                {isLoadingStats ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {collectionStats ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-white/60">Total Vectors</div>
                    <div className="text-white font-semibold">{collectionStats.totalVectors.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-white/60">Unique Sources</div>
                    <div className="text-white font-semibold">{collectionStats.uniqueSources.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-white/60">Total Chunks</div>
                    <div className="text-white font-semibold">{collectionStats.totalChunks.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-white/60 text-center">
                  Collection: {collectionStats.exists ? 'Active' : 'Empty'}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={fetchCollectionStats}
                  disabled={isLoadingStats}
                  className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded px-3 py-2 transition-colors disabled:opacity-50"
                >
                  {isLoadingStats ? 'Loading Stats...' : 'Load Collection Statistics'}
                </button>
              </div>
            )}
          </div>

          {/* Sources Section */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="font-semibold">Sources</h3>
                <span className="text-xs text-white/60">
                  ({getActiveSourcesCount()}/{allDocuments.length} active)
                  {collectionStats && collectionStats.uniqueSources > allDocuments.length && (
                    <span className="text-yellow-400 ml-1">
                      (of ~{collectionStats.uniqueSources.toLocaleString()} total)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSourceFilters(!showSourceFilters)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded px-2 py-1 transition-colors"
                  title="Toggle source filters"
                >
                  {showSourceFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                  onClick={fetchAllDocuments}
                  disabled={isLoadingDocuments}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded px-2 py-1 transition-colors disabled:opacity-50"
                >
                  {isLoadingDocuments ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
            {/* Source Filtering Controls */}
            {showSourceFilters && allDocuments.length > 0 && (
              <div className="mb-3 p-3 bg-white/5 rounded border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/80">Filter Sources</span>
                  <button
                    onClick={resetSourceFilters}
                    className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                    title="Reset all filters"
                  >
                    Reset
                  </button>
                </div>
                <div className="text-xs text-white/60 mb-2">
                  Excluded sources won&apos;t be used in AI responses
                </div>
              </div>
            )}

            <div className="max-h-32 overflow-y-auto space-y-2">
              {allDocuments.length === 0 ? (
                <div className="text-white/40 text-sm">
                  {isLoadingDocuments ? 'Loading documents...' : 'No documents in database.'}
                </div>
              ) : (
                allDocuments.map((doc, i) => (
                  <div key={i} className={`flex items-center justify-between text-sm p-2 rounded border transition-all ${excludedSources.has(doc.source)
                    ? 'bg-red-500/10 border-red-500/20 opacity-60'
                    : 'bg-white/5 border-white/10'
                    }`}>
                    <div className="flex-1 min-w-0">
                      {doc.source.startsWith('http') ? (
                        <a
                          href={doc.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`transition-colors truncate block ${excludedSources.has(doc.source)
                            ? 'text-red-300 hover:text-red-200'
                            : 'text-blue-300 hover:text-blue-200'
                            }`}
                        >
                          {doc.title} ({doc.chunks} chunks)
                        </a>
                      ) : (
                        <span className={`truncate block ${excludedSources.has(doc.source)
                          ? 'text-red-300'
                          : 'text-white/80'
                          }`}>
                          {doc.title} ({doc.chunks} chunks)
                        </span>
                      )}
                    </div>

                    {/* Toggle Source Filter Button */}
                    <button
                      onClick={() => toggleSourceExclusion(doc.source)}
                      className={`ml-2 text-xs transition-colors rounded px-2 py-1 ${excludedSources.has(doc.source)
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                        : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                        }`}
                      title={excludedSources.has(doc.source) ? 'Include source' : 'Exclude source'}
                    >
                      {excludedSources.has(doc.source) ? 'Include' : 'Exclude'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Qdrant Cloud Configuration */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <h3 className="font-semibold">Qdrant Cloud</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${cloudConnectionStatus === 'connected' ? 'bg-green-400' :
                  cloudConnectionStatus === 'connecting' ? 'bg-yellow-400' :
                    cloudConnectionStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                <span className="text-xs text-white/60">
                  {cloudConnectionStatus === 'connected' ? 'Connected' :
                    cloudConnectionStatus === 'connecting' ? 'Connecting...' :
                      cloudConnectionStatus === 'error' ? 'Error' : 'Disconnected'}
                </span>
              </div>
            </div>

            {!useQdrantCloud ? (
              <button
                onClick={() => setUseQdrantCloud(true)}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                Use Qdrant Cloud
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/80 block mb-1">Cloud URL</label>
                  <input
                    type="url"
                    placeholder="https://your-cluster.qdrant.io"
                    value={qdrantCloudConfig.url}
                    onChange={(e) => setQdrantCloudConfig(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-md p-2 text-sm"
                    disabled={cloudConnectionStatus === 'connected'}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 block mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder="Your Qdrant Cloud API Key"
                    value={qdrantCloudConfig.apiKey}
                    onChange={(e) => setQdrantCloudConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-md p-2 text-sm"
                    disabled={cloudConnectionStatus === 'connected'}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/80 block mb-1">Collection Name</label>
                  <input
                    type="text"
                    placeholder="documents"
                    value={qdrantCloudConfig.collectionName}
                    onChange={(e) => setQdrantCloudConfig(prev => ({ ...prev, collectionName: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-md p-2 text-sm"
                    disabled={cloudConnectionStatus === 'connected'}
                  />
                </div>

                <div className="flex gap-2">
                  {cloudConnectionStatus === 'connected' ? (
                    <button
                      onClick={disconnectFromQdrantCloud}
                      className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] text-sm"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={connectToQdrantCloud}
                        disabled={isConnectingToCloud || !qdrantCloudConfig.url || !qdrantCloudConfig.apiKey}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                      >
                        {isConnectingToCloud ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {isConnectingToCloud ? 'Connecting...' : 'Connect'}
                      </button>
                      <button
                        onClick={() => setUseQdrantCloud(false)}
                        className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 rounded-md py-2 px-4 transition-all duration-200 transform hover:scale-[1.02] text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Chat with a unique persona</h2>
              <p className="text-sm text-white/60">Ask questions about your knowledge base</p>
            </div>
            <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-3 py-1 text-sm">
              Online
            </div>
          </div>
        </header>

        {/* Chat Component */}
        <SimpleChat
          onSourcesUpdate={(sources) => {
            // Handle sources update if needed
            console.log('Sources updated:', sources);
          }}
          excludedSources={Array.from(excludedSources)}
        />
      </main>
    </div>
  );
};

export default Home;
