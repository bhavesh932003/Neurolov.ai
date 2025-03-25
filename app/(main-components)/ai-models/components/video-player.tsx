'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface VideoPlayerProps {
  taskId?: string;
  status?: string;
  taskResult?: {
    videos?: Array<{ url: string }>;
  };
  created_at?: number;
  updated_at?: number;
  statusMessage?: string;
  className?: string;
}

export default function VideoPlayer({ 
  taskId,
  status = 'submitted',
  taskResult = {},
  created_at,
  updated_at,
  statusMessage = '',
  className = '' 
}: VideoPlayerProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const videoUrl = taskResult?.videos?.[0]?.url || null;
  const processingTime = created_at ? 
    `${Math.floor((Date.now() - created_at) / 1000)}s` : '0s';
  const estimatedTimeRemaining = created_at && status === 'processing' ?
    (Math.floor((Date.now() - created_at) / 1000) > 180 ? '2-3 minutes' : '1-2 minutes') : '';

  useEffect(() => {
    if (videoUrl && (status === 'succeed' || status === 'completed')) {
      setDownloadUrl(videoUrl);
    } else {
      setDownloadUrl(null);
    }
  }, [videoUrl, status]);

  const handleDownload = async () => {
    if (!downloadUrl) return;
    
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-video-${taskId || Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading video:', error);
    }
  };

  if (status === 'failed') {
    return (
      <div className={`flex items-center justify-center p-4 bg-destructive/10 text-destructive rounded-lg ${className}`}>
        {statusMessage || 'Error generating video. Please try again.'}
      </div>
    );
  }

  // Only show processing state if we have a taskId and status is submitted/processing
  if (taskId && (status === 'submitted' || status === 'processing')) {
    return (
      <div className={`flex items-center justify-center p-4 bg-muted rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="flex flex-col items-center text-center gap-1">
            <p className="text-sm text-muted-foreground">
              {statusMessage || (status === 'submitted' ? 'Starting video generation...' : 'Generating your video...')}
            </p>
            <div className="flex flex-col items-center text-xs text-muted-foreground/80">
              <span>Processing time: {processingTime}</span>
              {estimatedTimeRemaining && (
                <span>Estimated time remaining: {estimatedTimeRemaining}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {videoUrl ? (
        <>
          <video 
            src={videoUrl} 
            controls 
            className="w-full h-full rounded-lg"
            playsInline
          >
            Your browser does not support the video tag.
          </video>
          {downloadUrl && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
          Enter a prompt and click Generate to create a video
        </div>
      )}
    </div>
  );
}
