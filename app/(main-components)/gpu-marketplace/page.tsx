"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, Star, Shield, ShoppingBag, Brain, X, Search, Rocket } from "lucide-react";
import styles from './styles.module.css';
import { useToast } from "@/components/ui/use-toast";
import { ComingSoonOverlay } from '@/components/ComingSoonOverlay';
import ModelStatus from "@/app/gpulab/model-status";
import { useModelBag } from '@/store/model-bag';
import { DeployModelButton } from './deploy-model';
import { GPULabClient } from '@/app/gpulab/gpulab-service';
import { gpuData } from '@/constants/values';
import { useUser } from '@/app/auth/useUser';
import WelcomeModal from '@/components/modals/WelcomeModal';
import { Cpu } from 'lucide-react';
import { getSupabaseClient } from '@/app/auth/supabase';



const COMPATIBLE_GPUS = ['rtx4090', 'rtx3090ti', 'rtx3090', 'a6000', 'a5000', 'a4000', 'a100', 'a40', 'h100'];
const DEV_EMAILS = ['nitishmeswal@gmail.com', 'neohex262@gmail.com', 'neurolov.ai@gmail.com', 'jprateek961@gmail.com'];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sortOption, setSortOption] = useState("relevance");
  const [showFiveStar, setShowFiveStar] = useState(false);
  const [showAssured, setShowAssured] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showModelBag, setShowModelBag] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showGpuForm, setShowGpuForm] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [selectedGpu, setSelectedGpu] = useState<gpuData[number] | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [containerStatus, setContainerStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'performance'>('performance');
  const [useNlov, setUseNlov] = useState(false);
  const { selectedModel, setSelectedModel } = useModelBag();
  const gpuLabClient = new GPULabClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);


  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session?.user) {

      } else if (error || !session) {
      
        router.push('/');
      }
    };
    fetchUser();
  }, []);

  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);



  
  if (!mounted) {
    return null;
  }

   
  
  
  // Sort GPUs based on selected criteria and custom order
  const sortedGpus = [...gpuData].sort((a, b) => {
    // Helper function to check GPU series
    const getGpuPriority = (id: string) => {
      if (id.toLowerCase().startsWith('rtx')) return 1; // RTX series first
      if (id.toLowerCase().match(/^a[456]000$/)) return 3; // A4000, A5000, A6000 last
      return 2; // Other GPUs in middle
    };

    const priorityA = getGpuPriority(a.id);
    const priorityB = getGpuPriority(b.id);

    // If priorities are different, sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within same priority group, apply selected sorting criteria
    if (sortBy === 'price') {
      return a.price.usd - b.price.usd;
    }
    // Sort by performance (using VRAM as a proxy)
    return b.specs.vram - a.specs.vram;
  });

  const handleGpuSelect = (gpu: gpuData[number]) => {
    setSelectedGpu(gpu);
    setShowDeployDialog(true);
  };

  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };


  const handleBuyNow = () => {
    if (!selectedModel) {
      toast({
        title: "No Model Selected",
        description: "Please select a model first",
        variant: "destructive",
      });
      return;
    }
    setShowDeployDialog(false);
    // Let DeployModelButton handle the actual deployment
  };

  const FilterButton = ({ active, onClick, children }:
    { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <Button
      variant="outline"
      className={`${styles.filterButton} ${active ? styles.filterButtonActive : ''}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  // Add a helper to check if GPU is available
  const isGpuAvailable = (gpuId: string) => {
    if (user?.email && DEV_EMAILS.includes(user.email)) {
      return ['rtx4090', 'rtx3090ti', 'rtx3090'].includes(gpuId);
    }
    return false;
  };

  const handleJoinWaitlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open('https://docs.google.com/forms/d/1RxEzc8q1qbq2TdFRssjewASl_-U7WVBSr3AEvwL81LQ/edit', '_blank');
  };

 
  const compute_welcome = [
    {
      title: "Neurolov Compute",
      description: "Unlock powerful GPU resources for your AI projects. Select from a range of high-performance GPUs and pay only for what you use.",
      icon: <Cpu className="w-16 h-16 text-blue-400" />,
      confettiTrigger: false,
      actionButton: {
        label: "Start Exploring GPUs",
        action: () => {
        
        }
      }
    }
  ];
  

  return (
    <>
      <WelcomeModal pageName='compute' isCloseButton={false} isOpen={showWelcomeModal} onClose={ () => setShowWelcomeModal(false) } stages={compute_welcome} />
      <div className="min-h-screen  bg-gradient-to-b from-black to-gray-900 text-white">
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Compute
                </h1>
                <div className="relative">
                  <span className="px-3 py-1 text-sm font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-full border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse">
                    Beta
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
                onClick={toggleFilterMenu}
              >
                <ChevronDown className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Models Bag Button */}
              <Button
                variant="outline"
                className={`navbar-models relative flex items-center gap-2 bg-[#0A0A0A] text-white border border-gray-800 hover:bg-[#1A1A1A] transition-all ${selectedModel ? 'border-blue-500 text-blue-500' : ''
                  }`}
                onClick={() => setShowModelBag(true)}
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4" />
                  {selectedModel && (
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span>Models Bag</span>
                {selectedModel && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                    1
                  </div>
                )}
              </Button>

              {/* Filter buttons */}
              <Button
                variant={showFiveStar ? "default" : "outline"}
                className={`flex items-center gap-2 ${showFiveStar
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
                  }`}
                onClick={() => setShowFiveStar(!showFiveStar)}
              >
                <Star className="h-4 w-4" />
                5 & above
              </Button>

              <Button
                variant={showAssured ? "default" : "outline"}
                className={`flex items-center gap-2 ${showAssured
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
                  }`}
                onClick={() => setShowAssured(!showAssured)}
              >
                <Shield className="h-4 w-4" />
                Neurolov Assured
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
                onClick={() => setShowGpuForm(true)}
              >
                <Search className="h-4 w-4" />
                GPU Unavailable?
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]">
                    Sort by: {sortBy === 'price' ? 'Price' : 'Performance'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('performance')}>
                    Performance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('price')}>
                    Price
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {isFilterMenuOpen && (
        <div className="lg:hidden px-4 py-3 space-y-3 bg-black/80 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              className={`w-full navbar-models relative flex items-center justify-center gap-2 bg-[#0A0A0A] text-white border border-gray-800 hover:bg-[#1A1A1A] transition-all ${selectedModel ? 'border-blue-500 text-blue-500' : ''
                }`}
              onClick={() => setShowModelBag(true)}
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {selectedModel && (
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <span>Models Bag</span>
              {selectedModel && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                  1
                </div>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={showFiveStar ? "default" : "outline"}
              className={`flex items-center justify-center gap-2 ${showFiveStar
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
                }`}
              onClick={() => setShowFiveStar(!showFiveStar)}
            >
              <Star className="h-4 w-4" />
              <span className="text-sm">5 & above</span>
            </Button>

            <Button
              variant={showAssured ? "default" : "outline"}
              className={`flex items-center justify-center gap-2 ${showAssured
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
                }`}
              onClick={() => setShowAssured(!showAssured)}
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm">Neurolov</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]"
              onClick={() => setShowGpuForm(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">GPU Request</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white border-none hover:bg-[#1A1A1A]">
                  <span className="text-sm">Sort: {sortBy === 'price' ? 'Price' : 'Perf'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('performance')}>
                  Performance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price')}>
                  Price
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}


      {/* GPU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">

        {sortedGpus.map((gpu) => (
          <div key={gpu.id} className="relative rounded-2xl overflow-hidden bg-[#0A0A0A] group hover:cursor-pointer">
            {/* GPU Name */}
            <div className="absolute top-4 left-0 right-0 text-center z-10">
              <h3 className="text-2xl font-medium text-gray-500">{gpu.name}</h3>
            </div>

            {/* Card Content */}
            <div className="w-full aspect-video p-12 flex flex-col items-center justify-center">
              {/* GPU Image */}
              <Image
                src={gpu.image}
                alt={gpu.name}
                width={300}
                height={150}
                className="object-contain w-[80%] h-[80%] transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
                priority
              />

              {/* Mobile Join Waitlist Button */}
              {!isGpuAvailable(gpu.id) && gpu.id.toLowerCase().startsWith('rtx') && (
                <div className="block md:hidden mt-4">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                    onClick={handleJoinWaitlist}
                  >
                    Join Waitlist
                  </Button>
                </div>
              )}
            </div>

            {/* Desktop Coming Soon Overlay */}
            {!isGpuAvailable(gpu.id) && (
              <div className="hidden md:block absolute inset-0 z-20">
                <ComingSoonOverlay
                  type="hover"
                  title="GPU Coming Soon"
                  description={gpu.id.toLowerCase().startsWith('rtx')
                    ? "Join our waitlist to get early access to this high-performance RTX GPU!"
                    : "This GPU will be available for deployment soon!"
                  }
                  customButton={gpu.id.toLowerCase().startsWith('rtx') ? (
                    <Button
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleJoinWaitlist}
                    >
                      Join Waitlist
                    </Button>
                  ) : undefined}
                />
              </div>
            )}

            {/* Price and Button Container */}
            <div
              className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
              onClick={() => handleGpuSelect(gpu)}
            >
              <div className="flex items-center justify-between px-4 pb-4">
                <p className="text-[#40A6FF] font-medium">
                  From ${gpu.price.usd}/hr
                </p>
                <button className={styles.selectButton}>
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deploy Dialog */}
      {selectedGpu && (
        <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
          <DialogContent className="sm:max-w-[500px] bg-gradient-to-b from-gray-900 to-black border border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                {selectedGpu.name}
              </DialogTitle>
              <DialogDescription className="space-y-4">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700">
                  <h4 className="text-xl font-bold mb-4 text-white">Specifications</h4>
                  <div className="space-y-3 text-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p>{selectedGpu.specs.cores}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <p>{selectedGpu.specs.boost}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                      <p>{selectedGpu.specs.vram}GB VRAM</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl border transition-all duration-300 bg-gray-900 border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-white">Pay with $NLOV</span>
                      <span className="px-3 py-1 text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-white">
                        Save 30%
                      </span>
                    </div>
                    <Button
                      variant={useNlov ? "default" : "outline"}
                      onClick={() => setUseNlov(!useNlov)}
                      className={useNlov
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
                        : "border-gray-600 text-gray-300 hover:bg-gray-800"
                      }
                    >
                      {useNlov ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 p-6 rounded-xl transition-all duration-300 bg-gray-900 border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-300">Price per Hour</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      ${useNlov ? selectedGpu.price.usd.toFixed(2) : selectedGpu.price.usd.toFixed(2)}
                    </span>
                  </div>
                  {useNlov && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-400">$NLOV Savings</span>
                      <span className="font-medium text-emerald-400">
                        -${(selectedGpu.price.usd - selectedGpu.price.usd).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <ComingSoonOverlay
                  type="banner"
                  title="Compute"
                  description="Stay tuned for the launch."
                  version="2.0"
                />
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeployDialog(false)}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white transition-colors"
              >
                Close
              </Button>
              <DeployModelButton
                gpu={selectedGpu}
                onDeploy={() => {
                  setShowDeployDialog(false);
                  setShowModelBag(false);
                }}
                className="flex-1"
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* GPU Unavailable Form Dialog */}
      <Dialog open={showGpuForm} onOpenChange={setShowGpuForm}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] bg-gradient-to-b from-gray-900 to-black border border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <Search className="h-5 w-5" />
              Request GPU Availability
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Help us improve by letting us know which GPUs you'd like to see on the marketplace.
              <div className="mt-2 text-sm text-green-400">
                Earn NLOV tokens for each accepted submission!
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 mt-4 bg-black/50 rounded-lg overflow-hidden">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSdL4PpU_eArHdb3ob9dbBcxY7KQMeEZ7oDI9BQhnLQOPDo-YQ/viewform?embedded=true"
              width="100%"
              height="100%"
              className="border-0"
            >
              Loading form...
            </iframe>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Bag Dialog */}
      <Dialog open={showModelBag} onOpenChange={setShowModelBag}>
        <DialogContent className="sm:max-w-[350px] bg-gradient-to-b from-gray-900 to-black border border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-lg">Models Bag</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedModel ? 'Select a GPU to deploy your model' : 'Your models bag is empty'}
            </DialogDescription>
          </DialogHeader>

          {selectedModel ? (
            <>
              <div className="flex items-center justify-between gap-2 p-3 bg-gray-800/50 rounded-lg mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white text-sm">{selectedModel.name}</h3>
                    <p className="text-xs text-gray-400">{selectedModel.type}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-500/10 hover:text-red-500 h-8 w-8"
                  onClick={() => {
                    setSelectedModel(null);
                    setShowModelBag(false);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Select GPU</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                  {sortedGpus.map((gpu) => (
                    <div
                      key={gpu.id}
                      className={`relative p-2 rounded-lg border cursor-pointer transition-colors ${selectedGpu?.id === gpu.id
                        ? 'bg-blue-500/10 border-blue-500'
                        : 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50'
                        }`}
                      onClick={() => isGpuAvailable(gpu.id) && setSelectedGpu(gpu)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image
                            src={gpu.image}
                            alt={gpu.name}
                            width={24}
                            height={24}
                            className={`rounded ${!isGpuAvailable(gpu.id) && 'opacity-50'}`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`font-medium text-sm ${isGpuAvailable(gpu.id) ? 'text-white' : 'text-gray-400'}`}>
                                {gpu.name}
                              </h3>
                              {!isGpuAvailable(gpu.id) && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {gpu.specs.vram}GB VRAM • {gpu.specs.boost}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isGpuAvailable(gpu.id) ? 'text-white' : 'text-gray-400'}`}>
                            ${gpu.price.usd.toFixed(2)}/hr
                          </span>
                        </div>
                      </div>
                      {!isGpuAvailable(gpu.id) && (
                        <div className="absolute inset-0 rounded-lg bg-black/10 backdrop-blur-[1px] cursor-not-allowed" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="mt-6">
                <DeployModelButton
                  gpu={selectedGpu}
                  onDeploy={() => {
                    setShowModelBag(false);
                  }}
                  className="w-full"
                />
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400">Add models from the AI Models page</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setShowModelBag(false);
                  router.push('/ai-models');
                }}
              >
                Browse Models
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  
  );
};