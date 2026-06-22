import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase-server";
import { getDatasetById, getCachedInsights, saveInsights, createAnalyticsLog } from "@/lib/db-helpers";
import { generateAIInsights } from "@/lib/gemini";

export const maxDuration = 60; // Allow 60 seconds serverless run for Gemini calls

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
    const supabase = await createServerSideClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const user = authUser || { id: "00000000-0000-0000-0000-000000000000", email: "guest@metricmind.ai" };

    // 1. Fetch existing cached insights
    const cached = await getCachedInsights(datasetId, user.id);

    if (!cached) {
      return NextResponse.json({
        success: false,
        message: "No insights generated yet. Trigger generation to start.",
      });
    }

    return NextResponse.json({
      success: true,
      insights: cached,
    });
  } catch (err: any) {
    console.error("GET insights route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
    const supabase = await createServerSideClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const user = authUser || { id: "00000000-0000-0000-0000-000000000000", email: "guest@metricmind.ai" };

    // 1. Retrieve dataset profile to check ownership and retrieve summary_statistics
    const dataset = await getDatasetById(datasetId, user.id);
    if (!dataset) {
      return NextResponse.json(
        { success: false, error: "Dataset not found or access denied." },
        { status: 404 }
      );
    }

    // 2. Generate insights via Gemini wrapper
    const generatedContent = await generateAIInsights(
      dataset.name,
      dataset.headers,
      dataset.summary_statistics
    );

    // 3. Delete existing cached insights for this dataset before saving a new one, if any (to prevent multiple entries per dataset)
    await supabase
      .from("generated_insights")
      .delete()
      .eq("dataset_id", datasetId)
      .eq("user_id", user.id);

    // 4. Save/Cache insights in database
    const savedRecord = await saveInsights(datasetId, user.id, generatedContent);

    // 5. Append Platform usage analytics
    await createAnalyticsLog(user.id, "generate_insights", {
      dataset_id: datasetId,
      name: dataset.name,
    });

    return NextResponse.json({
      success: true,
      insights: savedRecord,
    });
  } catch (err: any) {
    console.error("POST insights route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}
