import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Send,
  Plus,
  Search as SearchIcon,
  Lightbulb,
  File as FileIcon,
  X,
} from "lucide-react";

// Import external libraries for file processing.
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

// Setup PDF.js worker correctly.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: () => void;
  isGenerating: boolean;
  handleTextareaClick: () => void;
  disabled?: boolean;
  isFileAdditionEnabled: boolean;
  setIsFileAdditionEnabled: (val: boolean) => void;
  isSearchEnabled: boolean;
  setIsSearchEnabled: (val: boolean) => void;
  isReasoningEnabled: boolean;
  setIsReasoningEnabled: (val: boolean) => void;
  isCensored: boolean;
  // Callback to lift file and its content to the parent.
  onFileAttached?: (file: File | null, fileContent: string | null) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isGenerating,
  handleTextareaClick,
  disabled = false,
  isFileAdditionEnabled,
  setIsFileAdditionEnabled,
  isSearchEnabled,
  setIsSearchEnabled,
  isReasoningEnabled,
  setIsReasoningEnabled,
  isCensored,
  onFileAttached,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for the selected file and its processed content.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [fileProcessingStatus, setFileProcessingStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [fileError, setFileError] = useState<string | null>(null);

  // Ref for the file dropdown.
  const fileDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize the textarea as the user types.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Close the file dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fileDropdownRef.current &&
        !fileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFileAdditionEnabled(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsFileAdditionEnabled]);

  // Open the hidden file input.
  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Process the file based on its MIME type.
  const processFile = async (file: File): Promise<string> => {
    setFileProcessingStatus("processing");
    try {
      if (file.type.startsWith("text")) {
        // For plain text files.
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) =>
            reject(new Error(`Error reading text file: ${e}`));
          reader.readAsText(file);
        });
        setFileProcessingStatus("success");
        return text;
      }

      if (file.type === "application/pdf") {
        try {
          if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
            throw new Error("PDF.js library not properly loaded");
          }
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let text = "";
          const numPages = pdf.numPages;
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item: any) => item.str)
              .join(" ");
            text += pageText + "\n";
          }
          setFileProcessingStatus("success");
          return text;
        } catch (error) {
          console.error("Error processing PDF:", error);
          setFileProcessingStatus("error");
          setFileError(
            `Error processing PDF: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          throw new Error(
            `Error processing PDF: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        try {
          if (!mammoth || typeof mammoth.extractRawText !== "function") {
            throw new Error("Mammoth library not properly loaded");
          }
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          setFileProcessingStatus("success");
          return result.value;
        } catch (error) {
          console.error("Error processing DOCX:", error);
          setFileProcessingStatus("error");
          setFileError(
            `Error processing DOCX: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          throw new Error(
            `Error processing DOCX: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      if (file.type.startsWith("image/")) {
        // Reject SVG images since OCR works best on raster formats.
        if (file.type === "image/svg+xml") {
          throw new Error(
            "SVG images are not supported for OCR. Please upload a raster image (e.g., PNG or JPEG)."
          );
        }
        let canvas: HTMLCanvasElement;
        try {
          // Primary approach: use createImageBitmap.
          const bitmap = await createImageBitmap(file);
          canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context.");
          ctx.drawImage(bitmap, 0, 0);
        } catch (err) {
          console.warn(
            "createImageBitmap failed, falling back to object URL method:",
            err
          );
          // Fallback: use object URL instead of Data URL.
          const fallbackUrl = URL.createObjectURL(file);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = fallbackUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () =>
              reject(new Error("Error loading image element via fallback."));
          });
          canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context.");
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(fallbackUrl);
        }
        // Use the canvas for OCR.
        const {
          data: { text },
        } = await Tesseract.recognize(canvas, "eng");
        setFileProcessingStatus("success");
        return text;
      }

      // For other file types, try to read as text if small, or return basic info.
      if (file.size <= 5 * 1024 * 1024) {
        try {
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
          });
          setFileProcessingStatus("success");
          return text;
        } catch {
          setFileProcessingStatus("success");
          return `File: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(
            2
          )} KB)`;
        }
      } else {
        setFileProcessingStatus("success");
        return `File: ${file.name} (${file.type}, ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)} MB). File is too large to be fully processed.`;
      }
    } catch (error) {
      console.error("Unhandled error processing file:", error);
      setFileProcessingStatus("error");
      setFileError(
        `Error processing file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return `Error processing file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  };

  // Reset file state.
  const resetFileState = () => {
    setSelectedFile(null);
    setSelectedFileContent(null);
    setFileProcessingStatus("idle");
    setFileError(null);
    if (onFileAttached) onFileAttached(null, null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // When a file is selected, process its content and pass it to the parent.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsFileAdditionEnabled(false); // Close dropdown after selection.

    try {
      const content = await processFile(file);
      setSelectedFileContent(content);
      if (onFileAttached) onFileAttached(file, content);
    } catch (error) {
      console.error("Error reading file:", error);
      const errorMessage = `Error reading file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      setSelectedFileContent(errorMessage);
      setFileProcessingStatus("error");
      setFileError(errorMessage);
      if (onFileAttached) onFileAttached(file, errorMessage);
    }
  };

  // When sending, call the submit handler and clear file states.
  const onSend = () => {
    if (input.trim() === "" && !selectedFile) return;

    handleSubmit();
    resetFileState();
  };

  // Get file icon based on MIME type.
  const getFileIcon = () => {
    if (!selectedFile) return <FileIcon className="h-4 w-4" />;
    if (selectedFile.type.startsWith("image/"))
      return <img src="/icons/image.svg" className="h-4 w-4" alt="Image" />;
    if (selectedFile.type === "application/pdf")
      return <img src="/icons/pdf.svg" className="h-4 w-4" alt="PDF" />;
    if (selectedFile.type.includes("word"))
      return <img src="/icons/word.svg" className="h-4 w-4" alt="Word" />;
    return <FileIcon className="h-4 w-4" />;
  };

  return (
    <div ref={inputContainerRef} className="p-2">
      <div className="flex flex-col gap-1 md:gap-2 lg:gap-2">
        {/* Added pb-4 for a moderate space between the text area and the absolute-positioned buttons */}
        <div className="relative bg-[#1a1a1a] rounded-lg border border-gray-800 pb-4">
          {/* Display selected file info with loading states (moved above the textarea) */}
          {selectedFile && (
            <div className="mt-1 mx-3 p-2 text-sm text-gray-300 bg-gray-800 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon()}
                <span className="text-xs truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
                {fileProcessingStatus === "processing" && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                )}
                {fileProcessingStatus === "error" && (
                  <span className="text-red-400 text-xs">(Error)</span>
                )}
              </div>
              <button
                onClick={resetFileState}
                className="text-gray-400 hover:text-red-400"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Display file error message (if any) above the textarea */}
          {fileError && (
            <div className="mt-1 mx-3 p-2 text-xs text-red-400 bg-red-900/20 rounded-md">
              {fileError}
            </div>
          )}

          {/* Main text area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onClick={handleTextareaClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Send a message..."
            className="w-full bg-transparent text-white rounded-lg p-3 pr-14 
              min-h-[88px] max-h-[200px] resize-none focus:outline-none
              overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500
              scrollbar-track-gray-800 scrollbar-thumb-rounded-full"
            style={{ transition: "height 0.2s ease" }}
          />

          {/* Extra buttons (visible in censored mode) */}
          {isCensored && (
            <div className="absolute bottom-2 left-3 flex items-center space-x-4">
              {/* File upload button with dropdown */}
              <div className="relative group" ref={fileDropdownRef}>
                <Button
                  onClick={() =>
                    setIsFileAdditionEnabled(!isFileAdditionEnabled)
                  }
                  variant="ghost"
                  className={`flex items-center text-sm border ${
                    isFileAdditionEnabled || selectedFile
                      ? "text-green-500 border-green-500"
                      : "text-gray-400 border-gray-400"
                  }`}
                >
                  <Plus size={16} />
                </Button>
                <div className="absolute bottom-full left-1/2 -translate-x-[30%] mb-2 hidden group-hover:block z-50">
                  <div className="px-2 py-1 bg-black text-white text-xs rounded-md relative whitespace-nowrap">
                    Upload Files and More
                    <div
                      className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 
                      border-l-4 border-l-transparent border-r-4 border-r-transparent 
                      border-t-4 border-t-black"
                    />
                  </div>
                </div>
                {isFileAdditionEnabled && (
                  <div
                    className="absolute bottom-full mb-2
                      w-60 bg-black text-white text-sm rounded-md p-3 flex flex-col
                      whitespace-normal shadow-md border border-gray-700 z-50
                      right-[-180px]"
                  >
                    <div
                      className="cursor-pointer hover:bg-gray-700 p-2 flex items-center gap-2"
                      onClick={triggerFilePicker}
                    >
                      <FileIcon className="h-5 w-5" />
                      <span>Upload from computer</span>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-gray-700 p-2 flex items-center gap-2"
                      onClick={() =>
                        (window.location.href = "https://drive.google.com")
                      }
                    >
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Google_Drive_logo.png/20px-Google_Drive_logo.png"
                        alt="Google Drive"
                        className="w-5 h-5"
                      />
                      <span>Connect to Google Drive</span>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-gray-700 p-2 flex items-center gap-2"
                      onClick={() =>
                        (window.location.href = "https://onedrive.live.com")
                      }
                    >
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Microsoft_Office_OneDrive_%282019–present%29.svg/20px-Microsoft_Office_OneDrive_%282019–present%29.svg.png"
                        alt="Microsoft OneDrive"
                        className="w-5 h-5"
                      />
                      <span>Connect to Microsoft OneDrive</span>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Search button */}
              <div className="relative group">
                <Button
                  onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                  variant="ghost"
                  title="Search the Web"
                  className={`flex items-center gap-1 text-sm border ${
                    isSearchEnabled
                      ? "text-green-500 border-green-500"
                      : "text-gray-400 border-gray-400"
                  }`}
                >
                  <SearchIcon size={16} />
                  <span>Search</span>
                </Button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                  <div className="px-2 py-1 bg-black text-white text-xs rounded-md relative whitespace-nowrap">
                    Search the Web
                    <div
                      className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 
                      border-l-4 border-l-transparent border-r-4 border-r-transparent 
                      border-t-4 border-t-black"
                    />
                  </div>
                </div>
              </div>

              {/* Reason button */}
              <div className="relative group">
                <Button
                  onClick={() => setIsReasoningEnabled(!isReasoningEnabled)}
                  variant="ghost"
                  title="Think before Responding"
                  className={`flex items-center gap-1 text-sm border ${
                    isReasoningEnabled
                      ? "text-green-500 border-green-500"
                      : "text-gray-400 border-gray-400"
                  }`}
                >
                  <Lightbulb size={16} />
                  <span>Reason</span>
                </Button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                  <div className="px-2 py-1 bg-black text-white text-xs rounded-md relative whitespace-nowrap">
                    Think before Responding
                    <div
                      className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 
                      border-l-4 border-l-transparent border-r-4 border-r-transparent 
                      border-t-4 border-t-black"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <Button
            onClick={onSend}
            disabled={
              isGenerating ||
              (!input.trim() && !selectedFile) ||
              disabled ||
              fileProcessingStatus === "processing"
            }
            className="absolute right-2 bottom-3 bg-blue-600 hover:bg-blue-800
              cursor-pointer text-white rounded-lg py-2 px-3 md:flex items-center justify-center
              transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20
              transform hover:scale-105 disabled:bg-blue-600/50
              disabled:hover:scale-100 disabled:hover:shadow-none hidden"
          >
            {isGenerating || fileProcessingStatus === "processing" ? (
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
          onClick={onSend}
          disabled={
            isGenerating ||
            (!input.trim() && !selectedFile) ||
            disabled ||
            fileProcessingStatus === "processing"
          }
          className="md:hidden w-full bg-blue-600 hover:bg-blue-800 cursor-pointer
            text-white rounded-lg p-2 flex items-center justify-center gap-2
            transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20
            disabled:bg-blue-600/50 disabled:hover:shadow-none mt-2"
        >
          {isGenerating || fileProcessingStatus === "processing" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>
                {fileProcessingStatus === "processing"
                  ? "Processing file..."
                  : "Generating..."}
              </span>
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
