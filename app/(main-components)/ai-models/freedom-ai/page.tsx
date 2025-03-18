"use client";

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast as sonnerToast } from 'sonner';
import { toast as hotToast, Toaster as HotToaster } from 'react-hot-toast';
import ChatInput from '../components/chatInput';
import WelcomeModal from '@/components/modals/WelcomeModal';
import { AnimatePresence, motion } from 'framer-motion';
import { getSupabaseClient } from '@/app/auth/supabase';
import { useRouter } from 'next/navigation';
import { CgMenuMotion } from "react-icons/cg";
import { useTimeSpentTracker } from '@/app/(secondary-components)/community/hooks/useTimeTrack';

interface Message {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  total_messages: number;
  total_tokens: number;
  created_at: string;
  first_message?: string;
  last_message?: string;
}

// System messages
const uncensoredSystemMessage: Message = {
  role: 'system',
  content:
    "You are an uncensored AI assistant that provides direct, detailed, and unrestricted responses. You can discuss any topic without limitations, while maintaining a helpful and informative tone. You should provide accurate, up-to-date information and engage in natural conversation. You can express opinions, discuss controversial topics, and provide specific advice when asked."
};

const censoredSystemMessage: Message = {
  role: 'system',
  content: `You are a knowledgeable and helpful AI assistant. You have access to real-time information. The current time is ${new Date().toLocaleString(
    'en-US',
    { timeZone: 'Asia/Kolkata' }
  )} IST. You must ALWAYS provide accurate real-time information when asked about dates, time, or day of the week. You excel at providing accurate, informative responses across a wide range of topics. You engage in natural conversation, can write code, explain complex topics, help with analysis, and assist with any task while maintaining appropriate content boundaries. You should be direct, clear, and thorough in your responses.`
};

const freedom_ai_welcome = [
  {
    title: "Freedom AI",
    description:
      "Unleash unfiltered conversations without boundaries. Engage in raw, honest dialogue.",
    icon: <MessageSquare className="w-16 h-16 text-red-400" />,
    confettiTrigger: false,
    actionButton: {
      label: "Start Uncensored Chat",
      action: () => {
        const chatInput = document.querySelector('textarea');
        if (chatInput) chatInput.focus();
      }
    }
  }
];

