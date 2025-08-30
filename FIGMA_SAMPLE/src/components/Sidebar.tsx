import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Upload, Plus, Globe, BookOpen, Zap, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CrawlProgressItem {
  id: number;
  status: string;
  completed: boolean;
  active?: boolean;
}

interface SidebarProps {
  crawlProgress: CrawlProgressItem[];
  onAddText: (content: string) => void;
}

export function Sidebar({ crawlProgress, onAddText }: SidebarProps) {
  const [textContent, setTextContent] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddText = async () => {
    if (!textContent.trim()) return;
    
    setIsLoading(true);
    try {
      onAddText(textContent);
      setTextContent('');
      toast.success('Text added successfully!');
    } catch (error) {
      toast.error('Failed to add text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrawlWebsite = async () => {
    if (!websiteUrl.trim()) return;
    
    setIsLoading(true);
    try {
      toast.success('Started crawling website...');
      setWebsiteUrl('');
    } catch (error) {
      toast.error('Failed to start crawling');
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = crawlProgress.filter(item => item.completed).length;
  const progressPercentage = (completedCount / crawlProgress.length) * 100;

  return (
    <motion.aside 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-80 p-6 border-r border-white/10 relative"
    >
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border-r border-white/10" />
      
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
              <BookOpen className="size-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Personal NotebookLM
            </h1>
          </div>
          <p className="text-sm text-white/60">AI-powered knowledge assistant</p>
        </motion.div>

        {/* Add Text Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Plus className="size-4" />
                Add Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Type or paste text here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[100px] bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
              />
              <Button 
                onClick={handleAddText}
                disabled={!textContent.trim() || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                Add Text
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Crawl Website Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="size-4" />
                Crawl Website
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-green-400 focus:ring-green-400/20"
              />
              <Button 
                onClick={handleCrawlWebsite}
                disabled={!websiteUrl.trim() || isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Zap className="size-4 mr-2" />
                )}
                Crawl
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="size-4" />
                Progress
                <Badge variant="secondary" className="ml-auto bg-white/10 text-white border-white/20">
                  {completedCount}/{crawlProgress.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/80">
                  <span>Overall Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-2 bg-white/10"
                />
              </div>
              
              <div className="space-y-2">
                <AnimatePresence>
                  {crawlProgress.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="size-4 text-green-400 flex-shrink-0" />
                      ) : item.active ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="size-4 text-blue-400 flex-shrink-0" />
                        </motion.div>
                      ) : (
                        <div className="size-4 rounded-full border-2 border-white/20 flex-shrink-0" />
                      )}
                      <span className={`flex-1 ${
                        item.completed 
                          ? 'text-green-400' 
                          : item.active 
                            ? 'text-blue-400' 
                            : 'text-white/60'
                      }`}>
                        {item.status}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.aside>
  );
}