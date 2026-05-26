-- Tạo extension (nếu chưa có) để dùng hàm tạo UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng Users (Đồng bộ với auth.users của Supabase)
CREATE TABLE users (
  "_id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng Conversations (Cuộc trò chuyện)
CREATE TABLE conversations (
  "_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "type" TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  "group" JSONB, -- Lưu thông tin nhóm { "name": "...", "createdBy": "..." }
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng Messages (Tin nhắn)
CREATE TABLE messages (
  "_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversationId" UUID NOT NULL REFERENCES conversations("_id") ON DELETE CASCADE,
  "senderId" UUID NOT NULL REFERENCES users("_id") ON DELETE CASCADE,
  "content" TEXT,
  "imgUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng Conversation Participants (Thành viên tham gia cuộc trò chuyện)
CREATE TABLE conversation_participants (
  "conversationId" UUID NOT NULL REFERENCES conversations("_id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES users("_id") ON DELETE CASCADE,
  PRIMARY KEY ("conversationId", "userId")
);

-- 5. Bảng Friend Requests (Lời mời kết bạn)
CREATE TABLE friend_requests (
  "_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "senderId" UUID NOT NULL REFERENCES users("_id") ON DELETE CASCADE,
  "receiverId" UUID NOT NULL REFERENCES users("_id") ON DELETE CASCADE,
  "message" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE ("senderId", "receiverId")
);

-- 6. Bảng Friends (Bạn bè)
CREATE TABLE friends (
  "userId" UUID NOT NULL REFERENCES users("_id") ON DELETE CASCADE,
  "friendId" UUID NOT NULL REFERENCES users("_id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY ("userId", "friendId")
);

-- ==============================================================================
-- KÍCH HOẠT REALTIME CHO CÁC BẢNG CẦN THIẾT
-- ==============================================================================
-- Bật chức năng realtime (Postgres Changes) cho messages và friend_requests
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;

-- ==============================================================================
-- CẤU HÌNH BẢO MẬT RLS (Tùy Chọn)
-- Hiện tại tạm thời Disable RLS để bạn dễ dev, khi nào release thì Enable sau.
-- ==============================================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
