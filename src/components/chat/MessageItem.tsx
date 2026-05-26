import { cn, formatFileSize, formatMessageTime } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Download, FileText } from "lucide-react";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
}

const isImageType = (type: string | null | undefined) =>
  type?.startsWith("image/");

const getFileEmoji = (type: string | null | undefined) => {
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
            "max-w-xs lg:max-w-md space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start",
          )}
        >
          <Card
            className={cn(
              "overflow-hidden",
              hasFile && !hasContent ? "p-0" : "p-3",
              message.isOwn
                ? "chat-bubble-sent border-0"
                : "chat-bubble-received",
            )}
          >
            {/* Image attachment */}
            {hasImage && (
              <a
                href={message.fileUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="block group/img"
              >
                <div className={cn(
                  "relative overflow-hidden",
                  hasContent ? "rounded-md mb-2" : "rounded-sm",
                )}>
                  <img
                    src={message.fileUrl!}
                    alt={message.fileName || "image"}
                    className="max-w-full max-h-[300px] object-cover transition-transform duration-300 group-hover/img:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-200" />
                </div>
              </a>
            )}

            {/* Non-image file attachment */}
            {hasFile && !hasImage && (
              <a
                href={message.fileUrl!}
                target="_blank"
                rel="noopener noreferrer"
                download={message.fileName || undefined}
                className="block"
              >
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors duration-200",
                  message.isOwn
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-muted/50 hover:bg-muted",
                  hasContent && "mb-2",
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg",
                    message.isOwn ? "bg-white/20" : "bg-primary/10",
                  )}>
                    {getFileEmoji(message.fileType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      message.isOwn ? "text-white" : "text-foreground",
                    )}>
                      {message.fileName || "Tệp đính kèm"}
                    </p>
                    {message.fileSize && (
                      <p className={cn(
                        "text-xs",
                        message.isOwn ? "text-white/60" : "text-muted-foreground",
                      )}>
                        {formatFileSize(message.fileSize)}
                      </p>
                    )}
                  </div>

                  <Download className={cn(
                    "size-4 flex-shrink-0 opacity-60",
                    message.isOwn ? "text-white" : "text-muted-foreground",
                  )} />
                </div>
              </a>
            )}

            {/* Text content */}
            {hasContent && (
              <p className={cn(
                "text-sm leading-relaxed break-words",
                hasFile && "px-3 pb-3",
                hasFile && !hasContent && "pt-3",
              )}>
                {message.content}
              </p>
            )}

            {/* Show file name under image */}
            {hasImage && message.fileName && !hasContent && (
              <p className={cn(
                "text-xs px-3 pb-2 pt-1 truncate",
                message.isOwn ? "text-white/60" : "text-muted-foreground",
              )}>
                {message.fileName}
              </p>
            )}
          </Card>

          {/* seen/ delivered */}
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
