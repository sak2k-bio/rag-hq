import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'The provided text states that "Harsh Choudhary has a React Native project called "React-native-projects" which is a free YouTube series (powered by React) to learn React Native. It doesn\'t describe "how" he codes the app, only that he has a project "exploring" this "how to co-do".',
      sources: [
        'https://docs.firecode.com/',
        'https://docs.firecode.com/',
        'https://github.com/harsh-choudhary-nature',
        'https://github.com/harsh-choudhary-nature'
      ],
      timestamp: new Date()
    },
    {
      id: 2,
      type: 'user',
      content: 'If I want to create a JavaScript code to scrape the site and all its sub-pages how would I do it?',
      timestamp: new Date()
    },
    {
      id: 3,
      type: 'assistant',
      content: 'This question cannot be answered from the given context. The text describes a GitHub repository and encounters errors loading some content, but it does not provide information on "how to scrape the website".',
      sources: [
        'https://github.com/harsh-choudhary-nature/firebase-chat-web-apps',
        'https://github.com/harsh-choudhary-nature/firebase-chat-web-apps',
        'https://github.com/harsh-choudhary-nature',
        'https://github.com/harsh-choudhary-nature'
      ],
      timestamp: new Date()
    }
  ]);

  const [crawlProgress, setCrawlProgress] = useState([
    { id: 1, status: 'Starting crawl...', completed: true },
    { id: 2, status: 'Fetching page...', completed: true },
    { id: 3, status: 'Extracting content...', completed: true },
    { id: 4, status: 'Splitting into chunks...', completed: true },
    { id: 5, status: 'Storing chunks...', completed: false, active: true },
    { id: 6, status: 'Done', completed: false }
  ]);

  const addMessage = (content: string, type: 'user' | 'assistant' = 'user') => {
    const newMessage = {
      id: messages.length + 1,
      type,
      content,
      timestamp: new Date(),
      ...(type === 'assistant' && { sources: ['https://example.com'] })
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%239C92AC' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="flex h-full relative">
        <Sidebar 
          crawlProgress={crawlProgress}
          onAddText={addMessage}
        />
        
        <main className="flex-1 flex flex-col relative">
          <ChatArea 
            messages={messages}
            onSendMessage={addMessage}
          />
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}