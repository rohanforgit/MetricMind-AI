import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase-server";
import { cleanAndProcessCSV } from "@/lib/cleanEngine";
import { checkRateLimit } from "@/lib/rate-limiter";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const maxDuration = 60; // Allow 60 seconds serverless run for larger datasets

export async function POST(request: NextRequest) {
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

    // 12.4 Rate Limiting check
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Maximum 5 uploads per minute allowed.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const customName = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Only CSV and Excel (.xlsx, .xls) files are supported.",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File is too large. Maximum supported size is 10MB.",
          code: "FILE_TOO_LARGE",
        },
        { status: 400 }
      );
    }

    const filename = customName || file.name;
    let fileText = "";

    if (extension === "xlsx" || extension === "xls") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        if (workbook.SheetNames.length === 0) {
          throw new Error("The Excel file contains no sheets.");
        }
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        fileText = XLSX.utils.sheet_to_csv(worksheet);
      } catch (excelErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to parse Excel file: ${excelErr.message || excelErr}`,
            code: "EXCEL_PARSING_FAILED",
          },
          { status: 400 }
        );
      }
    } else {
      fileText = await file.text();
    }

    const cleanResult = cleanAndProcessCSV(fileText, filename);
    if (!cleanResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: cleanResult.error || "Data processing failed.",
          code: cleanResult.code || "PROCESSING_ERROR",
        },
        { status: 400 }
      );
    }

    const datasetId = crypto.randomUUID();
    const storagePath = `${user.id}/${datasetId}.csv`;

    const cleanedCSVText = Papa.unparse(
      cleanResult.cleaned_rows.map((r) => r.row_data)
    );
    const uploadBuffer = Buffer.from(cleanedCSVText, "utf-8");

    let uploadedPath = "";
    try {
      const { data: storageData, error: storageError } = await supabase.storage
        .from("datasets")
        .upload(storagePath, uploadBuffer, {
          contentType: "text/csv",
          upsert: true,
        });

      if (storageError) {
        console.warn("Storage upload warning (ensuring bucket exists?):", storageError.message);
        uploadedPath = `fallback/${storagePath}`;
      } else {
        uploadedPath = storageData.path;
      }
    } catch (storageErr: any) {
      console.warn("Supabase storage write error:", storageErr);
      uploadedPath = `fallback/${storagePath}`;
    }

    const { data: datasetRecord, error: datasetError } = await supabase
      .from("datasets")
      .insert({
        id: datasetId,
        user_id: user.id,
        name: filename,
        file_path: uploadedPath,
        file_size: file.size,
        row_count: cleanResult.row_count,
        column_count: cleanResult.column_count,
        headers: cleanResult.headers,
        summary_statistics: cleanResult.summary_statistics,
      })
      .select()
      .single();

    if (datasetError) {
      console.error("Database save dataset error:", datasetError.message);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save dataset metadata. Please try again.",
          code: "DB_METADATA_ERROR",
        },
        { status: 500 }
      );
    }

    const batchSize = 500;
    const rows = cleanResult.cleaned_rows.map((row) => ({
      dataset_id: datasetId,
      row_index: row.row_index,
      row_data: row.row_data,
    }));

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: rowError } = await supabase
        .from("dataset_rows")
        .insert(batch);

      if (rowError) {
        console.error("Batch insert error for rows:", rowError.message);
        await supabase.from("datasets").delete().eq("id", datasetId);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to ingest dataset rows. Verification of CSV parameters failed.",
            code: "DB_ROW_ERROR",
          },
          { status: 500 }
        );
      }
    }

    await supabase.from("analytics").insert({
      user_id: user.id,
      action_type: "upload_dataset",
      metadata: {
        dataset_id: datasetId,
        name: filename,
        row_count: cleanResult.row_count,
        column_count: cleanResult.column_count,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dataset uploaded, cleaned, and processed successfully",
        data: {
          dataset_id: datasetId,
          name: filename,
          row_count: cleanResult.row_count,
          column_count: cleanResult.column_count,
          headers: cleanResult.headers,
          summary_statistics: cleanResult.summary_statistics,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error occurred.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
