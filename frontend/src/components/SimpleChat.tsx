"use client";

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';

interface Source {
    pageContent: string;
    metadata: {
        source: string;
        [key: string]: unknown;
    };
}

interface QueryAnalysis {
    success: boolean;
    query: string;
    analysis: {
        complexity: string;
        recommendedTopK: number;
        reasoning: string;
        queryLength: number;
        hasTechnicalTerms: boolean;
        hasComplexWords: boolean;
        hasMultipleQuestions: boolean;
    };
}

interface SimpleChatProps {
    onSourcesUpdate?: (sources: Source[]) => void;
    excludedSources?: string[];
}

export function SimpleChat({ excludedSources = [] }: SimpleChatProps) {
    const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; sources?: Source[]; timestamp?: string }>>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    
    // Top-K selection state
    const [topKMode, setTopKMode] = useState<'auto' | 'manual'>('auto');
    const [manualTopK, setManualTopK] = useState<number>(5);
    const [queryAnalysis, setQueryAnalysis] = useState<QueryAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    // Chat sessions list state
    const [chatSessions, setChatSessions] = useState<Array<{ id: string; messageCount: number; lastMessage: string; timestamp: string }>>([]);
    const [showSessionList, setShowSessionList] = useState(false);

    // Conversation context for memory persistence
    const [conversationContext, setConversationContext] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

    // Initialize session and load previous messages
    useEffect(() => {
        initializeChat();
    }, []);

    const initializeChat = async () => {
        try {
            // Generate or retrieve session ID
            let sessionId = localStorage.getItem('chat_session_id');
            if (!sessionId) {
                sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('chat_session_id', sessionId);
            }
            setSessionId(sessionId);

            // Load previous messages from Supabase with proper error handling
            const { data: previousMessages, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error loading messages from Supabase:', error);
                // Continue with empty messages if there's an error
                setMessages([]);
            } else if (previousMessages && previousMessages.length > 0) {
                console.log(`Loaded ${previousMessages.length} messages from Supabase for session: ${sessionId}`);
                
                // Map messages with proper structure including sources
                const mappedMessages = previousMessages.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    sources: msg.sources || [], // Include sources if available
                    timestamp: msg.timestamp
                }));
                
                setMessages(mappedMessages);
                
                // Set up conversation context for memory persistence
                const context = mappedMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                setConversationContext(context);
                console.log(`Conversation context loaded: ${context.length} messages`);
            } else {
                console.log('No previous messages found for session:', sessionId);
                setMessages([]);
            }
        } catch (error) {
            console.error('Error initializing chat:', error);
            setMessages([]);
        }
    };

    // Load available chat sessions
    const loadChatSessions = async () => {
        try {
            const { data: sessions, error } = await supabase
                .from('chat_messages')
                .select('session_id, content, timestamp')
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Error loading chat sessions:', error);
                return;
            }

            // Group messages by session and get session info
            const sessionMap = new Map();
            sessions?.forEach(msg => {
                if (!sessionMap.has(msg.session_id)) {
                    sessionMap.set(msg.session_id, {
                        id: msg.session_id,
                        messageCount: 0,
                        lastMessage: '',
                        timestamp: msg.timestamp
                    });
                }
                const session = sessionMap.get(msg.session_id);
                session.messageCount++;
                if (!session.lastMessage) {
                    session.lastMessage = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
                }
            });

            const sessionList = Array.from(sessionMap.values());
            setChatSessions(sessionList);
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    };

    // Switch to a different chat session
    const switchToSession = async (newSessionId: string) => {
        try {
            setSessionId(newSessionId);
            localStorage.setItem('chat_session_id', newSessionId);
            
            // Load messages for the new session
            const { data: sessionMessages, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('session_id', newSessionId)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error loading session messages:', error);
                setMessages([]);
            } else if (sessionMessages && sessionMessages.length > 0) {
                const mappedMessages = sessionMessages.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    sources: msg.sources || [],
                    timestamp: msg.timestamp
                }));
                setMessages(mappedMessages);
                
                // Set up conversation context for the new session
                const context = mappedMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                setConversationContext(context);
                console.log(`Switched to session ${newSessionId} with ${mappedMessages.length} messages. Conversation context loaded.`);
            } else {
                setMessages([]);
                console.log(`Switched to empty session ${newSessionId}`);
            }
            
            setShowSessionList(false);
        } catch (error) {
            console.error('Error switching sessions:', error);
        }
    };

    // Load sessions when component mounts
    useEffect(() => {
        loadChatSessions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { id: Date.now().toString(), role: 'user' as const, content: input };
        setMessages(prev => [userMessage, ...prev]);
        setInput('');
        setIsLoading(true);

        try {
            // Save user message to Supabase
            await saveMessageToSupabase(userMessage);

            // Get Top-K value based on mode
            const topKValue = topKMode === 'auto' ? null : manualTopK;

            // Create the full conversation context including the new user message
            const fullConversationContext = [
                ...conversationContext,
                { role: 'user' as const, content: input }
            ];
            
            console.log(`Sending conversation context to backend: ${fullConversationContext.length} messages`);
            
            // Use the same backend URL logic as the analyze query
            const backendUrl = 'http://localhost:3000'; // Hardcoded for now
            
            const response = await axios.post(`${backendUrl}/api/query`, {
                messages: fullConversationContext,
                excludedSources,
                topK: topKValue
            });

            const responseData = await response.data;
            console.log('Response received:', responseData);

            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: responseData.answer,
                sources: responseData.sources || []
            };

            // Save assistant message to Supabase
            await saveMessageToSupabase(assistantMessage);

            setMessages(prev => [assistantMessage, ...prev]);
            
            // Update conversation context for memory persistence
            const updatedContext = [
                ...fullConversationContext,
                { role: 'assistant' as const, content: responseData.answer }
            ];
            setConversationContext(updatedContext);
            console.log(`Updated conversation context: ${updatedContext.length} messages`);
            
            // Refresh the session list to show updated counts
            await loadChatSessions();
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Analyze query to get Top-K recommendations
    const analyzeQuery = async (query: string) => {
        if (!query.trim()) return;
        
        setIsAnalyzing(true);
        setQueryAnalysis(null);
        
        try {
            // Use the same backend URL logic as the chat API
            const backendUrl = 'http://localhost:3000'; // Hardcoded for now
            const response = await axios.post(`${backendUrl}/api/query/analyze`, {
                question: query
            });
            
            if (response.data && response.data.success) {
                setQueryAnalysis(response.data);
            } else {
                console.error('Invalid response from query analysis:', response.data);
            }
        } catch (error) {
            console.error('Error analyzing query:', error);
            setQueryAnalysis(null);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const saveMessageToSupabase = async (message: { id: string; role: 'user' | 'assistant'; content: string; sources?: Source[] }) => {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    session_id: sessionId,
                    sources: message.sources || [], // Save sources as JSON
                    timestamp: new Date().toISOString()
                });

            if (error) {
                console.error('Error saving message to Supabase:', error);
            } else {
                console.log(`Message saved to Supabase: ${message.role} - ${message.content.substring(0, 50)}...`);
            }
        } catch (error) {
            console.error('Error saving message to Supabase:', error);
        }
    };

    const clearChatSession = async () => {
        try {
            // Clear messages from Supabase
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('session_id', sessionId);

            if (error) {
                console.error('Error clearing messages:', error);
            } else {
                // Clear local state
                setMessages([]);
                setConversationContext([]); // Clear conversation context
                
                // Generate new session ID
                const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                setSessionId(newSessionId);
                localStorage.setItem('chat_session_id', newSessionId);
                
                // Refresh the session list
                await loadChatSessions();
            }
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    };

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header with Session Management */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-white">Chat History</h3>
                    <div className="text-sm text-white/60">
                        Top-K: {topKMode === 'auto' ? 'Auto' : `Manual (${manualTopK})`}
                    </div>
                    <div className="text-sm text-white/60">
                        Session: {sessionId.substring(0, 8)}... | Context: {conversationContext.length} messages
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSessionList(!showSessionList)}
                        className="px-3 py-1 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-md transition-colors"
                    >
                        {showSessionList ? 'Hide Sessions' : 'Show Sessions'}
                    </button>
                    <button
                        onClick={clearChatSession}
                        className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-md transition-colors"
                    >
                        Clear Session
                    </button>
                </div>
            </div>

            {/* Session List Dropdown */}
            {showSessionList && (
                <div className="p-4 border-b border-white/20 bg-white/5 backdrop-blur-sm">
                    <h4 className="text-sm font-medium text-white/80 mb-3">Previous Chat Sessions</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                        {chatSessions.length > 0 ? (
                            chatSessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => switchToSession(session.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                        session.id === sessionId
                                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                                            : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                Session {session.id.substring(0, 8)}...
                                            </div>
                                            <div className="text-xs text-white/60 truncate">
                                                {session.lastMessage}
                                            </div>
                                        </div>
                                        <div className="text-xs text-white/50 ml-2">
                                            {session.messageCount} messages
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-white/60 text-center py-4">
                                No previous sessions found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Area - Moved to top */}
            <div className="p-4 border-b border-white/20 bg-white/10 backdrop-blur-sm shadow-sm">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                    <div className="flex gap-4">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask a question about your documents..."
                            className="flex-1 bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20 rounded-lg px-4 py-3 resize-none"
                            rows={1}
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg px-6 py-3 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                            Send
                        </button>
                    </div>
                    
                    {/* Top-K Selection Controls */}
                    <div className="mt-4 flex items-center gap-6 text-sm text-white/80">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2">
                                Top-K Selection
                                <span className="text-xs text-white/50" title="Controls how many document chunks to retrieve for answering your question">
                                    ⓘ
                                </span>
                            </span>
                            
                            {/* Auto/Manual Toggle */}
                            <div className="flex bg-white/10 rounded-lg p-1 border border-white/20">
                                <button
                                    type="button"
                                    onClick={() => setTopKMode('auto')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${
                                        topKMode === 'auto' 
                                            ? 'bg-blue-500 text-white shadow-sm' 
                                            : 'text-white/60 hover:text-white/80'
                                    }`}
                                    title="Automatically determine optimal Top-K based on query complexity"
                                >
                                    Auto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTopKMode('manual')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${
                                        topKMode === 'manual' 
                                            ? 'bg-blue-500 text-white shadow-sm' 
                                            : 'text-white/60 hover:text-white/80'
                                    }`}
                                    title="Manually set the number of document chunks to retrieve"
                                >
                                    Manual
                                </button>
                            </div>
                        </div>
                        
                        {/* Manual Top-K Input */}
                        {topKMode === 'manual' && (
                            <div className="flex items-center gap-2">
                                <span>Top-K:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={manualTopK}
                                    onChange={(e) => setManualTopK(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                                    className="w-16 bg-white/10 border border-white/20 text-white text-center rounded px-2 py-1 text-sm focus:border-blue-400 focus:ring-blue-400/20"
                                    title="Number of document chunks to retrieve (1-20)"
                                />
                            </div>
                        )}
                        
                        {/* Query Analysis Button */}
                        <button
                            type="button"
                            onClick={() => analyzeQuery(input)}
                            disabled={!input.trim() || isLoading || isAnalyzing}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            title="Analyze your query to get Top-K recommendations"
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : (
                                'Analyze Query'
                            )}
                        </button>
                    </div>
                    
                    {/* Query Analysis Display */}
                    {queryAnalysis && queryAnalysis.success && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="text-xs text-blue-300 mb-2">Query Analysis:</div>
                            <div className="text-sm text-white/90">
                                <div className="flex items-center gap-4">
                                    <span><strong>Complexity:</strong> {queryAnalysis.analysis.complexity}</span>
                                    <span><strong>Recommended Top-K:</strong> {queryAnalysis.analysis.recommendedTopK}</span>
                                    <span><strong>Current Top-K:</strong> {topKMode === 'auto' ? 'Auto' : manualTopK}</span>
                                </div>
                                <div className="mt-1 text-white/70">{queryAnalysis.analysis.reasoning}</div>
                                {topKMode === 'auto' && (
                                    <div className="mt-2 text-xs text-blue-300">
                                        💡 Auto mode will use Top-K = {queryAnalysis.analysis.recommendedTopK} for this query
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                    >
                        {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">H</span>
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30'
                            : 'bg-white/10 border border-white/20 backdrop-blur-sm'
                            }`}>
                            <div className="prose prose-invert max-w-none">
                                <div
                                    className="text-base leading-relaxed"
                                    style={{
                                        lineHeight: '1.2',
                                        wordSpacing: '0.01em',
                                        letterSpacing: '0.002em'
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: message.content
                                            .replace(/\n\n/g, '<br><br>')
                                            .replace(/\n/g, '<br>')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                            .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>')
                                    }}
                                />

                                {/* Display sources if available */}
                                {message.sources && message.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <div className="text-xs text-white/60 mb-2">Sources ({message.sources.length}):</div>
                                        <div className="space-y-1">
                                            {message.sources.slice(0, 3).map((source: Source, index: number) => (
                                                <div key={index} className="text-xs text-white/70 bg-white/5 rounded px-2 py-1">
                                                    {source.metadata?.source || `Source ${index + 1}`}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">H</span>
                        </div>
                        <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
                                            style={{ animationDelay: `${i * 0.2}s` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-white/60">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scroll to Bottom Button */}
                {messages.length > 3 && (
                    <div className="absolute bottom-4 right-4">
                        <button
                            onClick={() => {
                                const messagesArea = document.querySelector('.overflow-y-auto');
                                if (messagesArea) {
                                    messagesArea.scrollTop = messagesArea.scrollHeight;
                                }
                            }}
                            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-sm transition-colors"
                            title="Scroll to bottom"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>


        </div>
    );
}
