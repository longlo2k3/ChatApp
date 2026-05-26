import { useFriendStore } from "@/stores/useFriendStore";
import FriendRequestItem from "./FriendRequestItem";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";

const ReceivedRequests = () => {
  const { acceptRequest, declineRequest, loading, receivedList } = useFriendStore();

  if (!receivedList || receivedList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bạn chưa có lời mời kết bạn nào.
      </p>
    );
  }

  const handleAccept = async (requestId: string, senderId?: string) => {
    try {
      await acceptRequest(requestId);
      toast.success("Đã đồng ý kết bạn thành công");
      
      if (!senderId) return;
      
      // Auto open or create conversation
      const chatStore = useChatStore.getState();
      const existingConvo = chatStore.conversations.find((c) => 
        c.type === "direct" && 
        c.participants.some((p: any) => p === senderId || p._id === senderId)
      );
      
      if (existingConvo) {
        chatStore.setActiveConversation(existingConvo._id);
      } else {
        await chatStore.createConversation("direct", "", [senderId]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId);
      toast.info("Đã từ chối kết bạn");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-3 mt-4">
      {receivedList.map((req) => (
        <FriendRequestItem
          key={req._id}
          requestInfo={req}
          actions={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleAccept(req._id, req.sender?._id)}
                disabled={loading}
              >
                Chấp nhận
              </Button>
              <Button
                size="sm"
                variant="destructiveOutline"
                onClick={() => handleDecline(req._id)}
                disabled={loading}
              >
                Từ chối
              </Button>
            </div>
          }
          type="received"
        />
      ))}
    </div>
  );
};

export default ReceivedRequests;
