'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Loader2,
  Download,
  Settings2,
  RefreshCw,
  ArrowLeft,
  PercentDiamond,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AIModelDropdown from './components/ai-dropdown';

// Import ModelViewer dynamically to avoid SSR issues
const ModelViewer = dynamic(() => import('../components/model-viewer'), { ssr: false });

// A simple error boundary component for the model viewer
import React from 'react';
class ModelErrorBoundary extends React.Component<{ onError: (msg: string) => void, children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error loading model:", error, errorInfo);
    this.props.onError(error.message);
  }
  
  render() {
    if (this.state.hasError) {
      // Render nothing so that the canvas doesn't show a broken model
      return null;
    }
    return this.props.children;
  }
}

interface GenerationOptions {
  resolution: number;
  output_format: string;
  render: boolean;
  negative_prompt: string;
  guidance_scale: number;
  num_inference_steps: number;
  ss_guidance_strength: number;
  ss_sampling_steps: number;
  slat_guidance_strength: number;
  slat_sampling_steps: number;
  mesh_simplify: number;
  foreground_ratio: number;
  remove_bg: boolean;
  chunk_size: number;
  seed: number;
}

const defaultOptions: GenerationOptions = {
  resolution: 256,
  output_format: 'glb',
  render: false,
  negative_prompt: '',
  guidance_scale: 1.0,
  num_inference_steps: 10,
  ss_guidance_strength: 7.5,
  ss_sampling_steps: 12,
  slat_guidance_strength: 3.0,
  slat_sampling_steps: 12,
  mesh_simplify: 0.9,
  foreground_ratio: 0.85,
  remove_bg: false,
  chunk_size: 8192,
  seed: 0,
};

