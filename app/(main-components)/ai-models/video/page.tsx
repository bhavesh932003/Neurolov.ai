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
  guidance_scale: 0.5,
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
  const [mode, setMode] = useState<"text-to-video" | "image-to-video">("text-to-video");
  
  // Text-to-Video state
  const [textPrompt, setTextPrompt] = useState("");
  const [textNegativePrompt, setTextNegativePrompt] = useState("");
  const [isTextGenerating, setIsTextGenerating] = useState(false);
  const [textOptions, setTextOptions] = useState<GenerationOptions>(defaultOptions);
  const [textGenerationStatus, setTextGenerationStatus] = useState<"idle" | "loading" | "complete">("idle");
  const [textGeneratedVideoUrl, setTextGeneratedVideoUrl] = useState<string | null>(null);
  const [textInferenceTime, setTextInferenceTime] = useState<number | null>(null);
  const [textAspectRatio, setTextAspectRatio] = useState<"1:1" | "16:9" | "9:16">("16:9");
  
  // Image-to-Video state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageNegativePrompt, setImageNegativePrompt] = useState("");
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [imageOptions, setImageOptions] = useState<GenerationOptions>(defaultOptions);
  const [imageGenerationStatus, setImageGenerationStatus] = useState<"idle" | "loading" | "complete">("idle");
  const [imageGeneratedVideoUrl, setImageGeneratedVideoUrl] = useState<string | null>(null);
  const [imageInferenceTime, setImageInferenceTime] = useState<number | null>(null);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  
  // Common state
  const [generationCount, setGenerationCount] = useState<number>(4);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loadingToastId, setLoadingToastId] = useState<string>();

  // Handle text-to-video generation
  const handleTextGenerate = async () => {
    if (!textPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (textPrompt.length > 2500 || (textNegativePrompt && textNegativePrompt.length > 2500)) {
      toast.error('Prompt or negative prompt exceeds 2500 characters');
      return;
    }

    setIsTextGenerating(true);
    setError(null);
    setTextGeneratedVideoUrl(null);
    setTextGenerationStatus("loading");

    try {
      console.log('Starting text-to-video generation with options:', {
        prompt: textPrompt,
        negativePrompt: textNegativePrompt,
        options: textOptions
      });

      const response = await fetch('/api/text-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: textOptions.model_name,
          prompt: textPrompt.trim(),
          negative_prompt: textNegativePrompt.trim() || undefined,
          cfg_scale: textOptions.guidance_scale,
          mode: textOptions.mode,
          aspect_ratio: textOptions.aspect_ratio,
          duration: textOptions.duration,
          camera_control: textOptions.camera_control
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

          const pollResponse = await fetch(`/api/text-to-video/${data.data.task_id}`, {
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
              setTextGeneratedVideoUrl(videoUrl);
              setTextInferenceTime(
                Math.floor((pollData.data.updated_at - pollData.data.created_at) / 1000)
              );

              setTextGenerationStatus("complete");
              toast.success("Video generated successfully!");

              setIsTextGenerating(false);
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
          setIsTextGenerating(false);
          setTextGenerationStatus("idle");
        }
      };

      // Start polling
      setTimeout(pollResult, pollInterval);
    } catch (err) {
      console.error('Video generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      toast.error(err instanceof Error ? err.message : 'Failed to generate video');
      setIsTextGenerating(false);
      setTextGenerationStatus("idle");
    }
  };

  // Handle image-to-video generation
  const handleImageGenerate = async () => {
    if (!startImage) {
      toast.error("Please upload a start frame image");
      return;
    }

    setIsImageGenerating(true);
    setError(null);
    setImageGeneratedVideoUrl(null);
    setImageGenerationStatus("loading");

    try {
      console.log('Starting image-to-video generation with options:', {
        prompt: imagePrompt,
        negativePrompt: imageNegativePrompt,
        options: imageOptions,
        hasStartImage: Boolean(startImage),
        hasEndImage: Boolean(endImage)
      });

      const requestBody: any = {
        model_name: imageOptions.model_name,
        image: startImage,
        cfg_scale: imageOptions.guidance_scale,
        mode: imageOptions.mode,
        duration: imageOptions.duration,
      };

      // Add optional fields
      if (endImage) requestBody.image_tail = endImage;
      if (imagePrompt) requestBody.prompt = imagePrompt.trim();
      if (imageNegativePrompt) requestBody.negative_prompt = imageNegativePrompt.trim();

      const response = await fetch('/api/image-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

          const pollResponse = await fetch(`/api/image-to-video/${data.data.task_id}`, {
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
              setImageGeneratedVideoUrl(videoUrl);
              setImageInferenceTime(
                Math.floor((pollData.data.updated_at - pollData.data.created_at) / 1000)
              );

              setImageGenerationStatus("complete");
              toast.success("Video generated successfully!");

              setIsImageGenerating(false);
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
          setIsImageGenerating(false);
          setImageGenerationStatus("idle");
        }
      };

      // Start polling
      setTimeout(pollResult, pollInterval);
    } catch (err) {
      console.error('Video generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      toast.error(err instanceof Error ? err.message : 'Failed to generate video');
      setIsImageGenerating(false);
      setImageGenerationStatus("idle");
    }
  };

  // Handle file uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isStartFrame: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // If image is base64, we need to get just the data part
        const base64Data = result.split(',')[1];
        if (isStartFrame) {
          setStartImage(base64Data);
        } else {
          setEndImage(base64Data);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUsePrompt = (examplePrompt: string) => {
    if (mode === "text-to-video") {
      setTextPrompt(examplePrompt);
    } else {
      setImagePrompt(examplePrompt);
    }
  };

  return (
    <div className="fixed inset-0 w-full left-0 top-[8.5%] z-[40] mt-6 md:mt-0 overflow-hidden bg-[#2c2c2c]">
      <div className="h-screen text-gray-300 flex flex-col">
        {/* Header with Back Button and Mode Selector */}
        <div className="px-4 sm:px-6 md:px-12 lg:px-16 xl:px-20 py-4 flex justify-between items-center">
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
        <div className="flex-1 overflow-hidden px-4 sm:px-6 md:px-12 lg:px-16 xl:px-20">
          <div className="h-full flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Left Sidebar - Conditionally rendered based on generation status */}
            <div className={`${
              (mode === "text-to-video" && textGenerationStatus !== "idle") || 
              (mode === "image-to-video" && imageGenerationStatus !== "idle") 
                ? "hidden md:block" 
                : "block"
            } w-full md:w-[350px] flex-shrink-0 h-[calc(100vh-170px)] overflow-hidden`}>
              <div className="h-full relative overflow-y-auto px-4 space-y-4">
                {mode === "text-to-video" ? (
                  <>
                    {/* Prompt Section - Fixed height */}
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
                        className="bg-[#0A0A0A] border-none h-[100px] text-sm resize-none mb-4"
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                      />

                      {/* Negative Prompt */}
                      <div className="flex items-center gap-2 mb-2 mt-3">
                        <div className="text-red-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M12 2L2 7L12 12L22 7L12 2Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                            <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <span className="text-red-400 text-sm font-medium">Negative Prompt</span>
                      </div>
                      <Textarea
                        placeholder="Enter elements you want to avoid in your video (e.g., blurry, low quality, distorted faces, oversaturated colors)"
                        className="bg-[#0A0A0A] border-none h-[80px] text-sm resize-none mb-2"
                        value={textNegativePrompt}
                        onChange={(e) => setTextNegativePrompt(e.target.value)}
                      />
                    </div>

                    {/* Settings Section - Text to Video */}
                    <div className="bg-[#111111] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="text-emerald-400">
                          <Settings2 className="h-5 w-5" />
                        </div>
                        <span className="text-emerald-400 font-medium">Settings</span>
                      </div>

                      <div className="space-y-4">
                        {/* Model Selection */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Model</Label>
                          <Select
                            value={textOptions.model_name}
                            onValueChange={(value) => {
                              setTextOptions({
                                ...textOptions,
                                model_name: value,
                                // Reset mode to standard if switching to Kling v1.6
                                mode: value === 'kling-v1-6' ? 'std' : textOptions.mode
                              })
                            }}
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700">
                              <SelectItem value="kling-v1">Kling v1</SelectItem>
                              <SelectItem value="kling-v1-5">Kling v1.5</SelectItem>
                              <SelectItem value="kling-v1-6">Kling v1.6</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Mode Selection - Only show for Kling v1 and v1.5 */}
                        {(textOptions.model_name === 'kling-v1' || textOptions.model_name === 'kling-v1-5') && (
                          <div>
                            <Label className="text-xs text-gray-400 mb-2">Mode</Label>
                            <Select
                              value={textOptions.mode}
                              onValueChange={(value) =>
                                setTextOptions({ ...textOptions, mode: value })
                              }
                            >
                              <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-gray-700">
                                <SelectItem value="std">Standard</SelectItem>
                                <SelectItem value="pro">Professional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Aspect Ratio */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Aspect Ratio</Label>
                          <div className="flex gap-2">
                            <button
                              className={`w-8 h-8 flex items-center justify-center rounded border ${textAspectRatio === "1:1" ? "border-emerald-400 bg-[#0A0A0A]" : "border-gray-700"}`}
                              onClick={() => {
                                setTextAspectRatio("1:1");
                                setTextOptions({ ...textOptions, aspect_ratio: "1:1" });
                              }}
                            >
                              <div className="w-4 h-4 bg-gray-500 rounded-sm"></div>
                            </button>
                            <button
                              className={`w-8 h-8 flex items-center justify-center rounded border ${textAspectRatio === "16:9" ? "border-emerald-400 bg-[#0A0A0A]" : "border-gray-700"}`}
                              onClick={() => {
                                setTextAspectRatio("16:9");
                                setTextOptions({ ...textOptions, aspect_ratio: "16:9" });
                              }}
                            >
                              <div className="w-5 h-3 bg-gray-500 rounded-sm"></div>
                            </button>
                            <button
                              className={`w-8 h-8 flex items-center justify-center rounded border ${textAspectRatio === "9:16" ? "border-emerald-400 bg-[#0A0A0A]" : "border-gray-700"}`}
                              onClick={() => {
                                setTextAspectRatio("9:16");
                                setTextOptions({ ...textOptions, aspect_ratio: "9:16" });
                              }}
                            >
                              <div className="w-3 h-5 bg-gray-500 rounded-sm"></div>
                            </button>
                          </div>
                        </div>

                        {/* Duration */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Duration</Label>
                          <Select
                            value={textOptions.duration}
                            onValueChange={(value) =>
                              setTextOptions({ ...textOptions, duration: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700">
                              <SelectItem value="5">5 seconds</SelectItem>
                              <SelectItem value="10">10 seconds</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Generation Quality Slider */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Guidance scale</Label>
                          <Slider
                            value={[textOptions.guidance_scale]}
                            min={0}
                            max={1}
                            step={0.01}
                            onValueChange={(value) => setTextOptions({ ...textOptions, guidance_scale: value[0] })}
                            className="my-4"
                          />
                          <p className="text-xs text-gray-400 text-center">
                            Scale : {textOptions.guidance_scale.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Generate Button for Text-to-Video */}
                    <div className="flex gap-3 sticky bottom-0 w-full">
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                        onClick={handleTextGenerate}
                        disabled={isTextGenerating}
                      >
                        {isTextGenerating ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          "Generate Video"
                        )}
                      </Button>
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
                        JPG / PNG files up to 10MB with minimum dimensions of 300px
                      </p>

                      {/* Upload Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400">Start Frame</Label>
                          <div className={`bg-[#0A0A0A] rounded-md p-2 flex items-center justify-center h-[100px] relative ${startImage ? 'border border-emerald-400' : ''}`}>
                            {startImage ? (
                              <div className="relative w-full h-full">
                                <img 
                                  src={`data:image/jpeg;base64,${startImage}`} 
                                  alt="Start frame" 
                                  className="w-full h-full object-contain"
                                />
                                <button 
                                  onClick={() => setStartImage(null)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                <p className="text-xs text-gray-500 text-center">Upload start frame</p>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/jpeg,image/png"
                                  onChange={(e) => handleImageUpload(e, true)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-400">End Frame (Optional)</Label>
                          <div className={`bg-[#0A0A0A] rounded-md p-2 flex items-center justify-center h-[100px] relative ${endImage ? 'border border-emerald-400' : ''}`}>
                            {endImage ? (
                              <div className="relative w-full h-full">
                                <img 
                                  src={`data:image/jpeg;base64,${endImage}`} 
                                  alt="End frame" 
                                  className="w-full h-full object-contain"
                                />
                                <button 
                                  onClick={() => setEndImage(null)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                <p className="text-xs text-gray-500 text-center">Upload end frame</p>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/jpeg,image/png"
                                  onChange={(e) => handleImageUpload(e, false)}
                                />
                              </label>
                            )}
                          </div>
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
                        className="bg-[#0A0A0A] border-none h-[110px] text-sm resize-none mb-3 mt-2"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                      />
                      
                      {/* Negative Prompt */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-red-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M12 2L2 7L12 12L22 7L12 2Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                            <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <span className="text-red-400 text-sm font-medium">Negative Prompt</span>
                      </div>
                      <Textarea
                        placeholder="Enter elements you want to avoid in your video"
                        className="bg-[#0A0A0A] border-none h-[80px] text-sm resize-none mb-0"
                        value={imageNegativePrompt}
                        onChange={(e) => setImageNegativePrompt(e.target.value)}
                      />
                    </div>
                    
                    {/* Settings Section for Image to Video */}
                    <div className="bg-[#111111] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="text-emerald-400">
                          <Settings2 className="h-5 w-5" />
                        </div>
                        <span className="text-emerald-400 font-medium">Settings</span>
                      </div>

                      <div className="space-y-4">
                        {/* Model Selection */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Model</Label>
                          <Select
                            value={imageOptions.model_name}
                            onValueChange={(value) => {
                              setImageOptions({
                                ...imageOptions,
                                model_name: value,
                                // Reset mode to standard if switching to Kling v1.6
                                mode: value === 'kling-v1-6' ? 'std' : imageOptions.mode
                              })
                            }}
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700">
                              <SelectItem value="kling-v1">Kling v1</SelectItem>
                              <SelectItem value="kling-v1-5">Kling v1.5</SelectItem>
                              <SelectItem value="kling-v1-6">Kling v1.6</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Mode Selection - Only show for Kling v1 and v1.5 */}
                        {(imageOptions.model_name === 'kling-v1' || imageOptions.model_name === 'kling-v1-5') && (
                          <div>
                            <Label className="text-xs text-gray-400 mb-2">Mode</Label>
                            <Select
                              value={imageOptions.mode}
                              onValueChange={(value) =>
                                setImageOptions({ ...imageOptions, mode: value })
                              }
                            >
                              <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1a] border-gray-700">
                                <SelectItem value="std">Standard</SelectItem>
                                <SelectItem value="pro">Professional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Duration */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Duration</Label>
                          <Select
                            value={imageOptions.duration}
                            onValueChange={(value) =>
                              setImageOptions({ ...imageOptions, duration: value })
                            }
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-gray-700">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-gray-700">
                              <SelectItem value="5">5 seconds</SelectItem>
                              <SelectItem value="10">10 seconds</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Generation Quality Slider */}
                        <div>
                          <Label className="text-xs text-gray-400 mb-2">Guidance scale</Label>
                          <Slider
                            value={[imageOptions.guidance_scale]}
                            min={0}
                            max={1}
                            step={0.01}
                            onValueChange={(value) => setImageOptions({ ...imageOptions, guidance_scale: value[0] })}
                            className="my-4"
                          />
                          <p className="text-xs text-gray-400 text-center">
                            Scale : {imageOptions.guidance_scale.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Generate Button for Image-to-Video */}
                    <div className="flex gap-3 sticky bottom-0 w-full">
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                        onClick={handleImageGenerate}
                        disabled={isImageGenerating || !startImage}
                      >
                        {isImageGenerating ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          "Generate Video"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Content - Example Cards or Preview */}
            <div className={`flex-1 overflow-auto h-[calc(100vh-100px)] ${
              (mode === "text-to-video" && textGenerationStatus !== "idle") || 
              (mode === "image-to-video" && imageGenerationStatus !== "idle") 
                ? "w-full" 
                : ""
            }`}>
              {mode === "text-to-video" ? (
                <>
                  {textGenerationStatus === "idle" && (
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
                  )}

                  {textGenerationStatus === "loading" && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="relative w-full max-w-3xl aspect-video rounded-xl bg-gray-800 overflow-hidden">
                        <div className="absolute inset-0 w-full h-full">
                          <div className="animate-pulse w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-shimmer"></div>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-gray-900/50 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-50" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"></path>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 text-center px-4">
                        <h3 className="text-xl font-medium text-white mb-2">Your imagination is generating</h3>
                        <p className="text-gray-400">It takes approximately 5 to 10 minutes. Stay tuned!</p>

                        <div className="mt-4 flex items-center justify-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {textGenerationStatus === "complete" && textGeneratedVideoUrl && (
                    <div className="flex flex-col items-center justify-center h-full px-4 sm:px-0">
                      <div className="w-full max-w-3xl">
                        <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-xl">
                          <video
                            ref={videoRef}
                            src={textGeneratedVideoUrl}
                            className="w-full aspect-video object-contain"
                            controls
                            autoPlay
                            loop
                            playsInline
                          />
                        </div>

                        <div className="mt-6 bg-[#111111] rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-white mb-1">Generated Video</h3>
                              <p className="text-sm text-gray-400 mb-2">
                                {textInferenceTime && `Generated in ${textInferenceTime} seconds`}
                              </p>
                              <div className="bg-[#0A0A0A] rounded p-3 mt-2 w-full max-h-[200px] overflow-y-auto">
                                <p className="text-sm text-gray-300 break-words">{textPrompt}</p>
                              </div>
                            </div>

                            <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0">
                              <button
                                onClick={() => {
                                  // Create a temporary link element
                                  const link = document.createElement('a');
                                  // Set the href to the video URL
                                  link.href = textGeneratedVideoUrl;
                                  // Set the download attribute with a filename
                                  link.download = "generated-video.mp4";
                                  // Append to the document
                                  document.body.appendChild(link);
                                  // Trigger the download
                                  link.click();
                                  // Clean up
                                  document.body.removeChild(link);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Video
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-center">
                          <Button
                            onClick={() => setTextGenerationStatus("idle")}
                            className="bg-[#111111] hover:bg-[#1a1a1a] text-white font-medium rounded-lg"
                          >
                            Generate Another Video
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {imageGenerationStatus === "idle" && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6 max-w-md bg-[#111111] rounded-lg">
                        <div className="flex flex-col items-center">
                          <img
                            src="/vector.png"
                            alt="Neuro Video Gen AI"
                            className="w-24 h-24 md:w-32 md:h-32 mb-4"
                          />
                          <p className="text-gray-500 text-sm md:text-lg text-center">
                            Upload an image to animate it. Turn your still pictures into dynamic videos.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {imageGenerationStatus === "loading" && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="relative w-full max-w-3xl aspect-video rounded-xl bg-gray-800 overflow-hidden">
                        <div className="absolute inset-0 w-full h-full">
                          <div className="animate-pulse w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-shimmer"></div>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-gray-900/50 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-50" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"></path>
                            </svg>
                            </div>
                            </div>
                      </div>

                      <div className="mt-8 text-center px-4">
                        <h3 className="text-xl font-medium text-white mb-2">Your imagination is generating</h3>
                        <p className="text-gray-400">It takes approximately 5 to 10 minutes. Stay tuned!</p>

                        <div className="mt-4 flex items-center justify-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {imageGenerationStatus === "complete" && imageGeneratedVideoUrl && (
                    <div className="flex flex-col items-center justify-center h-full px-4 sm:px-0">
                      <div className="w-full max-w-3xl">
                        <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-xl">
                          <video
                            ref={videoRef}
                            src={imageGeneratedVideoUrl}
                            className="w-full aspect-video object-contain"
                            controls
                            autoPlay
                            loop
                            playsInline
                          />
                        </div>

                        <div className="mt-6 bg-[#111111] rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-white mb-1">Generated Video</h3>
                              <p className="text-sm text-gray-400 mb-2">
                                {imageInferenceTime && `Generated in ${imageInferenceTime} seconds`}
                              </p>
                              {imagePrompt && (
                                <div className="bg-[#0A0A0A] rounded p-3 mt-2 w-full max-h-[200px] overflow-y-auto">
                                  <p className="text-sm text-gray-300 break-words">{imagePrompt}</p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0">
                              <button
                                onClick={() => {
                                  // Create a temporary link element
                                  const link = document.createElement('a');
                                  // Set the href to the video URL
                                  link.href = imageGeneratedVideoUrl;
                                  // Set the download attribute with a filename
                                  link.download = "generated-video.mp4";
                                  // Append to the document
                                  document.body.appendChild(link);
                                  // Trigger the download
                                  link.click();
                                  // Clean up
                                  document.body.removeChild(link);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Video
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pb-8 text-center">
                          <Button
                            onClick={() => {
                              setImageGenerationStatus("idle");
                              setStartImage(null);
                              setEndImage(null);
                            }}
                            className="bg-[#111111] hover:bg-[#1a1a1a] text-white font-medium rounded-lg"
                          >
                            Generate Another Video
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}