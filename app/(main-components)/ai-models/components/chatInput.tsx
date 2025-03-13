import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: () => void;
  isGenerating: boolean;
  handleTextareaClick: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isGenerating,
  handleTextareaClick,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div ref={inputContainerRef} className="p-2">
      <div className="flex flex-col gap-1 md:gap-2 lg:gap-2">
        <div className="relative bg-[#1a1a1a] rounded-lg border border-gray-800">
        <textarea
  ref={textareaRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onClick={handleTextareaClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }}
  placeholder="Send a message..."
  className="w-full bg-transparent text-white rounded-lg p-3 pr-14 
            min-h-[55px] md:min-h-[75px] lg:min-h-[88px] max-h-[160px] md:max-h-[180px] lg:max-h-[200px] resize-none focus:outline-none
            overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800 scrollbar-thumb-rounded-full"
  style={{ transition: 'height 0.2s ease' }}
/>

          <Button
            onClick={handleSubmit}
            disabled={isGenerating || !input.trim()}
            className="absolute right-2  bottom-3 bg-blue-600 hover:bg-blue-800 cursor-pointer text-white rounded-lg py-2 px-3 md:flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-105 disabled:bg-blue-600/50 disabled:hover:scale-100 disabled:hover:shadow-none hidden"
          >
            {isGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                <>
                <Send className="h-5 w-5" />
                  <span>Send</span>
                </>
            )}
          </Button>
        </div>

    
        <Button
          onClick={handleSubmit}
          disabled={isGenerating || !input.trim()}
          className="md:hidden w-full bg-blue-600 hover:bg-blue-800 cursor-pointer text-white rounded-lg p-2 flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 disabled:bg-blue-600/50 disabled:hover:shadow-none mt-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>Send</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;