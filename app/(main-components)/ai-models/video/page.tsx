'use client';
import { SettingsIcon } from "lucide-react";
import { CameraIcon } from "lucide-react";
import { MonitorIcon } from "lucide-react";
import styles from "../styles.module.css"
import Link from 'next/link';
import { ImageIcon } from "lucide-react";
import { ArrowLeft, Search, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Video, Loader2, Download, Settings2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';

interface GenerationOptions {
  model_id: string;
  height: number;
  width: number;
  num_frames: number;
  num_inference_steps: number;
  guidance_scale: number;
  upscale_height: number;
  upscale_width: number;
  upscale_strength: number;
  upscale_guidance_scale: number;
  upscale_num_inference_steps: number;
  output_type: string;
  fps: number;
  use_improved_sampling: boolean;
}

const defaultOptions: GenerationOptions = {
  model_id: 'ltx',
  height: 512,
  width: 512,
  num_frames: 16,
  num_inference_steps: 20,
  guidance_scale: 7,
  upscale_height: 640,
  upscale_width: 1024,
  upscale_strength: 0.6,
  upscale_guidance_scale: 12,
  upscale_num_inference_steps: 20,
  output_type: 'gif',
  fps: 7,
  use_improved_sampling: false
};

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [options, setOptions] = useState<GenerationOptions>(defaultOptions);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loadingToastId, setLoadingToastId] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
        toast.dismiss(loadingToastId);
        setLoadingToastId(toast.loading(`Video generating... ${countdown - 1} seconds remaining`));
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, loadingToastId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setCountdown(60); // Start 60 second countdown

    // Clear any existing toasts
    if (loadingToastId) toast.dismiss(loadingToastId);
    setLoadingToastId(toast.loading('Video generating... 60 seconds remaining'));

    try {
      // Initial request to start generation
      const response = await fetch('/api/text-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt,
          ...options
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      if (data.status === 'processing' && data.fetchUrl) {
        // Start polling the fetch URL
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = 2000; // 2 seconds

        const pollResult = async () => {
          if (attempts >= maxAttempts) {
            setCountdown(null);
            toast.dismiss(loadingToastId);
            throw new Error('Timeout waiting for video generation');
          }

          try {
            const pollResponse = await fetch(data.fetchUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            const pollData = await pollResponse.json();

            if (pollData.status === 'success' && pollData.output && pollData.output.length > 0) {
              setCountdown(null);
              toast.dismiss(loadingToastId);
              setGeneratedVideoUrl(pollData.output[0]);
              setInferenceTime(pollData.generationTime);
              toast.success('Video generated successfully!');
              setIsGenerating(false);
              return;
            }

            if (pollData.status === 'failed' || pollData.status === 'error') {
              setCountdown(null);
              toast.dismiss(loadingToastId);
              throw new Error(pollData.message || 'Generation failed');
            }

            // Still processing, try again after delay
            attempts++;
            setTimeout(pollResult, pollInterval);
          } catch (err: unknown) {
            console.error('Polling error:', err);
            setCountdown(null);
            toast.dismiss(loadingToastId);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
            toast.error(err instanceof Error ? err.message : 'Unknown error occurred');
            setIsGenerating(false);
          }
        };

        // Start polling
        setTimeout(pollResult, pollInterval);
      } else if (data.status === 'success' && data.videoUrl) {
        setCountdown(null);
        toast.dismiss(loadingToastId);
        setGeneratedVideoUrl(data.videoUrl);
        setInferenceTime(data.generationTime);
        toast.success('Video generated successfully!');
        setIsGenerating(false);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: unknown) {
      console.error('Video generation error:', err);
      setCountdown(null);
      toast.dismiss(loadingToastId);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsGenerating(false);
    }
  };

  const resetOptions = () => {
    setOptions(defaultOptions);
    toast.success('Settings reset to defaults');
  };

  return (
    <div className={`${styles.totalvidbody} min-h-screen bg-black text-gray-300 flex flex-col items-start justify-start p-4`}>
      {/* Header Navigation - Moved to Top & Left */}
      <div className="w-full">
        <Link href="/ai-models" className="flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-8">
          <ArrowLeft className="w-8 h-8 text-white rounded-full p-2 border border-dotted border-gray-400" />
          <span className="text-white drop-shadow-lg font-light">All AI Models</span>
        </Link>
      </div>

      {/* Upload Section */}
      <div className="w-full max-w-10xl bg-[#383838] p-6 rounded-lg min-h-[520px] flex flex-col justify-between">
        <div className="border border-white rounded-lg p-12 flex flex-col items-center bg-[#383838] justify-center h-full">
          <div className="w-16 h-16 bg-gray-800 flex items-center justify-center rounded-lg mb-4">
            <ImageIcon className="text-gray-500 w-10 h-10" />
          </div>
          <p className="text-gray-400">Drop an image or video</p>
          <div className="flex gap-4 mt-4">
            <button className="bg-gray-700 text-white px-4 py-2 rounded">Select asset</button>
            <button className="bg-gray-700 text-white px-4 py-2 rounded">Create image</button>
          </div>
        </div>

        {/* Description Input */}
        <div className="mt-6 border border-white rounded-lg p-4">
          <input
            type="text"
            placeholder="Add an image, then describe your shot. View guide or examples."
            className="bg-transparent w-full text-gray-300 outline-none"
          />
        </div>

        {/* Controls Section */}
        <div className="flex justify-between items-center mt-6">
          {/* Left Controls (10s, Camera, Settings) */}
          <div className="flex gap-2">
            {/* <button className="bg-gray-700 text-white px-4 py-2 rounded">10s</button> */}
            <button className={`bg-gray-700 border border-white text-white px-4 py-2 rounded flex items-center  `}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" /></svg>


            </button>
            <button className="bg-gray-700 text-white px-4 py-2 rounded flex border border-white items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
            </button>
          </div>

          {/* **Add the Missing Button Here** */}


          {/* Right Controls (Resolution, Generate) */}
          <div className="flex gap-2">
            <button className="bg-gray-700 border border-white text-white px-4 py-1 rounded flex items-center">
              <div className={`mr-2 ${styles.vidicon}`}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rectangle-horizontal"><rect width="20" height="12" x="2" y="6" rx="2" /></svg></div>
              <div className={`${styles.vid}`}>1280x768</div>
            </button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="bg-gray-700 border border-white" size="icon" title="Advanced settings">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-vertical"><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" /></svg>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Advanced Settings</SheetTitle>
                  <SheetDescription>
                    Fine-tune your video generation parameters.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select
                        value={options.model_id}
                        onValueChange={(value) => setOptions(prev => ({ ...prev, model_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ltx">Stable Video Diffusion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Resolution</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Width ({options.width}px)</Label>
                          <Slider
                            value={[options.width]}
                            onValueChange={([value]) => setOptions(prev => ({ ...prev, width: value }))}
                            min={256}
                            max={512}
                            step={64}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height ({options.height}px)</Label>
                          <Slider
                            value={[options.height]}
                            onValueChange={([value]) => setOptions(prev => ({ ...prev, height: value }))}
                            min={256}
                            max={512}
                            step={64}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Frames ({options.num_frames})</Label>
                      <Slider
                        value={[options.num_frames]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, num_frames: value }))}
                        min={8}
                        max={25}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>FPS ({options.fps})</Label>
                      <Slider
                        value={[options.fps]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, fps: value }))}
                        min={1}
                        max={16}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Guidance Scale ({options.guidance_scale})</Label>
                      <Slider
                        value={[options.guidance_scale]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, guidance_scale: value }))}
                        min={1}
                        max={8}
                        step={0.1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Output Format</Label>
                      <Select
                        value={options.output_type}
                        onValueChange={(value) => setOptions(prev => ({ ...prev, output_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gif">GIF</SelectItem>
                          <SelectItem value="mp4">MP4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Use Improved Sampling</Label>
                      <Switch
                        checked={options.use_improved_sampling}
                        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, use_improved_sampling: checked }))}
                      />
                    </div>

                    <div className="pt-2">
                      <Button onClick={resetOptions} variant="outline" className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

          </div>

        </div>
        <div className="border border-white py-5 relative mt-5 px-4">
          <button className="bg-gray-700 text-white px-4 py-2 rounded border ml-2 border-white">
            10s
          </button>
          <button className="bg-blue-600 px-6 py-2 rounded absolute right-8 text-white">
            Generate
          </button>
        </div>

      </div>
    </div>






    // <div className="container mx-auto p-4 max-w-4xl">
    //   <Card>
    //     <CardHeader>
    //       <div className="flex justify-between items-center">
    //         <div>
    //           <CardTitle className="text-2xl font-bold">AI Video Generator</CardTitle>
    //           <CardDescription>
    //             Transform text descriptions into stunning videos. Create dynamic scenes,
    //             animations, and visual stories using advanced AI technology.
    //           </CardDescription>
    //         </div>
    //         <Sheet>
    //           <SheetTrigger asChild>
    //             <Button variant="outline" size="icon" title="Advanced settings">
    //               <Settings2 className="h-4 w-4" />
    //             </Button>
    //           </SheetTrigger>
    //           <SheetContent>
    //             <SheetHeader>
    //               <SheetTitle>Advanced Settings</SheetTitle>
    //               <SheetDescription>
    //                 Fine-tune your video generation parameters.
    //               </SheetDescription>
    //             </SheetHeader>
    //             <div className="grid gap-4 py-4">
    //               <div className="space-y-4">
    //                 <div className="space-y-2">
    //                   <Label>Model</Label>
    //                   <Select
    //                     value={options.model_id}
    //                     onValueChange={(value) => setOptions(prev => ({ ...prev, model_id: value }))}
    //                   >
    //                     <SelectTrigger>
    //                       <SelectValue placeholder="Select model" />
    //                     </SelectTrigger>
    //                     <SelectContent>
    //                       <SelectItem value="ltx">Stable Video Diffusion</SelectItem>
    //                     </SelectContent>
    //                   </Select>
    //                 </div>

    //                 <div className="space-y-2">
    //                   <Label>Resolution</Label>
    //                   <div className="grid grid-cols-2 gap-4">
    //                     <div>
    //                       <Label className="text-xs">Width ({options.width}px)</Label>
    //                       <Slider
    //                         value={[options.width]}
    //                         onValueChange={([value]) => setOptions(prev => ({ ...prev, width: value }))}
    //                         min={256}
    //                         max={512}
    //                         step={64}
    //                       />
    //                     </div>
    //                     <div>
    //                       <Label className="text-xs">Height ({options.height}px)</Label>
    //                       <Slider
    //                         value={[options.height]}
    //                         onValueChange={([value]) => setOptions(prev => ({ ...prev, height: value }))}
    //                         min={256}
    //                         max={512}
    //                         step={64}
    //                       />
    //                     </div>
    //                   </div>
    //                 </div>

    //                 <div className="space-y-2">
    //                   <Label>Frames ({options.num_frames})</Label>
    //                   <Slider
    //                     value={[options.num_frames]}
    //                     onValueChange={([value]) => setOptions(prev => ({ ...prev, num_frames: value }))}
    //                     min={8}
    //                     max={25}
    //                     step={1}
    //                   />
    //                 </div>

    //                 <div className="space-y-2">
    //                   <Label>FPS ({options.fps})</Label>
    //                   <Slider
    //                     value={[options.fps]}
    //                     onValueChange={([value]) => setOptions(prev => ({ ...prev, fps: value }))}
    //                     min={1}
    //                     max={16}
    //                     step={1}
    //                   />
    //                 </div>

    //                 <div className="space-y-2">
    //                   <Label>Guidance Scale ({options.guidance_scale})</Label>
    //                   <Slider
    //                     value={[options.guidance_scale]}
    //                     onValueChange={([value]) => setOptions(prev => ({ ...prev, guidance_scale: value }))}
    //                     min={1}
    //                     max={8}
    //                     step={0.1}
    //                   />
    //                 </div>

    //                 <div className="space-y-2">
    //                   <Label>Output Format</Label>
    //                   <Select
    //                     value={options.output_type}
    //                     onValueChange={(value) => setOptions(prev => ({ ...prev, output_type: value }))}
    //                   >
    //                     <SelectTrigger>
    //                       <SelectValue placeholder="Select format" />
    //                     </SelectTrigger>
    //                     <SelectContent>
    //                       <SelectItem value="gif">GIF</SelectItem>
    //                       <SelectItem value="mp4">MP4</SelectItem>
    //                     </SelectContent>
    //                   </Select>
    //                 </div>

    //                 <div className="flex items-center justify-between">
    //                   <Label>Use Improved Sampling</Label>
    //                   <Switch
    //                     checked={options.use_improved_sampling}
    //                     onCheckedChange={(checked) => setOptions(prev => ({ ...prev, use_improved_sampling: checked }))}
    //                   />
    //                 </div>

    //                 <div className="pt-2">
    //                   <Button onClick={resetOptions} variant="outline" className="w-full">
    //                     <RefreshCw className="w-4 h-4 mr-2" />
    //                     Reset to Defaults
    //                   </Button>
    //                 </div>
    //               </div>
    //             </div>
    //           </SheetContent>
    //         </Sheet>
    //       </div>
    //     </CardHeader>

    //     <CardContent className="space-y-4">
    //       <div className="space-y-2">
    //         <Label>Prompt</Label>
    //         <Textarea
    //           placeholder="Describe the video you want to create... (e.g., 'An astronaut riding a horse in a meadow')"
    //           value={prompt}
    //           onChange={(e) => setPrompt(e.target.value)}
    //           className="h-24"
    //           disabled={isGenerating}
    //         />
    //       </div>

    //       <div className="space-y-2">
    //         <Label>Negative Prompt (Optional)</Label>
    //         <Input
    //           placeholder="Elements to exclude from the video..."
    //           value={negativePrompt}
    //           onChange={(e) => setNegativePrompt(e.target.value)}
    //           disabled={isGenerating}
    //         />
    //       </div>

    //       {generatedVideoUrl && (
    //         <div className="space-y-2">
    //           <Label>Generated Video</Label>
    //           <div className="border rounded-lg p-4 bg-muted/50">
    //             <div className="aspect-video mb-4 flex items-center justify-center">
    //               {options.output_type === 'mp4' ? (
    //                 <video
    //                   ref={videoRef}
    //                   src={generatedVideoUrl}
    //                   controls
    //                   loop
    //                   autoPlay
    //                   muted
    //                   playsInline
    //                   className="max-w-full max-h-[600px] rounded-lg"
    //                   style={{ objectFit: 'contain' }}
    //                 />
    //               ) : (
    //                 <div className="relative w-full h-full flex items-center justify-center">
    //                   <img
    //                     src={generatedVideoUrl}
    //                     alt="Generated animation"
    //                     className="max-w-full max-h-[600px] rounded-lg"
    //                     style={{ objectFit: 'contain' }}
    //                     onError={(e) => {
    //                       const img = e.target as HTMLImageElement;
    //                       img.onerror = null; // Prevent infinite loop
    //                       setError('Failed to load the generated animation. You can still download it using the button below.');
    //                     }}
    //                   />
    //                 </div>
    //               )}
    //             </div>
    //             <div className="flex items-center justify-between">
    //               <div className="text-sm truncate flex-1 mr-4">
    //                 {generatedVideoUrl}
    //               </div>
    //               <Button
    //                 variant="outline"
    //                 size="sm"
    //                 onClick={() => window.open(generatedVideoUrl, '_blank')}
    //               >
    //                 <Download className="h-4 w-4 mr-2" />
    //                 Download
    //               </Button>
    //             </div>
    //             {inferenceTime && (
    //               <p className="text-sm text-muted-foreground mt-2">
    //                 Generated in {inferenceTime.toFixed(2)} seconds
    //               </p>
    //             )}
    //           </div>
    //         </div>
    //       )}
    //     </CardContent>

    //     <CardFooter className="flex flex-col gap-2">
    //       <Button
    //         onClick={handleGenerate}
    //         disabled={isGenerating || !prompt.trim()}
    //         className="w-full"
    //       >
    //         {isGenerating ? (
    //           <>
    //             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    //             Generating Video...
    //           </>
    //         ) : (
    //           <>
    //             <Video className="mr-2 h-4 w-4" />
    //             Generate Video
    //           </>
    //         )}
    //       </Button>
    //       {error && <p className="text-sm text-destructive">{error}</p>}
    //     </CardFooter>
    //   </Card>
    // </div>
  );
}
