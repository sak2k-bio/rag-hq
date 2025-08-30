import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Send, Upload, Bot, User, ExternalLink, Paperclip } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Message {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export function ChatArea({ messages, onSendMessage }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    onSendMessage(inputValue);
    setInputValue('');
    
    // Simulate AI thinking
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      onSendMessage(
        "I understand your question. Let me search through the knowledge base to provide you with the most relevant information.",
        'assistant'
      );
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Uploading ${file.name}...`);
      // Simulate file upload
      setTimeout(() => {
        toast.success('File uploaded successfully!');
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Knowledge Chat</h2>
            <p className="text-sm text-white/60">Ask questions about your documents</p>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
            Online
          </Badge>
        </div>
      </motion.header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="size-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="size-5 text-white" />
                    </div>
                  </div>
                )}
                
                <Card className={`max-w-2xl ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0' 
                    : 'bg-white/10 border-white/20 backdrop-blur-sm text-white'
                }`}>
                  <div className="p-4">
                    <p className="leading-relaxed">{message.content}</p>
                    
                    {message.sources && message.sources.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.3 }}
                        className="mt-3 pt-3 border-t border-white/20"
                      >
                        <p className="text-xs text-white/60 mb-2">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, idx) => (
                            <motion.a
                              key={idx}
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1 }}
                              className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors group"
                            >
                              <ExternalLink className="size-3 group-hover:scale-110 transition-transform" />
                              <span className="truncate">{source}</span>
                            </motion.a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="mt-2 text-xs text-white/40">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </Card>
                
                {message.type === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="size-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                      <User className="size-5 text-white" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="size-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="size-5 text-white" />
                  </div>
                </div>
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm text-white">
                  <div className="p-4 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                          className="size-2 bg-white/60 rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-white/60">AI is thinking...</span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="min-h-[50px] max-h-32 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20 resize-none pr-12"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFileUpload}
                className="absolute right-2 top-2 text-white/60 hover:text-white hover:bg-white/10"
              >
                <Paperclip className="size-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-200 transform hover:scale-105"
            >
              <Send className="size-4" />
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={onFileChange}
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.md"
          />
        </div>
      </motion.div>
    </div>
  );
}