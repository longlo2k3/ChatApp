import { supabase } from "@/lib/supabase";
import type { ConversationResponse, Message } from "@/types/chat";
import { useAuthStore } from "@/stores/useAuthStore";

interface FetchMessageProps {
  messages: Message[];
  cursor?: string;
}

const pageLimit = 50;

export const chatService = {
  async uploadFile(file: File): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileType: string }> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    const fileExt = file.name.split(".").pop();
    const filePath = `${user._id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("chat-files")
      .getPublicUrl(filePath);

    return {
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  },

  async fetchConversations(): Promise<ConversationResponse> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    // Lấy danh sách conversationId mà user tham gia
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("conversationId")
      .eq("userId", user._id);

    const conversationIds = participants?.map((p) => p.conversationId) || [];

    if (conversationIds.length === 0) return { conversations: [] };

    // Lấy thông tin chi tiết các cuộc trò chuyện
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        *,
        participants:conversation_participants(
          userId:users(*)
        ),
        lastMessage:messages(*)
      `)
      .in("_id", conversationIds)
      .order("updatedAt", { ascending: false });

    if (error) throw error;

    // Chuyển đổi định dạng data cho khớp với frontend
    const formattedConversations = conversations?.map((c: any) => ({
      ...c,
      participants: c.participants.map((p: any) => p.userId),
      lastMessage: Array.isArray(c.lastMessage) ? c.lastMessage[0] : c.lastMessage,
    })) || [];

    return { conversations: formattedConversations as any };
  },

  async fetchMessages(id: string, cursor?: string): Promise<FetchMessageProps> {
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversationId", id)
      .order("createdAt", { ascending: false })
      .limit(pageLimit);

    if (cursor) {
      query = query.lt("createdAt", cursor);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    return {
      messages: (messages as any) || [],
      cursor: messages?.length === pageLimit ? messages[messages.length - 1].createdAt : undefined,
    };
  },

  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    imgUrl?: string,
    conversationId?: string,
    fileData?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }
  ) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    let convoId = conversationId;

    // Nếu chưa có conversation thì tạo mới (Direct)
    if (!convoId) {
      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert({ type: "direct", updatedAt: new Date().toISOString() })
        .select()
        .single();
      if (convoError) throw convoError;
      convoId = newConvo._id;

      // Thêm participants
      await supabase.from("conversation_participants").insert([
        { conversationId: convoId, userId: user._id },
        { conversationId: convoId, userId: recipientId },
      ]);
    }

    // Tạo tin nhắn mới
    const messagePayload: Record<string, any> = {
      conversationId: convoId,
      senderId: user._id,
      content,
      imgUrl,
      createdAt: new Date().toISOString(),
    };
    if (fileData) {
      messagePayload.fileUrl = fileData.fileUrl;
      messagePayload.fileName = fileData.fileName;
      messagePayload.fileSize = fileData.fileSize;
      messagePayload.fileType = fileData.fileType;
    }

    const { data: newMessage, error: messageError } = await supabase
      .from("messages")
      .insert(messagePayload)
      .select()
      .single();

    if (messageError) throw messageError;

    // Cập nhật lastMessageAt cho conversation
    await supabase
      .from("conversations")
      .update({ updatedAt: new Date().toISOString() })
      .eq("_id", convoId);

    return newMessage as any;
  },

  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    imgUrl?: string,
    fileData?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }
  ) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    const messagePayload: Record<string, any> = {
      conversationId,
      senderId: user._id,
      content,
      imgUrl,
      createdAt: new Date().toISOString(),
    };
    if (fileData) {
      messagePayload.fileUrl = fileData.fileUrl;
      messagePayload.fileName = fileData.fileName;
      messagePayload.fileSize = fileData.fileSize;
      messagePayload.fileType = fileData.fileType;
    }

    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert(messagePayload)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from("conversations")
      .update({ updatedAt: new Date().toISOString() })
      .eq("_id", conversationId);

    return newMessage as any;
  },

  async markAsSeen(conversationId: string) {
    // Đánh dấu đã xem bằng cách cập nhật bảng seen_users hoặc tương tự.
    // Ở đây mô phỏng việc gọi API để đánh dấu. Cần cấu trúc DB cụ thể để mapping chính xác.
    return { success: true };
  },

  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    const { data: newConvo, error: convoError } = await supabase
      .from("conversations")
      .insert({
        type,
        group: type === "group" ? { name, createdBy: user._id } : null,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (convoError) throw convoError;

    const participants = [...new Set([...memberIds, user._id])].map((userId) => ({
      conversationId: newConvo._id,
      userId,
    }));

    await supabase.from("conversation_participants").insert(participants);

    // Lấy thông tin chi tiết cuộc trò chuyện vừa tạo để trả về đầy đủ participants
    const { data: fullConvo, error: fetchError } = await supabase
      .from("conversations")
      .select(`
        *,
        participants:conversation_participants(
          userId:users(*)
        ),
        lastMessage:messages(*)
      `)
      .eq("_id", newConvo._id)
      .single();

    if (fetchError) throw fetchError;

    return {
      ...fullConvo,
      participants: fullConvo.participants.map((p: any) => p.userId),
      lastMessage: Array.isArray(fullConvo.lastMessage) ? fullConvo.lastMessage[0] : fullConvo.lastMessage,
    } as any;
  },
};
