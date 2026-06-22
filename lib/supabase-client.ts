import { createBrowserClient } from "@supabase/ssr";

export const createClientSideClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  console.log("Supabase Client Init - URL:", url, "Key:", key ? "exists" : "missing");
  return createBrowserClient(url, key);
};
