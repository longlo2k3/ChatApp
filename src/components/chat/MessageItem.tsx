import { cn, formatFileSize, formatMessageTime } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Download } from "lucide-react";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
}

const isImageType = (type: string | null | undefined) =>
  type?.startsWith("image/");

const getFileIcon = (type: string | null | undefined) => {
  if (!type) return "📎";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("zip") || type.includes("rar") || type.includes("compressed")) return "📦";
  return "📎";
};

const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
  lastMessageStatus,
}: MessageItemProps) => {
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;

  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() -
      new Date(prev?.createdAt || 0).getTime() >
      300000; // 5 phút

  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString(),
  );

  const hasFile = !!message.fileUrl;
  const hasImage = hasFile && isImageType(message.fileType);
  const hasNonImageFile = hasFile && !hasImage;
  const hasContent = !!message.content?.trim();

  return (
    <>
      {/* time */}
      {isShowTime && (
        <span className="flex justify-center text-xs text-muted-foreground px-1">
          {formatMessageTime(new Date(message.createdAt))}
        </span>
      )}

      <div
        className={cn(
          "flex gap-2 message-bounce mt-1",
          message.isOwn ? "justify-end" : "justify-start",
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isGroupBreak && (
              <UserAvatar
                type="chat"
                name={participant?.displayName ?? "LongVy"}
                avatarUrl={participant?.avatarUrl ?? undefined}
              />
            )}
          </div>
        )}

        {/* tin nhắn */}
        <div
          className={cn(
            "max-w-xs lg:max-w-md flex flex-col gap-1",
            message.isOwn ? "items-end" : "items-start",
          )}
        >
          {/* ── Image attachment (Messenger-style: standalone, no bubble) ── */}
          {hasImage && (
            <a
              href={message.fileUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="block group/img"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-sm">
                <img
                  src={message.fileUrl!}
                  alt={message.fileName || "image"}
                  className="max-w-full max-h-[300px] object-cover transition-transform duration-300 group-hover/img:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-200 rounded-2xl" />
              </div>
            </a>
          )}

          {/* ── Non-image file attachment (Messenger-style card) ── */}
          {hasNonImageFile && (
            <a
              href={message.fileUrl!}
              target="_blank"
              rel="noopener noreferrer"
              download={message.fileName || undefined}
              className="block w-full group/file"
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200",
                  message.isOwn
                    ? "bg-gradient-to-r from-blue-500/90 to-indigo-500/90 border-white/10 hover:from-blue-500 hover:to-indigo-500 shadow-md"
                    : "bg-card border-border/60 hover:bg-accent/50 shadow-sm",
                )}
              >
                {/* File icon */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl",
                    message.isOwn
                      ? "bg-white/20"
                      : "bg-primary/10",
                  )}
                >
                  {getFileIcon(message.fileType)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold truncate",
                      message.isOwn ? "text-white" : "text-foreground",
                    )}
                  >
                    {message.fileName || "Tệp đính kèm"}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-0.5",
                      message.isOwn ? "text-white/60" : "text-muted-foreground",
                    )}
                  >
                    {message.fileSize ? formatFileSize(message.fileSize) : "Tệp đính kèm"}
                  </p>
                </div>

                {/* Download icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                    message.isOwn
                      ? "bg-white/15 group-hover/file:bg-white/25"
                      : "bg-muted group-hover/file:bg-primary/10",
                  )}
                >
                  <Download
                    className={cn(
                      "size-4",
                      message.isOwn ? "text-white" : "text-muted-foreground",
                    )}
                  />
                </div>
              </div>
            </a>
          )}

          {/* ── Text content bubble ── */}
          {hasContent && (
            <Card
              className={cn(
                "overflow-hidden p-3",
                message.isOwn
                  ? "chat-bubble-sent border-0"
                  : "chat-bubble-received",
              )}
            >
              <p className="text-sm leading-relaxed break-words">
                {message.content}
              </p>
            </Card>
          )}

          {/* seen / delivered */}
          {message.isOwn && message._id === selectedConvo.lastMessage?._id && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0.5 h-4 border-0",
                lastMessageStatus === "seen"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {lastMessageStatus}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;
