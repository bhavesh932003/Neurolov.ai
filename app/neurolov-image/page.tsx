'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Download,
  Image,
  Palette,
  Wand2,
  Loader2,
  Trash2,
  Share,
  Copy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from '@/app/auth/useUser';
import './neuroStyle.css';

interface ChatMessage {
  type: 'prompt' | 'response';
  content: string;
  image?: string;
  metadata?: {
    size?: string;
    style?: string;
  };
}

export default function NeuroImageGenerator() {
  const router = useRouter();
  const { user } = useUser();
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [showStyleDialog, setShowStyleDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 150);
    
    return () => clearTimeout(timeoutId);
  }, [chatHistory]);


  useEffect(() => {
    if (chatContainerRef.current && chatHistory.length > 0) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);


  // Updated sample prompts with new shorter (image names) and detailed descriptions
  const samplePrompts = [
    { short: "Ancient Jungle Ruins", detailed: "A lost civilization hidden deep in the Amazon jungle." },
    { short: "Skyfall Island", detailed: "A floating island with waterfalls pouring into the sky." },
    { short: "Tree of Civilization", detailed: "A giant tree with an entire city built in its branches." },
    { short: "Mystic White Tiger", detailed: "A majestic white tiger with glowing blue eyes in a mystical forest." },
    { short: "Flame Wolves Under the Blood Moon", detailed: "A group of wolves with fiery fur howling under a blood-red moon." },
    { short: "Stormborn Sea Dragon", detailed: "A massive sea dragon emerging from stormy waters." },
    { short: "Cybernetic Feline", detailed: "A futuristic robotic cat with glowing cybernetic enhancements." },
    { short: "Crystal Paradise", detailed: "A hidden paradise with floating crystal islands and pink waterfalls." },
    { short: "Mushroom Village", detailed: "A secret village built on the edge of a giant glowing mushroom." },
    { short: "Stellar Express", detailed: "A train traveling through space, leaving a trail of stardust." },
    { short: "The Old Mariner", detailed: "A weathered fisherman staring at the endless ocean, his face lined with years of stories." },
    { short: "The Drunken Monkey", detailed: "A monkey sitting in a bar with a glass of beer." },
    { short: "Lone Wolf Under the Moon", detailed: "A lone wolf standing on a snowy mountain peak, howling under a full moon." },
    { short: "Desert Storm", detailed: "A thunderstorm rolling over a vast desert, lightning striking the distant dunes." },
    { short: "Shadow Ninja in Battle", detailed: "A masked ninja leaping through the air, dodging arrows in an ancient Japanese village." },
    { short: "Last Survivor of the Wasteland", detailed: "A post-apocalyptic soldier standing in a ruined city, holding a high-tech plasma rifle." },
    { short: "Neon VR Warrior", detailed: "A futuristic esports gamer in a high-tech VR arena, fully immersed in a digital battleground." },
    { short: "Runic Moonlit Lake", detailed: "A mystical lake glowing under the moonlight, with ancient runes carved into the rocks." },
    { short: "Mountain Ghost Sniper", detailed: "A sniper hidden in the mountains, waiting for the perfect shot at sunrise." },
    { short: "Blades of the Enchanted Forest", detailed: "A warrior in an enchanted forest, wielding a sword made of pure energy." },
    { short: "Cyber Samurai of the Fallen Empire", detailed: "A high-tech samurai with glowing armor, standing on a battlefield of fire and steel." }
  ];

  // Function to get current two prompts
  const getCurrentPrompts = () => {
    const firstIndex = currentPromptIndex % samplePrompts.length;
    const secondIndex = (currentPromptIndex + 1) % samplePrompts.length;
    return [samplePrompts[firstIndex], samplePrompts[secondIndex]];
  };

  const handleSamplePromptClick = (detailedPrompt: string) => {
    setPrompt(detailedPrompt);
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Hide sensitive API endpoint logging in production.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        if (args.some(arg => typeof arg === 'string' && arg.includes('/api/Neurolov-image-generator'))) {
          return;
        }
        originalLog(...args);
      };
    }
  }, []);

  React.useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest';
      setUserName(name);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`image_gen_history_${user.id}`);
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    }
  }, [user]);

  React.useEffect(() => {
    if (user && chatHistory.length > 0) {
      localStorage.setItem(`image_gen_history_${user.id}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, user]);

  const handleBack = () => {
    router.push('/ai-models');
  };

  // Return a ControlNet config based on the selected style.
  const getControlnetConfig = (style: string) => {
    switch (style) {
      case 'photorealistic':
        return {
          model: 'controlnet-photorealistic',
          guidance_scale: 1.0,
          strength: 0.8,
        };
      case 'painting':
        return {
          model: 'controlnet-painting',
          guidance_scale: 0.9,
          strength: 0.7,
        };
      case 'cartoon':
        return {
          model: 'controlnet-cartoon',
          guidance_scale: 1.1,
          strength: 0.85,
        };
      case 'abstract':
        return {
          model: 'controlnet-abstract',
          guidance_scale: 1.2,
          strength: 0.9,
        };
      case 'anime':
        return {
          model: 'controlnet-anime',
          guidance_scale: 1.0,
          strength: 0.8,
        };
      default:
        return null;
    }
  };

  // Append a style-specific hint to the prompt.
  const getStyledPrompt = (basePrompt: string, style: string) => {
    let styleHint = '';
    switch (style) {
      case 'photorealistic':
        styleHint = ' in a photorealistic style';
        break;
      case 'painting':
        styleHint = ' as a beautiful painting with brush strokes and vivid colors';
        break;
      case 'cartoon':
        styleHint = ' in a vibrant cartoon style with bold lines and bright colors';
        break;
      case 'abstract':
        styleHint = ' in an abstract style with imaginative shapes and colors';
        break;
      case 'anime':
        styleHint = ' in an anime style with sharp lines and dramatic expressions';
        break;
      default:
        styleHint = '';
    }
    return basePrompt + styleHint;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setPrompt('');
    setCurrentPromptIndex(prev => prev + 2); // Cycle to next two prompts

    // Create a prompt that includes style-specific hints.
    const finalPrompt = getStyledPrompt(prompt, selectedStyle);

    // First add the user's prompt message
    const userPromptMessage: ChatMessage = { 
      type: 'prompt', 
      content: prompt 
    };
    setChatHistory(prev => [...prev, userPromptMessage]);

    // Then add a placeholder message for loading state
    const loadingMessage: ChatMessage = { 
      type: 'response', 
      content: prompt,
      metadata: {
        size: selectedSize,
        style: selectedStyle
      }
    };
    setChatHistory(prev => [...prev, loadingMessage]);

    try {
      const [width, height] = selectedSize.split('x').map(Number);
      const controlnetConfig = getControlnetConfig(selectedStyle);

      const response = await fetch('/api/Neurolov-image-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          width,
          height,
          num_samples: 1,
          art_style: selectedStyle,
          negative_prompt: 'blurry, low quality, distorted, deformed',
          controlnet: controlnetConfig
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate image');
      
      if (data.images?.[0]) {
        // Update the placeholder message with the generated image
        setChatHistory(prev => prev.map((msg, i) => 
          i === prev.length - 1 ? { ...msg, image: data.images[0] } : msg
        ));
      }
    } catch (error) {
      console.error('Generation error:', error);
      setChatHistory(prev => prev.slice(0, -1)); // Remove the loading message but keep the prompt
      const errorMessage: ChatMessage = {
        type: 'response',
        content: 'Failed to generate image. The system will automatically try alternative services.',
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleDownload = (image: string) => {
    fetch(image)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const fileName = `neurolov-image-${Date.now()}.png`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => console.error('Error downloading image:', error));
  };

  const handleClearHistory = () => {
    if (user) {
      localStorage.removeItem(`image_gen_history_${user.id}`);
      setChatHistory([]);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const copyImageToClipboard = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      alert('Image URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const styleOptions = ['photorealistic', 'painting', 'cartoon', 'abstract', 'anime'];

  return (
    <>
      <div className="main-content bg-[#2c2c2c]" style={{ left: 0 }} ref={chatContainerRef}>
        <div className='bg-black/10 relative'>
          <span className='text-xl sm:text-2xl lg:text-4xl absolute lg:top-8 top-2 left-4 sm:left-10 md:top-4'>Neurolov Image Gen</span>
          <img src='/ai-models/neuro image.png' className='h-16 lg:h-24 w-full object-cover'/>
        </div> 
      
        <div className="image-gen" style={{ maxWidth: '1200px' }}>
          <div className="sticky-header compact-header mt-2">
            <button className="back-button" onClick={handleBack}>
              <div className='rounded-full border border-white p-1'> <ArrowLeft className="icon" /></div>
              All AI Models
            </button>
          </div>

          <div className="generated-images" >
            <div className="welcome-header my-2 px-4 sm:px-0">
              <h2 className="greeting text-white font-bold text-2xl sm:text-3xl md:text-4xl">
                Hi there, <span className="name">{userName}</span> <br /> what would you like to imagine today?
              </h2>
              
            </div>

            {chatHistory.map((message, index) => (
              <div key={index} className={`chat-message ${message.type}`}>
                {message.type === 'prompt' ? (
                  <div className="message-content">
                    <p>{message.content}</p>
                  </div>
                ) : (
                  <div className="image-card" style={{ position: 'relative' }}>
                    {isGenerating && !message.image ? (
                      <div className="image-loading-placeholder">
                        <div className="loading-icon">
                          <Image className="h-6 w-6 animate-spin" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <img src={message.image} alt={message.content} onClick={() => handleImageClick(message.image!)} />
                        <div className="image-overlay">
                          <div className="image-metadata">
                            {message.metadata?.size && <span className="metadata-tag">{message.metadata.size}</span>}
                            {message.metadata?.style && <span className="metadata-tag">{message.metadata.style}</span>}
                          </div>
                            </div>
                            <Button className="download-button" onClick={() => handleDownload(message.image!)} aria-label="Download image">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button className="share-button" onClick={async () => {
                          try {
                            const response = await fetch(message.image!);
                            const blob = await response.blob();
                            const file = new File([blob], `neurolov-${Date.now()}.png`, { type: 'image/png' });
                            if (navigator.share) {
                              await navigator.share({
                                files: [file],
                                title: 'AI Generated Image by Neurolov',
                                text: '🎨 Hey! Check out this amazing image I created using app.neurolov.ai! They have incredible AI models, agents, GPU marketplace and much more. Create your own AI art at app.neurolov.ai 🚀'
                              });
                            }
                          } catch (error) {
                            console.error('Error sharing:', error);
                          }
                        }} aria-label="Share image">
                          <Share className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedImage && (
        <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Generated Image</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img src={selectedImage} alt="Generated" className="w-full rounded-lg" />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage;
                    link.download = `neurolov-${Date.now()}.png`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedImage);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="prompt-dialog bg-[#2c2c2c]" style={{ left: 0 }}>
        <div className="prompt-input">
          <div className="sample-prompts-row">
            {getCurrentPrompts().map((samplePrompt, index) => (
              <button
                key={index}
                className="sample-prompt-pill"
                onClick={() => handleSamplePromptClick(samplePrompt.detailed)}
              >
                {samplePrompt.short}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Enter a detailed description of what you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="feature-buttons flex-wrap">
            <button className="clear-history" onClick={handleClearHistory}>
              <Trash2 className="icon" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
            <button className="feature-button" onClick={() => setShowStyleDialog(true)}>
              <Palette className="icon" />
              <span className="hidden sm:inline">Style</span>
            </button>
            <button className="generate-button" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="icon animate-spin" />
                  <span className="hidden xs:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="icon" />
                  <span className="hidden xs:inline">Generate</span> →
                </>
              )}
            </button>
          </div>

          <Dialog open={showStyleDialog} onOpenChange={setShowStyleDialog}>
            <DialogContent className="dialog-content">
              <DialogHeader>
                <DialogTitle>Select Style</DialogTitle>
              </DialogHeader>
              <div className="dialog-options">
                {styleOptions.map((style) => (
                  <Button
                    key={style}
                    variant="ghost"
                    className={`option ${selectedStyle === style ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedStyle(style);
                      setShowStyleDialog(false);
                    }}
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* You might need to add some additional CSS for responsiveness */}
      <style jsx global>{`
        @media (max-width: 640px) {
          .feature-buttons {
            justify-content: space-between;
          }
          
          .feature-button, .clear-history, .generate-button {
            padding: 8px 12px;
          }
        }
        
        @media (max-width: 480px) {
          .xs\\:inline {
            display: inline;
          }
        }
      `}</style>
    </>
  );
}