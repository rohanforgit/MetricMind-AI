import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
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

    // 1. Fetch dataset profile (summary statistics, headers, metadata)
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("*")
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { success: false, error: "Dataset not found or access denied." },
        { status: 404 }
      );
    }

    // 2. Fetch first 100 rows for layout render aggregation
    const { data: rows, error: rowsError } = await supabase
      .from("dataset_rows")
      .select("row_index, row_data")
      .eq("dataset_id", datasetId)
      .order("row_index", { ascending: true })
      .limit(100);

    if (rowsError) {
      console.error("Database select rows error:", rowsError.message);
      return NextResponse.json(
        { success: false, error: "Failed to load sample data rows." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      dataset,
      sample_rows: rows || [],
    });
  } catch (err: any) {
    console.error("GET dataset details API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 550 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
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

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Dataset name is required." },
        { status: 400 }
      );
    }

    const { data: updatedDataset, error: updateError } = await supabase
      .from("datasets")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .select("id, name")
      .single();

    if (updateError) {
      console.error("Database update rename dataset error:", updateError.message);
      return NextResponse.json(
        { success: false, error: "Failed to rename dataset." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      dataset: updatedDataset,
    });
  } catch (err: any) {
    console.error("PATCH dataset API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
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

    const { data: dataset, error: fetchError } = await supabase
      .from("datasets")
      .select("file_path")
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !dataset) {
      return NextResponse.json(
        { success: false, error: "Dataset not found or access denied." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("datasets")
      .delete()
      .eq("id", datasetId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Database delete dataset error:", deleteError.message);
      return NextResponse.json(
        { success: false, error: "Failed to delete dataset from database." },
        { status: 500 }
      );
    }

    if (dataset.file_path && !dataset.file_path.startsWith("fallback/")) {
      try {
        await supabase.storage.from("datasets").remove([dataset.file_path]);
      } catch (storageErr) {
        console.warn("Could not remove file from Supabase storage:", storageErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dataset deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE dataset API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error occurred." },
      { status: 550 }
    );
  }
}
