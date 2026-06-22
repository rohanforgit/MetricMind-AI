import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access. Please log in." },
        { status: 401 }
      );
    }

    const { data: datasets, error: datasetsError } = await supabase
      .from("datasets")
      .select("id, name, file_size, row_count, column_count, headers, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (datasetsError) {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve datasets: " + datasetsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      datasets: datasets || [],
    });
  } catch (err: any) {
    console.error("GET datasets API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}