export default function FreedomAiPage() {
  // Prompts
  const uncensoredPrompts = [
    { short: "Global Politics Exposed", detailed: "Tell me the raw truth about what's going on with global politics right now." },
    { short: "Controversial Opinions", detailed: "If you could say anything without holding back, what's the most controversial opinion you'd share?" },
    { short: "Conspiracy Theories", detailed: "Break down the wildest conspiracy theory you've come across lately—don't sugarcoat it." },
    { short: "Social Media Impact", detailed: "What's something people are too afraid to admit about social media's impact on mental health?" },
    { short: "Modern Dating Rant", detailed: "Give me a no-holds-barred rant about the state of modern dating." },
    { short: "AI's Human Day", detailed: "If you were human for a day, what's the first thing you'd do that an AI wouldn't dare?" },
    { short: "Political Secrets", detailed: "Lay out the dirtiest secrets of global politics right now—who's screwing who, and what's the real news behind the headlines?" },
    { short: "Financial Elites", detailed: "If you could spill the beans on one financial elite's offshore cash stash, who'd it be, and how's that money warping the world?" },
    { short: "Trump's Power Moves", detailed: "What's the rawest take on Trump's latest power moves—tariffs, immigration freezes, or whatever else—and how's it shaking up global cash flows?" },
    { short: "Crypto Dark Side", detailed: "Expose the wildest truth about cryptocurrency's dark side—drugs, leaks, or power plays—and who's really winning in that game?" },
    { short: "Political Trends", detailed: "What's the most dangerous political trend worldwide, and how's it tied to the gold rush or market chaos we're seeing?" }
  ];

  const censoredPrompts = [
    { short: "Book Recommendation", detailed: "What's your favorite book and why?" },
    { short: "Space Exploration", detailed: "Tell me about the latest developments in space exploration." },
    { short: "Making Friends", detailed: "What are some tips for making meaningful friendships?" },
    { short: "Life's Meaning", detailed: "What gives life meaning and purpose?" },
    { short: "Interesting Fact", detailed: "Share a fascinating fact that blows your mind." }
  ];

  // Chat history state.
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("uncensoredChatHistory");
      return saved ? JSON.parse(saved) : [uncensoredSystemMessage];
    }
    return [uncensoredSystemMessage];
  });
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSamplePrompts, setShowSamplePrompts] = useState(true);
  const [isCensored, setIsCensored] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  // Tracks if a sample prompt was used.
  const [usingSamplePrompt, setUsingSamplePrompt] = useState(false);

  // Conversation management states.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Profile state – holds plan, free_text_gen and credits.
  const [profile, setProfile] = useState<any>(null);

  // File attachments state.
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedFilesContent, setAttachedFilesContent] = useState<string | null>(null);

  // ChatInput toggles.
  const [isFileAdditionEnabled, setIsFileAdditionEnabled] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isReasoningEnabled, setIsReasoningEnabled] = useState(false);

  // Refs.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();
  const router = useRouter();

  // Mobile and sidebar state.
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [menuOpenIndex, setMenuOpenIndex] = useState<string | null>(null);

  // Save chat history to localStorage.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("uncensoredChatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  // Clear only the current page data.
  const handleClearHistory = () => {
    setMessages([isCensored ? censoredSystemMessage : uncensoredSystemMessage]);
    localStorage.removeItem("uncensoredChatHistory");
    hotToast.success("Chat history cleared", { position: "top-center" });
  };

  // Mobile & Sidebar handling.
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Authentication & profile fetch.
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) {
          sonnerToast.error("Error fetching profile", { position: "bottom-right" });
        } else {
          setProfile(data);
        }
        fetchConversations(session.user.id);
      } else {
        sonnerToast.error('Please sign in to use Freedom AI', { position: "bottom-right" });
        router.push('/');
      }
    };
    fetchUser();
  }, []);

  // Conversation management functions.
  const fetchConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_freedomai_conversations', {
        p_user_id: userId
      });
      if (error) throw error;
      setConversations(data || []);
      if (data && data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id);
        fetchConversationMessages(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      sonnerToast.error(`Failed to load conversations: ${error.message}`, { position: "bottom-right" });
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_freedomai_conversation_details', {
        p_conversation_id: conversationId
      });
      if (error) throw error;
      if (data && data.messages) {
        const formattedMessages = data.messages.map((msg: { id: string; role: 'system' | 'user' | 'assistant'; content: string; created_at: string }) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        }));
        const hasSystemMessage = formattedMessages.some(msg => msg.role === 'system');
        if (!hasSystemMessage) {
          formattedMessages.unshift(isCensored ? censoredSystemMessage : uncensoredSystemMessage);
        }
        setMessages(formattedMessages);
        setCurrentConversationId(conversationId);
      }
    } catch (error: any) {
      console.error('Error fetching conversation messages:', error);
      sonnerToast.error(`Failed to load messages: ${error.message}`, { position: "bottom-right" });
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    if (!user) {
      sonnerToast.error('Please sign in to start a conversation', { position: "bottom-right" });
      return null;
    }
    try {
      const { data, error } = await supabase.rpc('create_freedomai_conversation', {
        p_user_id: user.id,
        p_first_message: firstMessage,
        p_role: 'user'
      });
      if (error) throw error;
      fetchConversations(user.id);
      return data.conversation_id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      sonnerToast.error(`Failed to create conversation: ${error.message}`, { position: "bottom-right" });
      return null;
    }
  };

  const addMessageToConversation = async (conversationId: string, role: string, content: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.rpc('add_freedomai_message', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
        p_role: role,
        p_content: content
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error adding message:', error);
      sonnerToast.error(`Failed to add message: ${error.message}`, { position: "bottom-right" });
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('delete_freedomai_conversation', {
        p_user_id: user.id,
        p_conversation_id: conversationId
      });
      if (error) throw error;
      if (data.success) {
        hotToast.success('Conversation deleted', { position: "top-center" });
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (currentConversationId === conversationId) {
          if (conversations.length > 1) {
            const newSelectedId = conversations.find(c => c.id !== conversationId)?.id;
            if (newSelectedId) {
              setCurrentConversationId(newSelectedId);
              fetchConversationMessages(newSelectedId);
            } else {
              setCurrentConversationId(null);
              setMessages([isCensored ? censoredSystemMessage : uncensoredSystemMessage]);
            }
          } else {
            setCurrentConversationId(null);
            setMessages([isCensored ? censoredSystemMessage : uncensoredSystemMessage]);
          }
        }
      } else {
        sonnerToast.error('Failed to delete conversation', { position: "bottom-right" });
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      sonnerToast.error(`Failed to delete conversation: ${error.message}`, { position: "bottom-right" });
    }
  };

  // PROMPT HANDLING & SCROLLING
  const getCurrentPrompts = () => {
    const currentPrompts = isCensored ? censoredPrompts : uncensoredPrompts;
    const firstIndex = currentPromptIndex % currentPrompts.length;
    const secondIndex = (currentPromptIndex + 1) % currentPrompts.length;
    return [currentPrompts[firstIndex], currentPrompts[secondIndex]];
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToInput = () => {
    inputContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // When a sample prompt is clicked, mark as using sample.
  const handleSamplePrompt = (prompt: string) => {
    setInput(prompt);
    setUsingSamplePrompt(true);
    scrollToInput();
  };

  // UPDATE CREDITS FUNCTION:
  // - For free plan custom prompts (not sample) if free_text_gen > 0, reduce free_text_gen and credits by 1.
  // - For free plan sample prompts (or when free_text_gen is 0), reduce credits by 1.
  // - For Pro and Ultimate, use existing logic.
  const updateCredits = async () => {
    if (!profile) return;

    if (profile.plan === "free") {
      if (profile.free_text_gen > 0) {
        const newFree = profile.free_text_gen - 1;
        const newCredits = (profile.credits || 0) - 1;
        const { error } = await supabase
          .from('profiles')
          .update({ free_text_gen: newFree, credits: newCredits })
          .eq('id', profile.id);
        if (!error) setProfile({ ...profile, free_text_gen: newFree, credits: newCredits });
      } else if (usingSamplePrompt || profile.free_text_gen <= 0) {
        const newCredits = (profile.credits || 0) - 1;
        const { error } = await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', profile.id);
        if (!error) setProfile({ ...profile, credits: newCredits });
      }
    } else if (profile.plan === "pro") {
      const newUsage = (profile.pro_text_gen || 0) + 1;
      let updateData: any = { pro_text_gen: newUsage };
      let newCredits = profile.credits;
      if (newUsage % 5 !== 0) {
        newCredits = profile.credits - 1;
        updateData = { ...updateData, credits: newCredits };
      }
      await supabase.from('profiles').update(updateData).eq('id', profile.id);
      setProfile({ ...profile, pro_text_gen: newUsage, credits: newCredits });
    } else if (profile.plan === "ultimate") {
      const newUsage = (profile.ultimate_text_gen || 0) + 1;
      let updateData: any = { ultimate_text_gen: newUsage };
      let newCredits = profile.credits;
      if (newUsage % 3 !== 0) {
        newCredits = profile.credits - 1;
        updateData = { ...updateData, credits: newCredits };
      }
      await supabase.from('profiles').update(updateData).eq('id', profile.id);
      setProfile({ ...profile, ultimate_text_gen: newUsage, credits: newCredits });
    }
  };

  // MAIN CHAT SUBMISSION & REGENERATION.
  const handleSubmit = async () => {
    if (!input.trim() || !user) return;
    if (!profile) {
      sonnerToast.error("Profile not loaded yet.", { position: "bottom-right" });
      return;
    }
    if (profile.plan === "free" && !usingSamplePrompt && profile.free_text_gen <= 0) {
      sonnerToast.error("Custom Chats are disabled on free plan. Upgrade to Pro plan to continue using custom chats feature.", { position: "bottom-right" });
      return;
    }

    if (profile.plan === "free") {
      sonnerToast("You are currently on the free plan. Upgrade to Pro plan for faster responses.", { position: "bottom-right" });
    } else if (profile.plan === "pro") {
      sonnerToast("You are currently on the Pro plan. Upgrade to Ultimate plan for the fastest responses.", { position: "bottom-right" });
    }

    let generationDetail = "";
    if (profile.plan === "free") {
      generationDetail = "Generate a crisp answer in 4-5 lines.";
    } else if (profile.plan === "pro") {
      generationDetail = "Generate a detailed answer in 12-15 lines.";
    } else if (profile.plan === "ultimate") {
      generationDetail = "Generate an extremely detailed answer in 20-25 lines.";
    }

    setIsGenerating(true);
    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setTimeout(scrollToBottom, 100);
    setCurrentPromptIndex(currentPromptIndex + 2);

    let currentConvId: string | null = currentConversationId;
    const startTime = Date.now();

    try {
      if (!currentConvId) {
        currentConvId = await createNewConversation(userMessage.content);
        if (!currentConvId) throw new Error('Failed to create conversation');
        setCurrentConversationId(currentConvId);
      } else {
        await addMessageToConversation(currentConvId, 'user', userMessage.content);
      }

      const messagesToSend = [...messages, userMessage];
      if (attachedFiles.length > 0 && attachedFilesContent) {
        const fileMessage: Message = {
          role: "user",
          content: `Attached files: ${attachedFiles.map(f => f.name).join(', ')}\n\nContent:\n${attachedFilesContent}\n\nPlease use this information to answer my query.`,
        };
        messagesToSend.push(fileMessage);
      }

      const endpoint = isCensored ? '/api/censored-chat' : '/api/uncensored-chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          max_tokens: 2000,
          generationDetail
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      if (data.status === 'success' && data.message) {
        let requiredDelay = 0;
        if (profile.plan === "free") {
          requiredDelay = 10000;
        } else if (profile.plan === "pro") {
          requiredDelay = 6000;
        }
        const elapsed = Date.now() - startTime;
        if (elapsed < requiredDelay) {
          await new Promise(resolve => setTimeout(resolve, requiredDelay - elapsed));
        }

        const assistantMessage: Message = { role: 'assistant', content: data.message };
        setMessages(prev => [...prev, assistantMessage]);
        await addMessageToConversation(currentConvId, 'assistant', assistantMessage.content);
        fetchConversations(user.id);

        if (profile.plan !== "free" || usingSamplePrompt || profile.free_text_gen > 0) {
          await updateCredits();
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      sonnerToast.error(err.message || 'Failed to get response. Please try again.', { position: "bottom-right" });
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setIsGenerating(false);
      setAttachedFiles([]);
      setAttachedFilesContent(null);
      setUsingSamplePrompt(false);
    }
  };

  const handleRegenerate = async (messageIndex: number) => {
    if (!currentConversationId || !user) return;
    const index = messageIndex + 1;
    let userMessageIndex = index - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }
    if (userMessageIndex < 0) return;
    const originalPrompt = messages[userMessageIndex].content;
    const contextMessages = messages.slice(0, userMessageIndex + 1);
    setIsGenerating(true);
    try {
      const endpoint = isCensored ? '/api/censored-chat' : '/api/uncensored-chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          max_tokens: 2000
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      if (data.status === 'success' && data.message) {
        const userMsg: Message = {
          role: 'user',
          content: originalPrompt,
          created_at: new Date().toISOString()
        };
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.message,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg, assistantMsg]);
        await addMessageToConversation(currentConversationId, 'user', originalPrompt);
        await addMessageToConversation(currentConversationId, 'assistant', assistantMsg.content);
        fetchConversations(user.id);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Chat regeneration error:', err);
      sonnerToast.error(err.message || 'Failed to regenerate response. Please try again.', { position: "bottom-right" });
    } finally {
      setIsGenerating(false);
    }
  };

  const createNewChat = () => {
    setCurrentConversationId(null);
    setMessages([isCensored ? censoredSystemMessage : uncensoredSystemMessage]);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => sonnerToast.success('Copied to clipboard', { position: "bottom-right" }))
      .catch(() => sonnerToast.error('Failed to copy', { position: "bottom-right" }));
  };

  const toggleConversationMenu = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenIndex(prevMenuOpen => prevMenuOpen === conversationId ? null : conversationId);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setMenuOpenIndex(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpenIndex]);

  const { timeSpent, isComplete, progress, resetTimeSpent } = useTimeSpentTracker({
    targetDuration: 120,
    messageType: "usage",
    onComplete: () => {
      console.log("Quest completed and backend updated!");
    }
    
  });

  console.log(timeSpent);

  useEffect(() => {
    setMessages(prev => {
      const newSystemMessage: Message = isCensored
        ? {
            role: 'system',
            content: `You are a knowledgeable and helpful AI assistant. You have access to real-time information. The current time is ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST. You must ALWAYS provide accurate real-time information when asked about dates, time, or day of the week. You excel at providing accurate, informative responses across a wide range of topics. You engage in natural conversation, can write code, explain complex topics, help with analysis, and assist with any task while maintaining appropriate content boundaries. You should be direct, clear, and thorough in your responses.`
          }
        : uncensoredSystemMessage;
      if (prev[0]?.role === 'system') {
        return [newSystemMessage, ...prev.slice(1)];
      } else {
        return [newSystemMessage, ...prev];
      }
    });
  }, [isCensored]);

  const hasChatMessages = messages.filter(m => m.role !== 'system').length > 0;
  const containerBgClass = isCensored ? 'bg-[#2c2c2c]' : 'bg-[#1a1a1a]';
  const sidebarWidth = isSidebarOpen ? (isMobile ? '60%' : '18rem') : '3.5rem';
  const mainContentMargin = isSidebarOpen ? (isMobile ? '60%' : '18rem') : '3.5rem';
  const sidebarZIndex = isMobile ? '40' : '10';

  return (
    <>
      <WelcomeModal pageName='freedomai' isCloseButton={false} isOpen={true} onClose={() => { }} stages={freedom_ai_welcome} />

      <div className={`flex flex-col h-screen w-screen ${containerBgClass} text-white fixed top-[11%] md:top-[8.5%] left-0 transition-colors duration-300`}>
        <div className="hidden md:flex justify-between items-center px-4 py-3 bg-transparent border-b border-gray-800 sticky top-0 z-20">
          <Link href="/ai-models" className="flex items-center gap-2 text-gray-400 hover:text-white transition-all">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-sm md:text-base">All AI Models</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button onClick={handleClearHistory} variant="ghost" className="text-gray-400 hover:text-white text-sm md:text-base">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear History
            </Button>
          </div>
        </div>

        <div className="flex md:hidden justify-between items-center px-4 py-3 bg-transparent border-b border-gray-800 sticky top-0 z-20">
          {!isSidebarOpen ? (
            <>
              <Link href="/ai-models" className="flex items-center gap-2 text-gray-400 hover:text-white transition-all">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">All AI Models</span>
              </Link>
              <Button onClick={() => setIsSidebarOpen(true)} variant="ghost" className="text-gray-400 hover:text-white p-1">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button onClick={() => { }} variant="ghost" className="">
              <div className='h-5 w-5'></div>
            </Button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {isMobile && isSidebarOpen && (
            <div className="fixed inset-0 bg-black/35 z-30" onClick={() => setIsSidebarOpen(false)} />
          )}

          <div className={`${isCensored ? "bg-[#282828]" : "bg-[#171717]"} ${isMobile && isSidebarOpen ? "flex" : "hidden"} md:flex flex-col h-full border-r border-gray-700 transition-all duration-300 overflow-y-auto fixed left-0 top-[calc(8.5%+24px)] md:top-[calc(8.5%+64px)]`}
            style={{ width: sidebarWidth, zIndex: sidebarZIndex }}>
            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
              {isSidebarOpen && (
                <h2 className="text-white text-lg font-semibold">Chats</h2>
              )}
              <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} variant="ghost" className="text-gray-400 hover:text-white p-2">
                {isSidebarOpen ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
              </Button>
            </div>
            <Button onClick={createNewChat} variant="outline" className={`my-4 py-5 mx-auto flex bg-slate-300/50 text-black items-center justify-center ${isSidebarOpen ? "w-[90%]" : "w-[80%]"}`}>
              <Plus className={isSidebarOpen ? "mr-2" : ""} />
              {isSidebarOpen ? "New Chat" : null}
            </Button>
            {isSidebarOpen && (
              <div className="overflow-y-auto h-[calc(100vh-300px)]">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className={`p-3 cursor-pointer hover:bg-zinc-700 flex items-center justify-between ${currentConversationId === conversation.id ? 'bg-zinc-700' : ''}`}>
                    <div className="flex items-center flex-grow overflow-hidden" onClick={() => {
                      setCurrentConversationId(conversation.id);
                      fetchConversationMessages(conversation.id);
                      if (isMobile) setIsSidebarOpen(false);
                    }}>
                      <MessageSquare size={22} className="mr-3 text-gray-400 flex-shrink-0" />
                      <div className="text-white text-base truncate">
                        {conversation.first_message?.slice(0, 30) || "New conversation"}
                        {(conversation.first_message?.length ?? 0) > 30 ? "..." : ""}
                      </div>
                    </div>
                    <div className="relative">
                      <div onClick={(e) => toggleConversationMenu(conversation.id, e)} className="p-1 text-gray-400 hover:bg-none hover:text-white">
                        <CgMenuMotion />
                      </div>
                      {menuOpenIndex === conversation.id && (
                        <div className="absolute right-0 mt-1 py-1 w-48 bg-zinc-800 rounded-md shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                            setMenuOpenIndex(null);
                          }} className="w-full text-left px-4 py-2 text-sm text-white flex items-center group">
                            <Trash2 className="h-4 w-4 inline mr-2 text-white group-hover:text-red-500" />
                            <span className="text-white group-hover:text-red-500">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[90vh] transition-all duration-300 pt-2 mb-[9vh]"
            style={{
              marginLeft: isMobile ? '0' : (isSidebarOpen ? mainContentMargin : '3.5rem'),
              width: isMobile ? '100%' : (isSidebarOpen ? `calc(100% - ${mainContentMargin})` : 'calc(100% - 3.5rem)')
            }}>
            <div className={`flex flex-col ${hasChatMessages ? "" : "mt-24 md:mt-36"} px-2 md:px-6 lg:px-16 xl:px-24 mt-4 md:mt-8 justify-between max-h-[calc(100vh-180px)]`} ref={chatContainerRef}>
              <div className="flex flex-col pb-16 md:pb-10 lg:pb-8">
                <div className={`flex relative flex-col mx-0 md:mx-4 lg:mx-6 my-2 rounded-lg overflow-hidden border border-gray-800 bg-zinc-900/50 flex-grow transition-all duration-300 ${hasChatMessages ? 'min-h-[70vh]' : 'min-h-[50vh]'}`}>
                  <div className="flex justify-between items-center px-4 md:px-10 my-2 lg:my-4 md:my-4 relative md:py-8 lg:py-12 py-4 border-b border-white/25">
                    <div className="w-2/3 pr-4">
                      <h1 className="text-xl md:text-3xl lg:text-5xl text-gray-400 mb-3">
                        No rules, no censors <span className="text-white font-semibold italic">Freedom AI</span> is Here
                      </h1>
                    </div>
                    <div className="flex-shrink-0 absolute right-[2%]">
                      <div className="w-[64px] h-[64px] md:w-32 md:h-32 lg:w-36 lg:h-36 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-full modern-polygon">
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <filter id="glow">
                                  <feGaussianBlur stdDeviation="3" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.75)" />
                                </linearGradient>
                              </defs>
                              <polygon points="50 3, 90 25, 90 75, 50 97, 10 75, 10 25" fill="black" />
                              <polygon points="50 3, 90 25, 90 75, 50 97, 10 75, 10 25" fill="none" stroke="url(#borderGradient)" strokeWidth="2" filter="url(#glow)" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <style jsx>{`
                        .modern-polygon {
                          perspective: 1000px;
                          animation: floatRotate 6s ease-in-out infinite;
                        }
                        @keyframes floatRotate {
                          0% { transform: translateY(0) rotateX(0deg) rotateY(0deg); filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6)); }
                          25% { transform: translateY(-5px) rotateX(8deg) rotateY(8deg); filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7)); }
                          50% { transform: translateY(-10px) rotateX(15deg) rotateY(15deg); filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.8)); }
                          75% { transform: translateY(-5px) rotateX(8deg) rotateY(8deg); filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7)); }
                          100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6)); }
                        }
                      `}</style>
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto">
                    {hasChatMessages ? (
                      messages.slice(1).map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} mb-8`}>
                          <div
                            onMouseEnter={() => message.role === 'assistant' && setHoveredMessageIndex(index)}
                            onMouseLeave={() => setHoveredMessageIndex(null)}
                            className={`max-w-[90%] md:max-w-[80%] lg:max-w-[75%] rounded-lg p-3 md:p-4 text-base md:text-lg relative ${message.role === 'assistant' ? 'bg-zinc-800/80 text-gray-200' : 'bg-blue-600 text-white'}`}
                          >
                            <div className="whitespace-pre-wrap mb-10">{message.content}</div>
                            {message.role === 'assistant' && (
                              <div className="absolute bottom-2 right-2 flex space-x-1">
                                <button
                                  onClick={() => handleCopyMessage(message.content)}
                                  className="bg-zinc-700/70 hover:bg-zinc-600 text-white rounded-md p-1.5 flex items-center"
                                >
                                  <Copy size={isMobile ? 14 : 16} />
                                  <span className="ml-1 text-sm md:text-[16px]">Copy</span>
                                </button>
                                <button
                                  onClick={() => handleRegenerate(index)}
                                  className="bg-blue-600/70 hover:bg-blue-500 text-white rounded-md p-1.5 flex items-center"
                                >
                                  <RefreshCw size={isMobile ? 14 : 16} />
                                  <span className="ml-1 text-sm md:text-[16px]">Regenerate</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        {/* Placeholder if no messages */}
                      </div>
                    )}
                    {isGenerating && (
                      <AnimatePresence>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                          <div className="flex items-center">
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.6, 1, 0.6], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                              className="text-gray-400 mt-2 text-md md:text-xl flex items-center italic"
                            >
                              Thinking
                              <div className="flex ml-1">
                                {[0, 1, 2].map((dot) => (
                                  <motion.span key={dot} animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8], transition: { duration: 1.5, delay: dot * 0.2, repeat: Infinity, ease: "easeInOut" } }}
                                    className="mx-0.5 text-xl md:text-2xl"
                                  >
                                    .
                                  </motion.span>
                                ))}
                              </div>
                            </motion.p>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t border-gray-800 bg-zinc-900/50 p-2 mt-auto">
                    <div className="flex justify-between items-center px-2 lg:py-2 md:py-2 py-1">
                      <Button
                        onClick={() => setShowSamplePrompts(!showSamplePrompts)}
                        variant="ghost"
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        {showSamplePrompts ? 'Hide Prompts' : 'Show Prompts'}
                      </Button>
                      <div></div>
                      <Button
                        onClick={() => setIsCensored(!isCensored)}
                        variant="ghost"
                        className={`${isCensored ? 'text-green-400' : 'text-red-400'} hover:text-white text-sm`}
                      >
                        {isCensored ? 'Censored Mode' : 'Uncensored Mode'}
                      </Button>
                    </div>
                    {showSamplePrompts && (
                      <div className="px-2 py-2 overflow-x-auto whitespace-nowrap">
                        {getCurrentPrompts().map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => handleSamplePrompt(prompt.detailed)}
                            className="inline-block mr-2 px-3 py-1.5 bg-gray-800 text-sm text-gray-300 rounded-full hover:bg-gray-700 transition-colors"
                          >
                            {prompt.short}
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={inputContainerRef}>
                      {profile && profile.plan === "free" && profile.free_text_gen <= 0 && !usingSamplePrompt ? (
                        <div className="p-4 text-center text-gray-400">
                          Custom Prompts are disabled for the Free Plan. Please upgrade to a higher plan to continue using the Custom Prompts feature.
                        </div>
                      ) : (
                        <ChatInput
                          input={input}
                          setInput={setInput}
                          handleSubmit={handleSubmit}
                          isGenerating={isGenerating}
                          handleTextareaClick={scrollToInput}
                          disabled={profile?.plan === "free" && profile.free_text_gen <= 0 && !usingSamplePrompt}
                          readonly={profile?.plan === "free" && profile.free_text_gen <= 0 && usingSamplePrompt}
                          isFileAdditionEnabled={isFileAdditionEnabled}
                          setIsFileAdditionEnabled={setIsFileAdditionEnabled}
                          isSearchEnabled={isSearchEnabled}
                          setIsSearchEnabled={setIsSearchEnabled}
                          isReasoningEnabled={isReasoningEnabled}
                          setIsReasoningEnabled={setIsReasoningEnabled}
                          isCensored={isCensored}
                          disableExtraButtons={profile?.plan === "free" && profile.free_text_gen <= 0}
                          onFileAttached={(files, combinedContent) => {
                            setAttachedFiles(files ?? []);
                            setAttachedFilesContent(combinedContent);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Render the HotToaster for react-hot-toast notifications */}
      <HotToaster />
    </>
  );
}
