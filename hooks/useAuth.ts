import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClientSideClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientSideClient();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error("Error retrieving initial auth session:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          setLoading(false);
          if (event === "SIGNED_OUT") {
            router.push("/login");
            router.refresh();
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Error signing out:", err);
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signOut,
    supabase,
  };
}
