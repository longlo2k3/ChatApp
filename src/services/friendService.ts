import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export const friendService = {
  async searchByUsername(username: string) {
    const currentUser = useAuthStore.getState().user;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .ilike("username", username)
      .maybeSingle();

    if (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      return null;
    }

    // Không cho phép tự tìm chính mình
    const foundUserId = data?._id || data?.id;
    const currentUserId = currentUser?._id || currentUser?.id;

    if (
      data &&
      currentUser &&
      foundUserId &&
      currentUserId &&
      foundUserId === currentUserId
    ) {
      throw new Error("Bạn không thể kết bạn với chính mình!");
    }

    return data;
  },

  async sendFriendRequest(to: string, message?: string) {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    const { data, error } = await supabase
      .from("friend_requests")
      .insert({
        senderId: user._id || user.id,
        receiverId: to,
        message,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllFriendRequest() {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return { sent: [], received: [] };

      const userId = user._id || user.id;

      const [sentReq, receivedReq] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("*, receiver:users!receiverId(*)")
          .eq("senderId", userId),
        supabase
          .from("friend_requests")
          .select("*, sender:users!senderId(*)")
          .eq("receiverId", userId),
      ]);

      const formatRequest = (req: any, roleField: string) => ({
        ...req,
        [roleField]: Array.isArray(req[roleField])
          ? req[roleField][0]
          : req[roleField],
      });

      return {
        sent: sentReq.data?.map((req) => formatRequest(req, "receiver")) || [],
        received:
          receivedReq.data?.map((req) => formatRequest(req, "sender")) || [],
      };
    } catch (error) {
      console.error("Lỗi khi gửi getAllFriendRequest", error);
      return { sent: [], received: [] };
    }
  },

  async acceptRequest(requestId: string) {
    try {
      // Logic để chấp nhận (Có thể cần xóa request và thêm vào bảng friends)
      // Dưới đây là cách mô phỏng tùy schema.
      const { data: request } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("_id", requestId)
        .maybeSingle();

      if (!request) throw new Error("Request không tồn tại");

      // Xóa request
      await supabase.from("friend_requests").delete().eq("_id", requestId);

      // Thêm bạn bè (chiều A -> B và B -> A tùy logic schema của bạn)
      // Sử dụng upsert để tránh lỗi 409 Conflict nếu 2 người đã là bạn bè từ trước
      const { error: insertError } = await supabase.from("friends").upsert([
        { userId: request.senderId, friendId: request.receiverId },
        { userId: request.receiverId, friendId: request.senderId },
      ]);
      
      if (insertError) throw insertError;

      return request.senderId;
    } catch (error) {
      console.error("Lỗi khi gửi acceptRequest", error);
    }
  },

  async declineRequest(requestId: string) {
    try {
      await supabase.from("friend_requests").delete().eq("_id", requestId);
    } catch (error) {
      console.error("Lỗi khi gửi declineRequest", error);
    }
  },

  async getFriendList() {
    const user = useAuthStore.getState().user;
    if (!user) return [];

    const { data } = await supabase
      .from("friends")
      .select("*, friend:users!friendId(*)")
      .eq("userId", user._id || user.id);

    return (
      data?.map((item: any) =>
        Array.isArray(item.friend) ? item.friend[0] : item.friend,
      ) || []
    );
  },
};
