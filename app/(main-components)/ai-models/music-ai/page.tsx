'use client';

import { useState, useRef, useEffect } from 'react';
import { Music, Loader2, Upload, Play, Pause, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

export default function MusicAIPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [samplingRate, setSamplingRate] = useState(32000);
  const [maxNewToken, setMaxNewToken] = useState(512);
  const [conditioningAudio, setConditioningAudio] = useState<string | null>(null);
  const [useBase64, setUseBase64] = useState(false);
  const [useTemp, setUseTemp] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [trackId, setTrackId] = useState('');
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const MAX_POLLING_ATTEMPTS = 30;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Handler when the audio element encounters an error
  const handleAudioError = () => {
    toast.error('Audio playback error: The audio file is not available or unsupported.');
    setIsPlaying(false);
  };

  const pollForResults = async (fetchUrl: string) => {
    try {
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Poll response:', {
        status: data.status,
        hasOutput: !!data.output,
        outputLength: data.output?.length,
        hasLinks: !!data.future_links,
        linksLength: data.future_links?.length,
        eta: data.eta
      });

      if (data.status === 'success' && (
        (data.output && data.output.length > 0) || 
        (data.future_links && data.future_links.length > 0)
      )) {
        const audioUrl = data.output?.[0] || data.future_links?.[0];
        setGeneratedAudio(audioUrl);
        setInferenceTime(data.generationTime || data.audio_time || 0);
        setGenerationProgress('');
        toast.success('Music generated successfully!');
        return true;
      } else if (data.status === 'failed' || data.status === 'error') {
        throw new Error(data.message || 'Generation failed');
      } else {
        const progress = `Generating music... ${pollingAttempts + 1}/${MAX_POLLING_ATTEMPTS} (ETA: ${data.eta || '~'} seconds)`;
        setGenerationProgress(progress);
        return false;
      }
    } catch (err: any) {
      console.error('Error polling for results:', err);
      throw err;
    }
  };

  const handleGenerateMusic = async () => {
    if (!prompt) {
      toast.error('Please enter a prompt for music generation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress('Starting generation...');
    setPollingAttempts(0);

    try {
      console.log('Sending request with:', {
        prompt,
        sampling_rate: samplingRate,
        max_new_token: maxNewToken,
        base64: useBase64,
        temp: useTemp,
        hasConditioningAudio: !!conditioningAudio,
        hasWebhook: !!webhookUrl,
        hasTrackId: !!trackId
      });

      const response = await fetch('/api/music-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          init_audio: conditioningAudio,
          sampling_rate: samplingRate,
          max_new_token: maxNewToken,
          base64: useBase64,
          temp: useTemp,
          webhook: webhookUrl || null,
          track_id: trackId ? parseInt(trackId) : null
        }),
      });

      const data = await response.json();
      console.log('Received response:', data);

      if (!response.ok) {
        throw new Error(data.error || data.details?.message || data.message || 'Failed to generate music');
      }

      if (data.audio && data.audio.length > 0) {
        setGeneratedAudio(data.audio[0]);
        setInferenceTime(data.generationTime);
        toast.success('Music generated successfully!');
        setIsGenerating(false);
        return;
      }

      if (data.status === 'processing' && data.fetch_result) {
        const poll = async () => {
          if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            setIsGenerating(false);
            setError('Generation timed out. Please try again.');
            setGenerationProgress('');
            return;
          }

          try {
            const success = await pollForResults(data.fetch_result);
            if (success) {
              setIsGenerating(false);
              setPollingAttempts(0);
            } else {
              setPollingAttempts(prev => prev + 1);
              const timeout = setTimeout(poll, 2000);
              setPollingTimeout(timeout);
            }
          } catch (err: any) {
            setIsGenerating(false);
            setError(err.message);
            setGenerationProgress('');
            setPollingAttempts(0);
            toast.error(err.message);
          }
        };

        await poll();
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error generating music:', err);
      setError(err.message);
      toast.error(err.message);
      setIsGenerating(false);
      setGenerationProgress('');
      setPollingAttempts(0);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setConditioningAudio(base64);
      toast.success('Conditioning audio uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.error) {
      toast.error('Audio source is invalid.');
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err);
        toast.error('Failed to play audio.');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    if (!generatedAudio) return;

    try {
      const response = await fetch(generatedAudio);
      if (!response.ok) throw new Error('Audio file not found.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-music.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download audio');
    }
  };

  useEffect(() => {
    return () => {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, [pollingTimeout]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-6 h-6" />
            AI Music Studio
          </CardTitle>
          <CardDescription>
            Create original music, generate melodies, and produce professional-grade audio with our AI-powered music studio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Music Description</label>
            <Textarea
              placeholder="E.g., sitar, tabla, flute, Indian classical, fusion, meditative, G# minor, 96 bpm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Conditioning Audio (Optional)</label>
            <div className="mt-1">
              <Input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sampling Rate: {samplingRate}Hz</label>
              <Slider
                value={[samplingRate]}
                onValueChange={(value) => setSamplingRate(value[0])}
                min={10000}
                max={48000}
                step={1000}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Max New Tokens: {maxNewToken}</label>
              <Slider
                value={[maxNewToken]}
                onValueChange={(value) => setMaxNewToken(value[0])}
                min={256}
                max={1024}
                step={32}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Use Base64 Format</label>
              <Switch
                checked={useBase64}
                onCheckedChange={setUseBase64}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Use Temporary Links</label>
              <Switch
                checked={useTemp}
                onCheckedChange={setUseTemp}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Webhook URL (Optional)</label>
              <Input
                type="url"
                placeholder="https://your-webhook-url.com"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Track ID (Optional)</label>
              <Input
                type="number"
                placeholder="Enter track ID"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {generatedAudio && (
            <div className="mt-4 space-y-2">
              <audio 
                ref={audioRef} 
                src={generatedAudio} 
                onEnded={() => setIsPlaying(false)}
                onError={handleAudioError}
              />
              <div className="flex items-center gap-2">
                <Button onClick={togglePlay} variant="outline" size="icon">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={handleDownload} variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {inferenceTime && (
            <p className="text-sm text-muted-foreground">
              Generation time: {inferenceTime.toFixed(2)}s
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500">
              Error: {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleGenerateMusic} 
            disabled={isGenerating || !prompt}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {generationProgress || 'Generating Music...'}
              </>
            ) : (
              'Generate Music'
            )}
          </Button>
          {generationProgress && (
            <p className="text-sm text-muted-foreground text-center">
              {generationProgress}
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
