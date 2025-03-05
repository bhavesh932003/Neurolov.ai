import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AIModel {
  name: string;
  version: string;
}
interface AIModelDropdownProps {
    onModelSelect?: (model: AIModel) => void;
  }
const AIModelDropdown: React.FC<AIModelDropdownProps> = ({ onModelSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>({
    name: 'Prism',
    version: '1.5 (Sketch)'
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models: AIModel[] = [
    { name: 'Prism', version: '1.5 (Sketch)' },
    { name: 'Claude', version: '3.7 Sonnet' },
    { name: 'GPT', version: '4o' },
    { name: 'Gemini', version: 'Pro' }
  ];

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectModel = (model: AIModel) => {
    setSelectedModel(model);
    setIsOpen(false);
    if (onModelSelect) {
      onModelSelect(model);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div 
      ref={dropdownRef}
      className="relative w-64 text-white"
    >
      <div 
        onClick={toggleDropdown}
        className="flex justify-between items-center bg-[#3c3c3c] p-2 rounded-md cursor-pointer hover:bg-[#4c4c4c] transition-colors"
      >
        <div>
          <span className="font-medium">{selectedModel.name}</span>
          <span className="text-gray-400 text-sm ml-2">{selectedModel.version}</span>
        </div>
        <ChevronDown 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-[#3c3c3c] rounded-md mt-1 shadow-lg z-50 border border-[#4c4c4c]">
          {models.map((model, index) => (
            <div 
              key={index}
              onClick={() => selectModel(model)}
              className="p-2 hover:bg-[#4c4c4c] cursor-pointer flex justify-between items-center"
            >
              <div>
                <span className="font-medium">{model.name}</span>
                <span className="text-gray-400 text-sm ml-2">{model.version}</span>
              </div>
              {model.name === selectedModel.name && model.version === selectedModel.version && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIModelDropdown;