'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Clock, Download, Play, RefreshCw } from 'lucide-react';

interface VideoHistoryItem {
  taskId: string;
  prompt: string;
  negativePrompt?: string;
  status: string;
  created_at: number;
  videoUrl?: string;
  model_name: string;
}

interface VideoHistoryProps {
  onSelectVideo: (video: VideoHistoryItem) => void;
  className?: string;
}

export default function VideoHistory({ onSelectVideo, className = '' }: VideoHistoryProps) {
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // Get history from localStorage
      const savedHistory = localStorage.getItem('videoGenerationHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.sort((a: VideoHistoryItem, b: VideoHistoryItem) => b.created_at - a.created_at));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Generation History</CardTitle>
          <CardDescription>Your past video generations</CardDescription>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={loadHistory}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No video generation history yet
              </div>
            ) : (
              history.map((item) => (
                <Card
                  key={item.taskId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectVideo(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-2">{truncateText(item.prompt)}</p>
                          {item.negativePrompt && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              Negative: {truncateText(item.negativePrompt, 50)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.videoUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectVideo(item);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{item.model_name}</span>
                          <span className={`capitalize px-2 py-0.5 rounded-full text-xs
                            ${item.status === 'succeed' ? 'bg-green-500/10 text-green-500' : 
                              item.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                              'bg-yellow-500/10 text-yellow-500'}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
