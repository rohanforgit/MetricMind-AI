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

    // 1. Fetch total datasets count and row count sum
    const { data: datasets, error: datasetsError } = await supabase
      .from("datasets")
      .select("row_count, name, created_at, id")
      .eq("user_id", user.id);

    if (datasetsError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch datasets: " + datasetsError.message },
        { status: 500 }
      );
    }

    const totalDatasets = datasets?.length || 0;
    const totalRowsMonitored = datasets?.reduce((sum, d) => sum + (d.row_count || 0), 0) || 0;

    // 2. Fetch total insights count
    const { count: totalInsights, error: insightsError } = await supabase
      .from("generated_insights")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (insightsError) {
      console.warn("Could not query insights count:", insightsError.message);
    }

    // 3. Get recent uploads (last 5 items)
    const recentUploads = datasets
      ? [...datasets]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((d) => ({ id: d.id, name: d.name, created_at: d.created_at }))
      : [];

    return NextResponse.json({
      success: true,
      summary: {
        total_datasets: totalDatasets,
        total_rows_monitored: totalRowsMonitored,
        total_insights_generated: totalInsights || 0,
        recent_uploads: recentUploads,
      },
    });
  } catch (err: any) {
    console.error("Dashboard summary API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}