export default function TextTo3DPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [options, setOptions] = useState<GenerationOptions>(defaultOptions);
  
  // Initialize the ref with null
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use optional chaining to ensure containerRef.current exists
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedModelUrl(null);
    toast.dismiss();

    try {
      const response = await fetch('/api/text-to-3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          ...options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate 3D model');
      }

      if (data.status === 'processing' && data.fetchUrl) {
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = 2000; // 2 seconds
        let loadingToastId: string | undefined;

        const pollResult = async () => {
          if (attempts >= maxAttempts) {
            toast.dismiss(loadingToastId);
            throw new Error('Timeout waiting for 3D model generation');
          }
          try {
            const pollResponse = await fetch(data.fetchUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            const pollData = await pollResponse.json();

            if (pollData.status === 'success' && pollData.output && pollData.output.length > 0) {
              toast.dismiss(loadingToastId);
              setGeneratedModelUrl(pollData.output[0]);
              setInferenceTime(pollData.generationTime);
              toast.success('3D model generated successfully!');
              setIsGenerating(false);
              return;
            }

            if (pollData.status === 'failed' || pollData.status === 'error') {
              toast.dismiss(loadingToastId);
              throw new Error(pollData.message || 'Generation failed');
            }

            attempts++;
            setTimeout(pollResult, pollInterval);
          } catch (err: any) {
            console.error('Polling error:', err);
            toast.dismiss(loadingToastId);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
            toast.error(err instanceof Error ? err.message : 'Unknown error occurred');
            setIsGenerating(false);
          }
        };

        loadingToastId = toast.loading(`Generating 3D model... ETA: ${data.eta || 30} seconds`);

        // Optionally use future links if provided
        if (data.futureLinks && data.futureLinks.length > 0) {
          setGeneratedModelUrl(data.futureLinks[0]);
        }
        setTimeout(pollResult, pollInterval);
      } else if (data.status === 'success' && data.modelUrl) {
        setGeneratedModelUrl(data.modelUrl);
        setInferenceTime(data.generationTime);
        toast.success('3D model generated successfully!');
        setIsGenerating(false);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('3D generation error:', err);
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
    <div ref={containerRef} className="h-screen w-screen fixed top-[8.5%] left-0 transition-colors duration-300 bg-[#1c1c1c] overflow-auto pb-52 lg:pb-32 md:pb-44" >
      <div className="flex flex-col md:flex-row justify-between items-center px-4 py-3 lg:mt-2 md:mt-3 sticky top-0 z-50 bg-[#1c1c1c] mt-8 gap-4">
        <Link href="/ai-models" className="flex items-center self-start gap-2 text-gray-400 hover:text-white transition-all mb-2 md:mb-0">
          <div className="rounded-full border border-white/20 p-1">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </div>  
          <span className="text-sm md:text-base">All AI Models</span>
        </Link>
      </div>

      <div className="container mx-auto p-4 max-w-4xl self-center">
        <Card className="bg-[#1c1c1c] border-white/10">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-white">3D Creator Pro</CardTitle>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" title="Advanced settings" className="bg-[#2c2c2c] border-white/10 text-white hover:bg-[#3c3c3c]">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-[#1c1c1c] border-white/10">
                  <SheetHeader>
                    <SheetTitle className="text-white">Advanced Settings</SheetTitle>
                    <SheetDescription className="text-white/60">
                      Fine-tune your 3D model generation parameters.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm text-white">Resolution</Label>
                      <Input
                        type="number"
                        value={options.resolution}
                        onChange={(e) => setOptions(prev => ({ ...prev, resolution: parseInt(e.target.value) || 256 }))}
                        className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                        min={64}
                        max={512}
                        step={64}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Output Format</Label>
                      <Select
                        value={options.output_format}
                        onValueChange={(value) => setOptions(prev => ({ ...prev, output_format: value }))}
                      >
                        <SelectTrigger className="bg-[#2c2c2c] border-white/10 text-white">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1c1c1c] border-white/10">
                          <SelectItem value="glb" className="text-white hover:bg-[#2c2c2c]">GLB</SelectItem>
                          <SelectItem value="obj" className="text-white hover:bg-[#2c2c2c]">OBJ</SelectItem>
                          <SelectItem value="stl" className="text-white hover:bg-[#2c2c2c]">STL</SelectItem>
                          <SelectItem value="ply" className="text-white hover:bg-[#2c2c2c]">PLY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Guidance Scale ({options.guidance_scale})</Label>
                      <Slider
                        value={[options.guidance_scale]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, guidance_scale: value }))}
                        min={0.1}
                        max={10.0}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Inference Steps ({options.num_inference_steps})</Label>
                      <Slider
                        value={[options.num_inference_steps]}
                        onValueChange={([value]) => setOptions(prev => ({ ...prev, num_inference_steps: value }))}
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Remove Background</Label>
                      <Switch
                        checked={options.remove_bg}
                        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, remove_bg: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Generate NeRF Video</Label>
                      <Switch
                        checked={options.render}
                        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, render: checked }))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">SS Guidance Strength</Label>
                        <Input
                          type="number"
                          value={options.ss_guidance_strength}
                          onChange={(e) => setOptions(prev => ({ ...prev, ss_guidance_strength: parseFloat(e.target.value) || 7.5 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={0.1}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">SS Sampling Steps</Label>
                        <Input
                          type="number"
                          value={options.ss_sampling_steps}
                          onChange={(e) => setOptions(prev => ({ ...prev, ss_sampling_steps: parseInt(e.target.value) || 12 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={1}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">SLAT Guidance Strength</Label>
                        <Input
                          type="number"
                          value={options.slat_guidance_strength}
                          onChange={(e) => setOptions(prev => ({ ...prev, slat_guidance_strength: parseFloat(e.target.value) || 3.0 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={0.1}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">SLAT Sampling Steps</Label>
                        <Input
                          type="number"
                          value={options.slat_sampling_steps}
                          onChange={(e) => setOptions(prev => ({ ...prev, slat_sampling_steps: parseInt(e.target.value) || 12 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={1}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">Mesh Simplify</Label>
                        <Input
                          type="number"
                          value={options.mesh_simplify}
                          onChange={(e) => setOptions(prev => ({ ...prev, mesh_simplify: parseFloat(e.target.value) || 0.9 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={0.01}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">Foreground Ratio</Label>
                        <Input
                          type="number"
                          value={options.foreground_ratio}
                          onChange={(e) => setOptions(prev => ({ ...prev, foreground_ratio: parseFloat(e.target.value) || 0.85 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={0.01}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">Chunk Size</Label>
                        <Input
                          type="number"
                          value={options.chunk_size}
                          onChange={(e) => setOptions(prev => ({ ...prev, chunk_size: parseInt(e.target.value) || 8192 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                          step={1}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-white">Seed</Label>
                        <Input
                          type="number"
                          value={options.seed}
                          onChange={(e) => setOptions(prev => ({ ...prev, seed: parseInt(e.target.value) || 0 }))}
                          className="w-20 bg-[#2c2c2c] border-white/10 text-white"
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button onClick={resetOptions} variant="outline" className="w-full bg-[#2c2c2c] border-white/10 text-white hover:bg-[#3c3c3c]">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 bg-[#1c1c1c]">
            <div className="md:h-[400px] h-[300px] lg:h-[425px] w-full bg-[#2c2c2c] rounded-lg overflow-hidden border border-white/10">
              <ModelErrorBoundary onError={(msg) => setError(msg)}>
                <ModelViewer src={generatedModelUrl || undefined} />
              </ModelErrorBoundary>
            </div>
            <div className="space-y-2">
              <Label className="text-white flex flex-row gap-2 justify-center w-fit mt-6 mb-2">
                <PercentDiamond /> <span className='mt-1'>Prompt</span>
              </Label>
              <Textarea
                placeholder="Describe what you want to generate. For example, Cute owl, cartoon style, adult with fire wings."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-24 bg-[#2c2c2c] border-white/10 text-white placeholder-white/50"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
            <Label className='ml-2'>Negative Prompt (Optional)</Label>
            <Input
              placeholder="Elements to exclude from the generation..."
              value={options.negative_prompt}
              onChange={(e) => setOptions(prev => ({ ...prev, negative_prompt: e.target.value }))}
              disabled={isGenerating}
            />
          </div>
            {generatedModelUrl && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm truncate flex-1 mr-4 text-white/70">
                    {generatedModelUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-[#2c2c2c] border-white/10 text-white hover:bg-[#3c3c3c]"
                    onClick={() => window.open(generatedModelUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                {inferenceTime && (
                  <p className="text-sm text-white/50 mt-2">
                    Generated in {inferenceTime.toFixed(2)} seconds
                  </p>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 bg-[#1c1c1c]">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white lg:py-0 md:0 py-6"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating 3D Model...
                </>
              ) : (
                <>
                  <Box className="mr-2 h-4 w-4" />
                  <span className="flex flex-col md:hidden ">
                    <span>Generate 3D Model</span>
                    <span className="font-extralight opacity-80 text-sm">
                      Estimated: 90 sec / 25 credits
                    </span>
                  </span>
                  <span className="hidden md:flex md:flex-row md:items-center">
                    <span>Generate 3D Model</span>
                    <span className="ml-2 font-extralight opacity-80 text-sm">
                      Estimated: 90 sec / 25 credits
                    </span>
                  </span>
                </>
              )}
            </Button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
