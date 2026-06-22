import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
      const supabase = await createServerSideClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        console.error("Code exchange error:", error.message);
      }
    }

    return NextResponse.redirect(
      `${origin}/login?error=Could not exchange authorization code for session`
    );
  } catch (err: any) {
    console.error("Auth callback GET error:", err);
    return NextResponse.redirect(
      `${new URL(request.url).origin}/login?error=Internal server error during authentication`
    );
  }
}
