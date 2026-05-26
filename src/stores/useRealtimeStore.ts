import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuthStore";
import type { RealtimeState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import { useFriendStore } from "./useFriendStore";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/sound";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  channels: [],
  onlineUsers: [],

  connectRealtime: () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Ngắt kết nối cũ trước khi tạo mới (tránh duplicate listeners)
    get().disconnectRealtime();

    const userId = user._id || (user as any).id;

    console.log("[Realtime] Connecting for user:", userId);

    let isTabVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const createdChannels: RealtimeChannel[] = [];

    // ──────────────────────────────────────────────────────────
    // 1. Lắng nghe tin nhắn mới (INSERT vào bảng messages)
    // ──────────────────────────────────────────────────────────
    const messageChannel = supabase
      .channel("realtime:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload.new as any;
          const { conversations, activeConversationId } =
            useChatStore.getState();

          console.log("[Realtime] New message received:", message._id, "for convo:", message.conversationId);

          // Chỉ xử lý tin nhắn thuộc conversations mà user đang tham gia
          const targetConvo = conversations.find(
            (c) => c._id === message.conversationId
          );
          if (!targetConvo) {
            console.log("[Realtime] Skipped - conversation not found in local list");
            return;
          }

          // Thêm tin nhắn vào store
          useChatStore.getState().addMessage(message);

          // Tìm sender info
          const sender = targetConvo.participants.find(
            (p) => p._id === message.senderId
          );
          const senderName = sender?.displayName || "ai đó";

          // Cập nhật lastMessage cho conversation
          const lastContent = message.fileUrl
            ? message.fileName
              ? `📎 ${message.fileName}`
              : "📎 Đã gửi một tệp"
            : message.content;

          const updatedConversation = {
            ...targetConvo,
            lastMessage: {
              _id: message._id,
              content: lastContent,
              createdAt: message.createdAt,
              sender: {
                _id: message.senderId,
                displayName: senderName,
                avatarUrl: sender?.avatarUrl || null,
              },
            },
            updatedAt: message.createdAt,
          };
          useChatStore.getState().updateConversation(updatedConversation);

          // ── Notifications ──
          if (activeConversationId === message.conversationId) {
            // Đang mở conversation này → đánh dấu đã xem
            useChatStore.getState().markAsSeen();
          } else if (message.senderId !== userId) {
            // Tin nhắn từ người khác ở conversation khác
            if (!isTabVisible) {
              playNotificationSound();
            }

            if (Notification.permission === "granted") {
              const groupName = targetConvo?.group?.name;
              const title =
                targetConvo?.type === "group"
                  ? `Tin nhắn mới trong ${groupName}`
                  : `Tin nhắn mới từ ${senderName}`;

              const notification = new Notification(title, {
                body: message.fileUrl
                  ? message.fileName
                    ? `📎 ${message.fileName}`
                    : "📎 Đã gửi một tệp"
                  : message.content,
              });
              notification.onclick = () => {
                if (
                  activeConversationId === message.conversationId ||
                  document.hidden
                ) {
                  window.focus();
                }
              };
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] messages channel:", status, err || "");
      });
    createdChannels.push(messageChannel);

    // ──────────────────────────────────────────────────────────
    // 2. Lắng nghe lời mời kết bạn (INSERT vào bảng friend_requests)
    // ──────────────────────────────────────────────────────────
    const friendRequestChannel = supabase
      .channel("realtime:friend_requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friend_requests",
        },
        (payload) => {
          const newReq = payload.new as any;
          if (newReq.receiverId === userId) {
            useFriendStore.getState().getAllFriendRequests();
            if (!isTabVisible) playNotificationSound();
            toast.info("Bạn có một lời mời kết bạn mới");
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] friend_requests channel:", status, err || "");
      });
    createdChannels.push(friendRequestChannel);

    // ──────────────────────────────────────────────────────────
    // 3. Lắng nghe khi được thêm vào group / conversation mới
    //    (INSERT vào conversation_participants)
    // ──────────────────────────────────────────────────────────
    const participantsChannel = supabase
      .channel("realtime:conversation_participants")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
        },
        async (payload) => {
          const newParticipant = payload.new as any;
          if (newParticipant.userId === userId) {
            // Khi bạn được add vào group mới hoặc có ai đó tạo conversation với bạn
            await useChatStore.getState().fetchConversations();
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] conversation_participants channel:", status, err || "");
      });
    createdChannels.push(participantsChannel);

    // ──────────────────────────────────────────────────────────
    // 4. Lắng nghe thay đổi trên conversations
    //    (UPDATE: ai đó đã xem, unreadCounts thay đổi, ...)
    // ──────────────────────────────────────────────────────────
    const conversationsChannel = supabase
      .channel("realtime:conversations")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updatedConvo = payload.new;
          useChatStore.getState().updateConversation(updatedConvo);
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] conversations channel:", status, err || "");
      });
    createdChannels.push(conversationsChannel);

    // ──────────────────────────────────────────────────────────
    // 5. Lắng nghe xóa friend_requests (khi ai đó accept/decline)
    // ──────────────────────────────────────────────────────────
    const friendRequestDeleteChannel = supabase
      .channel("realtime:friend_requests_delete")
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "friend_requests",
        },
        () => {
          // Refresh danh sách friend requests khi có thay đổi
          useFriendStore.getState().getAllFriendRequests();
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] friend_requests_delete channel:", status, err || "");
      });
    createdChannels.push(friendRequestDeleteChannel);

    // ──────────────────────────────────────────────────────────
    // 6. Lắng nghe bạn bè mới (INSERT vào bảng friends)
    // ──────────────────────────────────────────────────────────
    const friendsChannel = supabase
      .channel("realtime:friends")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friends",
        },
        (payload) => {
          const newFriend = payload.new as any;
          if (newFriend.userId === userId) {
            // Refresh danh sách bạn bè
            useFriendStore.getState().getFriends();
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] friends channel:", status, err || "");
      });
    createdChannels.push(friendsChannel);

    // ──────────────────────────────────────────────────────────
    // 7. Presence – theo dõi user online (thay thế socket.io)
    // ──────────────────────────────────────────────────────────
    const presenceChannel = supabase.channel("online-users");
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineUsers = Object.values(state).map(
          (u: any) => u[0].user_id
        );
        set({ onlineUsers });
      })
      .subscribe(async (status, err) => {
        console.log("[Realtime] presence channel:", status, err || "");
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: userId });
        }
      });
    createdChannels.push(presenceChannel);

    // Lưu tất cả channels vào store để cleanup sau
    set({ channels: createdChannels });
  },

  disconnectRealtime: () => {
    const { channels } = get();

    // Unsubscribe từng channel cụ thể
    channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });

    set({ channels: [], onlineUsers: [] });
  },
}));
