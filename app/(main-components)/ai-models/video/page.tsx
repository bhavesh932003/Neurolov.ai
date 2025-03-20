"use client";
import { ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings2 } from "lucide-react";

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
  model_name: string;
  duration: string;
  mode: string;
  aspect_ratio: string;
  camera_control?: {
    type?: string;
    config?: {
      horizontal?: number;
      vertical?: number;
      pan?: number;
      tilt?: number;
      roll?: number;
      zoom?: number;
    };
  };
}

const defaultOptions: GenerationOptions = {
  model_id: "ltx",
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
  output_type: "gif",
  fps: 7,
  use_improved_sampling: false,
  model_name: 'kling-v1-6',
  duration: '5',
  mode: 'std',
  aspect_ratio: '16:9',
};

export default function VideoGeneratorPage() {
  const [isLeftContentVisible, setIsLeftContentVisible] = useState(true);
  const [duration, setDuration] = useState(5);
  const [mode, setMode] = useState<"text-to-video" | "image-to-video">("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [options, setOptions] = useState<GenerationOptions>(defaultOptions);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loadingToastId, setLoadingToastId] = useState<string>();
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const [generationCount, setGenerationCount] = useState<number>(4);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (prompt.length > 2500 || (negativePrompt && negativePrompt.length > 2500)) {
      toast.error('Prompt or negative prompt exceeds 2500 characters');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideoUrl(null);
    
    try {
      console.log('Starting video generation with options:', {
        prompt,
        negativePrompt,
        options
      });

      const response = await fetch('/api/text-to-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...options,
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Initial API Response:', {
        code: data.code,
        message: data.message,
        taskId: data.data?.task_id,
        taskStatus: data.data?.task_status,
        fullResponse: data
      });

      if (data.code !== 0) {
        throw new Error(data.message || 'Failed to start video generation');
      }

      if (!data.data?.task_id) {
        throw new Error('No task ID received from API');
      }

      let attempts = 0;
      const maxAttempts = 60; // 5 minutes total with 5s interval
      const pollInterval = 5000; // 5 seconds
      let backoffMultiplier = 1;

      const pollResult = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for video generation');
        }

        try {
          const currentInterval = pollInterval * backoffMultiplier;
          console.log(`Polling attempt ${attempts + 1} for task ${data.data.task_id}`, {
            interval: `${currentInterval}ms`,
            totalTime: `${(attempts * currentInterval) / 1000}s`,
            timestamp: new Date().toISOString()
          });

          const pollResponse = await fetch(`/api/text-to-videos/${data.data.task_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!pollResponse.ok) {
            throw new Error(`HTTP error! status: ${pollResponse.status}`);
          }

          const pollData = await pollResponse.json();
          
          console.log(`Poll Response (attempt ${attempts + 1}):`, {
            code: pollData.code,
            message: pollData.message,
            taskId: pollData.data?.task_id,
            status: pollData.data?.task_status,
            statusMessage: pollData.data?.task_status_msg,
            hasResult: Boolean(pollData.data?.task_result),
            resultType: pollData.data?.task_result ? typeof pollData.data.task_result : 'none',
            processingTime: pollData.data?.created_at ? 
              `${Math.floor((Date.now() - pollData.data.created_at) / 1000)}s` : 
              'unknown',
            rawResponse: pollData // Log full response for debugging
          });

          if (pollData.code !== 0) {
            throw new Error(pollData.message || 'Failed to check video status');
          }

          // Extract video URL
          let videoUrl = null;
          if (pollData.data?.task_result?.videos?.[0]?.url) {
            videoUrl = pollData.data.task_result.videos[0].url;
          }

          console.log('Video URL status:', {
            hasUrl: Boolean(videoUrl),
            url: videoUrl,
            taskStatus: pollData.data?.task_status,
            timestamp: new Date().toISOString()
          });

          // Check if the task is complete
          if (pollData.data?.task_status === 'succeed' || pollData.data?.task_status === 'SUCCEED') {
            if (videoUrl) {
              console.log('Video generation succeeded! URL:', videoUrl);
              setGeneratedVideoUrl(videoUrl);
              setInferenceTime(
                Math.floor((pollData.data.updated_at - pollData.data.created_at) / 1000)
              );
              
              toast.success("Video generated successfully!");
              
              setIsGenerating(false);
              return;
            } else {
              console.warn('Task succeeded but no video URL found in response:', pollData);
              // Continue polling in case the URL is delayed
              attempts++;
              backoffMultiplier = Math.min(backoffMultiplier * 1.5, 3);
              setTimeout(pollResult, pollInterval * backoffMultiplier);
            }
          }
          // Check for failure
          else if (pollData.data?.task_status === 'failed' || pollData.data?.task_status === 'FAILED') {
            const errorMsg = pollData.data.task_status_msg || 'Generation failed';
            console.error('Video generation failed:', errorMsg);
            throw new Error(errorMsg);
          }
          // Still processing
          else {
            attempts++;
            backoffMultiplier = Math.min(backoffMultiplier * 1.5, 3);
            setTimeout(pollResult, pollInterval * backoffMultiplier);
          }
        } catch (err) {
          console.error('Polling error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          toast.error(err instanceof Error ? err.message : 'Unknown error occurred');
          setIsGenerating(false);
        }
      };

      // Start polling
      setTimeout(pollResult, pollInterval);
    } catch (err) {
      console.error('Video generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      toast.error(err instanceof Error ? err.message : 'Failed to generate video');
      setIsGenerating(false);
    }
  };

  const handleUsePrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <div className="fixed inset-0 w-full left-0 top-[8.5%] z-[40] mt-6 md:mt-0 overflow-hidden bg-[#2c2c2c]">
      <div className="h-screen text-gray-300 flex flex-col">
        {/* Header with Back Button and Mode Selector */}
        <div className="px-6 md:px-12 lg:px-16 xl:px-20 py-4 flex justify-between items-center">
          <Link href="/ai-models" className="flex items-center gap-2 text-gray-400 hover:text-gray-300">
            <div className="w-8 h-8 flex items-center justify-center text-white rounded-full border border-dotted border-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-white font-light">All AI Models</span>
          </Link>
          
          <Select
            value={mode}
            onValueChange={(value: "text-to-video" | "image-to-video") => setMode(value)}
          >
            <SelectTrigger className="w-[180px] bg-[#1a1a1a] border-gray-700">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
              <SelectItem value="text-to-video">Text to Video</SelectItem>
              <SelectItem value="image-to-video">Image to Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden px-6 md:px-12 lg:px-16 xl:px-20">
          <div className="h-full flex flex-col md:flex-row gap-8 md:gap-12">
              {/* Left Sidebar */}
            <div className="w-full md:w-[350px] flex flex-col gap-4 flex-shrink-0 overflow-auto">
              {mode === "text-to-video" ? (
                <>
                {/* Prompt Section */}
                <div className="bg-[#111111] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-emerald-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 2L2 7L12 12L22 7L12 2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17L12 22L22 17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 12L12 17L22 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-emerald-400 font-medium">Prompt</span>
                  </div>
                  <Textarea
                      placeholder="Please describe your creative ideas for the video or view our sample prompts to get started!"
                    className="bg-[#0A0A0A] border-none h-[120px] text-sm resize-none mb-4"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1">
                    <div className="py-1 text-xs text-gray-400">Hints:</div>
                    <div className="px-1 py-1 bg-[#0A0A0A] text-xs text-gray-400">Double exposure</div>
                    <div className="px-1 py-1 bg-[#0A0A0A] text-xs text-gray-400">Dramatic</div>
                    <div className="px-1 py-1 bg-[#0A0A0A] text-xs text-gray-400">Narrative</div>
                    <div className="px-1 py-1 bg-[#0A0A0A] text-xs text-gray-400">Aime</div>
                  </div>
                </div>
                </>
              ) : (
                <>
                  {/* Frames Section for Image to Video */}
                  <div className="bg-[#111111] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-emerald-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 2L2 7L12 12L22 7L12 2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17L12 22L22 17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 12L12 17L22 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                      <span className="text-emerald-400 font-medium">Frames</span>
                  </div>

                    <p className="text-xs text-gray-400 mb-3">
                      Supports 1:1 png/jpg images, 10MB max file size, 300px min dimension. Upload at least 2 images to
                      get the desired result.
                    </p>

                    {/* Upload Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-[#0A0A0A] rounded-md p-2 flex items-center justify-center h-[75px]">
                        <p className="text-xs text-gray-500">Upload an image</p>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-md p-2 flex items-center justify-center h-[75px]">
                        <p className="text-xs text-gray-500">Upload an image</p>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-md p-2 flex items-center justify-center h-[75px]">
                        <p className="text-xs text-gray-500">Upload an image</p>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-md p-2 flex items-center justify-center h-[75px]">
                        <p className="text-xs text-gray-500">Upload an image</p>
                      </div>
                    </div>

                    {/* Example Images */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Examples:</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        <Image
                          src="https://s21-kling.klingai.com/bs2/upload-ylab-stunt-sgp/kling/prompt-library-resources/image-to-video_1.6_zh_examples_%E5%A5%B3%E5%AD%90%E5%BC%B9%E5%8A%A8%E4%B9%90%E5%99%A8_firstFrame_400.jpeg?x-kcdn-pid=112372&x-oss-process=image%2Fresize%2Cw_96%2Ch_96%2Cm_mfit"
                          alt="Example 1"
                          width={55}
                          height={55}
                          className="rounded-md"
                        />
                        <Image
                          src="https://s21-kling.klingai.com/bs2/upload-ylab-stunt-sgp/kling/prompt-library-resources/image-to-video_1.6_en_examples_Mini_Panda_400.jpeg?x-kcdn-pid=112372&x-oss-process=image%2Fresize%2Cw_96%2Ch_96%2Cm_mfit"
                          alt="Example 2"
                          width={55}
                          height={55}
                          className="rounded-md"
                        />
                        <Image
                          src="https://s21-kling.klingai.com/bs2/upload-ylab-stunt-sgp/kling/prompt-library-resources/image-to-video_1.6_en_examples_Icy_Island_400.jpeg?x-kcdn-pid=112372&x-oss-process=image%2Fresize%2Cw_96%2Ch_96%2Cm_mfit"
                          alt="Example 3"
                          width={55}
                          height={55}
                          className="rounded-md"
                        />
                        <Image
                          src="https://s21-kling.klingai.com/bs2/upload-ylab-stunt-sgp/kling/prompt-library-resources/image-to-video_1.6_en_examples_Fuzzy_House_400.jpeg?x-kcdn-pid=112372&x-oss-process=image%2Fresize%2Cw_96%2Ch_96%2Cm_mfit"
                          alt="Example 4"
                          width={55}
                          height={55}
                          className="rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prompt Section for Image to Video */}
                  <div className="bg-[#111111] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-emerald-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M12 2L2 7L12 12L22 7L12 2Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M2 17L12 22L22 17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M2 12L12 17L22 12"
                            stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                      <span className="text-emerald-400 font-medium">Prompt</span>
                  </div>

                    <Textarea
                      placeholder="On the stage, a girl wearing fashionable clothes and a crystal crown, calmly looking at the camera."
                      className="bg-[#0A0A0A] border-none h-[110px] text-sm resize-none mb-0 mt-2"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Settings Section - Common for both modes */}
                <div className="bg-[#111111] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-emerald-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 2L2 7L12 12L22 7L12 2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17L12 22L22 17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 12L12 17L22 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-emerald-400 font-medium">Settings</span>
                  </div>

                  <div className="mb-4">
                    <Label className="text-xs text-gray-400 mb-2">Aspect Ratio</Label>
                    <div className="flex gap-2">
                      <button
                        className={`w-8 h-8 flex items-center justify-center rounded border ${aspectRatio === "1:1" ? "border-emerald-400 bg-[#0A0A0A]" : "border-gray-700"}`}
                        onClick={() => setAspectRatio("1:1")}
                      >
                        <div className="w-4 h-4 bg-gray-500 rounded-sm"></div>
                      </button>
                      <button
                        className={`w-8 h-8 flex items-center justify-center rounded border ${aspectRatio === "16:9" ? "border-emerald-400 bg-[#0A0A0A]" : "border-gray-700"}`}
                        onClick={() => setAspectRatio("16:9")}
                      >
                        <div className="w-5 h-3 bg-gray-500 rounded-sm"></div>
                      </button>
                      <button
                        className={`w-8 h-8 flex items-center justify-center rounded border ${aspectRatio === "9:16" ? "border-emerald-400 bg-[#0A0A0A]" : "border-gray-700"}`}
                        onClick={() => setAspectRatio("9:16")}
                      >
                        <div className="w-3 h-5 bg-gray-500 rounded-sm"></div>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label className="text-xs text-gray-400 mb-2">Generation Count</Label>
                    <div className="px-1">
                      <Slider
                        value={[generationCount]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(value) => setGenerationCount(value[0])}
                        className="my-4"
                      />
                      <div className="flex justify-between">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
              <div className="flex gap-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-lg"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      "Generate videos"
                    )}
                  </Button>
                  
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="p-3 bg-[#1a1a1a] border-gray-700 hover:bg-[#252525]">
                        <Settings2 className="h-5 w-5 text-gray-300" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-[#2c2c2c] text-gray-300 border-gray-700">
                      <SheetHeader>
                        <SheetTitle className="text-white">Video Settings</SheetTitle>
                        <SheetDescription className="text-gray-400">
                          Configure video generation parameters
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Model</Label>
                          <Select
                            value={options.model_name}
                            onValueChange={(value) =>
                              setOptions({ ...options, model_name: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectItem value="kling-v1">Kling v1</SelectItem>
                              <SelectItem value="kling-v1-6">Kling v1.6</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Mode</Label>
                          <Select
                            value={options.mode}
                            onValueChange={(value) =>
                              setOptions({ ...options, mode: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectItem value="std">Standard</SelectItem>
                              <SelectItem value="pro">Professional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Aspect Ratio</Label>
                          <Select
                            value={options.aspect_ratio}
                            onValueChange={(value) =>
                              setOptions({ ...options, aspect_ratio: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectValue placeholder="Select aspect ratio" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectItem value="16:9">16:9</SelectItem>
                              <SelectItem value="9:16">9:16</SelectItem>
                              <SelectItem value="1:1">1:1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Duration</Label>
                          <Select
                            value={options.duration}
                            onValueChange={(value) =>
                              setOptions({ ...options, duration: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
                              <SelectItem value="5">5 seconds</SelectItem>
                              <SelectItem value="10">10 seconds</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Generation Quality</Label>
                          <Slider
                            value={[options.guidance_scale]}
                            min={1}
                            max={15}
                            step={0.1}
                            onValueChange={(value) => setOptions({ ...options, guidance_scale: value[0] })}
                            className="my-4"
                          />
                          <p className="text-xs text-gray-400 text-center">Quality: {options.guidance_scale}</p>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

            {/* Right Content - Example Cards or Preview */}
            <div className="flex-1 overflow-auto h-full">
              {mode === "text-to-video" ? (
                <>
                <h2 className="text-2xl text-center p-4 font-medium text-white">
                  Looking for <span className="text-emerald-400">inspiration</span>? Some examples below
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                  {/* First Image */}
                  <div className="relative rounded-2xl overflow-hidden group h-full">
                    <div className="relative h-full">
                      <Image
                        src="/image.png"
                        alt="Flower field with a windmill in the distance"
                        className="h-[92.5%] w-full object-cover"
                        width={330}
                        height={400}
                      />
                      <div className="absolute bottom-[8%] left-0 right-0 p-4 flex items-end justify-between">
                        <p className="text-white text-lg font-light leading-tight max-w-[70%]">
                          A flower field with a windmill in the distance...
                        </p>
                        <button
                          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                          onClick={() => handleUsePrompt("A flower field with a windmill in the distance...")}
                        >
                          Use Prompt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Second Image */}
                  <div className="relative rounded-2xl overflow-hidden group h-full">
                    <div className="relative h-full">
                      <Image
                        src="/image1.png"
                        alt="Fantasy castle sitting on top of a floating island"
                        className="h-[92.5%] w-full object-cover"
                        width={330}
                        height={400}
                      />
                      <div className="absolute bottom-[8%] left-0 right-0 p-4 flex items-end justify-between">
                        <p className="text-white text-lg font-light leading-tight max-w-[70%]">
                          A fantasy castle sitting on top of a floating island...
                        </p>
                        <button
                          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                          onClick={() => handleUsePrompt("A fantasy castle sitting on top of a floating island...")}
                        >
                          Use Prompt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Third Image */}
                  <div className="relative rounded-2xl overflow-hidden group h-full">
                    <div className="relative h-full">
                      <Image
                        src="/image2.png"
                        alt="Cozy library full of books, with an open..."
                        className="h-[92.5%] w-full object-cover"
                        width={330}
                        height={400}
                      />
                      <div className="absolute bottom-[8%] left-0 right-0 p-4 flex items-end justify-between">
                        <p className="text-white text-lg font-light leading-tight max-w-[70%]">
                          A cozy library full of books, with an open...
                        </p>
                        <button
                          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                          onClick={() => handleUsePrompt("A cozy library full of books, with an open...")}
                        >
                          Use Prompt
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6 max-w-md bg-[#111111] rounded-lg">
                        <div className="flex flex-col items-center">
                          <img
                            src="/vector.png"
                            alt="Neuro Video Gen AI"
                            className="w-24 h-24 md:w-32 md:h-32 mb-4"
                          />
                          <p className="text-gray-500 text-sm md:text-lg text-center">
                            Release your creative potential. Experience the magic of Neuro Video Gen AI
                          </p>
                        </div>
                      </div>
                    </div>
              )}
                  </div>
                </div>
              </div>
      </div>
    </div>
  );
}