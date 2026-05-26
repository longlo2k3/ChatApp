import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { FileUp, ImagePlus, Paperclip, Send, X } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";
import { cn, formatFileSize } from "@/lib/utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { user } = useAuthStore();
  const { sendDirectMessage, sendGroupMessage } = useChatStore();
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return;

  const isImage = (file: File) => file.type.startsWith("image/");

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File quá lớn! Giới hạn tối đa 50MB.");
      return;
    }

    setSelectedFile(file);

    if (isImage(file)) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input to allow re-selecting the same file
    e.target.value = "";
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const sendMessage = async () => {
    if (!value.trim() && !selectedFile) return;

    const currValue = value;
    const currFile = selectedFile;
    setValue("");
    setSelectedFile(null);
    setFilePreview(null);
    setIsSending(true);

    try {
      if (selectedConvo.type === "direct") {
        const participants = selectedConvo.participants;
        const otherUser = participants.filter((p) => p._id !== user._id)[0];
        await sendDirectMessage(otherUser._id, currValue, undefined, currFile || undefined);
      } else {
        await sendGroupMessage(selectedConvo._id, currValue, undefined, currFile || undefined);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Bạn hãy thử lại!");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return "🖼️";
    if (file.type.startsWith("video/")) return "🎬";
    if (file.type.startsWith("audio/")) return "🎵";
    if (file.type.includes("pdf")) return "📄";
    if (file.type.includes("word") || file.type.includes("document")) return "📝";
    if (file.type.includes("sheet") || file.type.includes("excel")) return "📊";
    if (file.type.includes("zip") || file.type.includes("rar") || file.type.includes("compressed")) return "📦";
    return "📎";
  };

  return (
    <div
      className={cn(
        "bg-background transition-smooth relative",
        isDragOver && "ring-2 ring-primary ring-inset bg-primary/5"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <FileUp className="size-8 animate-bounce" />
            <span className="font-medium text-sm">Thả file vào đây</span>
          </div>
        </div>
      )}

      {/* File preview bar */}
      {selectedFile && (
        <div className="px-3 pt-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50 group">
            {/* Image preview thumbnail */}
            {filePreview && isImage(selectedFile) ? (
              <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border border-border/50">
                <img
                  src={filePreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl">
                {getFileIcon(selectedFile)}
              </div>
            )}

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100 transition-smooth hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
              onClick={removeFile}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 p-3 min-h-[56px]">
        {/* File attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/10 transition-smooth"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <Paperclip className="size-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv"
        />

        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/10 transition-smooth"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = "image/*";
              fileInputRef.current.click();
              // Reset accept after a short delay
              setTimeout(() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv";
                }
              }, 100);
            }
          }}
          disabled={isSending}
        >
          <ImagePlus className="size-4" />
        </Button>

        <div className="flex-1 relative">
          <Input
            onKeyPress={handleKeyPress}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={selectedFile ? "Thêm ghi chú cho file..." : "Soạn tin nhắn..."}
            className="pr-20 h-9 bg-white dark:bg-muted border-border/50 focus:border-primary/50 transition-smooth resize-none"
            disabled={isSending}
          ></Input>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
            >
              <div>
                <EmojiPicker
                  onChange={(emoji: string) => setValue(`${value}${emoji}`)}
                />
              </div>
            </Button>
          </div>
        </div>

        <Button
          onClick={sendMessage}
          className={cn(
            "bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105",
            isSending && "opacity-70 pointer-events-none"
          )}
          disabled={(!value.trim() && !selectedFile) || isSending}
        >
          {isSending ? (
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="size-4 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
