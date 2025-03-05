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
    <div ref={inputContainerRef} className="flex items-end gap-2 p-2 relative">
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
        className="flex-1 bg-[#1a1a1a] text-white rounded-lg p-3 pr-10 min-h-[60px] max-h-[200px] resize-none border border-gray-800 focus:outline-none focus:border-gray-600"
        style={{ transition: 'height 0.2s ease' }}
      />
      <Button
        onClick={handleSubmit}
        disabled={isGenerating || !input.trim()}
        className="bg-blue-600 hover:bg-blue-800 cursor-pointer text-white rounded-lg p-2 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-105 disabled:bg-blue-600/50 disabled:hover:scale-100 disabled:hover:shadow-none"
      >
        {isGenerating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

export default ChatInput;   
