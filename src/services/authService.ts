import { supabase } from "@/lib/supabase";

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          firstName,
          lastName,
        },
      },
    });

    if (error) throw error;

    // Tự động tạo user profile trong bảng users (hoặc bạn có thể dùng DB Trigger trên Supabase)
    if (data.user) {
      const { error: insertError } = await supabase.from("users").insert({
        _id: data.user.id,
        email,
        username,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        createdAt: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Lỗi khi insert vào bảng users:", insertError);
        throw new Error("Lỗi khi tạo hồ sơ người dùng: " + insertError.message);
      }
    }

    return data;
  },

  signIn: async (username: string, password: string) => {
    // Supabase mặc định đăng nhập bằng email.
    // Nếu bạn muốn đăng nhập bằng username, bạn phải lấy email tương ứng với username trước.
    // (Giả sử bạn dùng email để đăng nhập trong hàm này, tạm thời sửa thành username/email mapping)

    const { data: userRecord } = await supabase
      .from("users")
      .select("email")
      .ilike("username", username)
      .maybeSingle();

    let loginEmail = userRecord?.email;

    if (!loginEmail) {
      if (username.includes("@")) {
        loginEmail = username;
      } else {
        throw new Error("Tên đăng nhập không tồn tại!");
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) throw error;
    return { accessToken: data.session?.access_token, user: data.user };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  fetchMe: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Lấy thông tin user từ bảng users (vì auth.users chỉ có info cơ bản)
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("_id", user.id)
      .maybeSingle();

    if (!profile) {
      // Nếu user đăng nhập được qua auth nhưng chưa có trong bảng users (do thiếu sót khi đky)
      // Tạo một record mặc định để không bị lỗi Foreign Key khi dùng các tính năng khác.
      const fallbackUsername = user.email?.split("@")[0] || `user_${Date.now()}`;
      const newProfile = {
        _id: user.id,
        email: user.email || "",
        username: fallbackUsername,
        firstName: "Người dùng",
        lastName: fallbackUsername,
        displayName: fallbackUsername,
        createdAt: new Date().toISOString(),
      };
      await supabase.from("users").insert(newProfile);
      return newProfile;
    }

    return profile;
  },

  refresh: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session?.access_token;
  },
};
