import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gmwxwmvmzedyvwddspew.supabase.co";
const supabaseAnonKey = "sb_publishable_LSSmQNzGCMtxaBrOQHKC2w_PjJDWjKn";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
