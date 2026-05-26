import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export const userService = {
  uploadAvatar: async (formData: FormData) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Chưa đăng nhập");

    const file = formData.get("avatar") as File; // giả sử field là 'avatar'
    if (!file) throw new Error("Không tìm thấy file");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user._id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload lên Supabase Storage bucket tên 'public'
    const { error: uploadError } = await supabase.storage
      .from("public")
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    // Lấy URL public
    const { data: { publicUrl } } = supabase.storage
      .from("public")
      .getPublicUrl(filePath);

    // Cập nhật URL vào bảng users
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatarUrl: publicUrl })
      .eq("_id", user._id);

    if (updateError) throw new Error(updateError.message);

    return { avatarUrl: publicUrl };
  },
};
