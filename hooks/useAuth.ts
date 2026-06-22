import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClientSideClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export function useAuth() {
  const user: any = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "guest@metricmind.ai",
    user_metadata: {
      full_name: "Guest User",
    },
  };

  const signOut = async () => {
    // Direct redirect back to dashboard since auth is bypassed
    window.location.href = "/";
  };

  return {
    user,
    loading: false,
    signOut,
    supabase: null as any,
  };
}
