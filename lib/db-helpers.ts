import { createServerSideClient } from "./supabase-server";
import { Dataset, DatasetRow, GeneratedInsight, AnalyticsLog, AIInsightsContent } from "@/types/database.types";

/**
 * Fetches all datasets owned by a specific user.
 */
export async function getDatasets(userId: string): Promise<Dataset[]> {
  const supabase = await createServerSideClient();
  
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to retrieve datasets: ${error.message}`);
  }

  return (data || []) as Dataset[];
}

/**
 * Fetches details of a specific dataset, ensuring it belongs to the active user.
 */
export async function getDatasetById(datasetId: string, userId: string): Promise<Dataset | null> {
  const supabase = await createServerSideClient();

  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Record not found
    throw new Error(`Failed to retrieve dataset: ${error.message}`);
  }

  return data as Dataset;
}

/**
 * Fetches rows for a specific dataset. Optional limit parameters can be supplied for sampling.
 */
export async function getDatasetRows(datasetId: string, limit = 100): Promise<DatasetRow[]> {
  const supabase = await createServerSideClient();

  const { data, error } = await supabase
    .from("dataset_rows")
    .select("*")
    .eq("dataset_id", datasetId)
    .order("row_index", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to retrieve dataset rows: ${error.message}`);
  }

  return (data || []) as DatasetRow[];
}

/**
 * Deletes a dataset. Row Level Security and CASCADE rules will drop rows and insights as well.
 */
export async function deleteDataset(datasetId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSideClient();

  const { error } = await supabase
    .from("datasets")
    .delete()
    .eq("id", datasetId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete dataset: ${error.message}`);
  }

  return true;
}

/**
 * Updates the name of an existing dataset.
 */
export async function renameDataset(datasetId: string, name: string, userId: string): Promise<Dataset> {
  const supabase = await createServerSideClient();

  const { data, error } = await supabase
    .from("datasets")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", datasetId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to rename dataset: ${error.message}`);
  }

  return data as Dataset;
}

/**
 * Checks for cached insights on a dataset.
 */
export async function getCachedInsights(datasetId: string, userId: string): Promise<GeneratedInsight | null> {
  const supabase = await createServerSideClient();

  const { data, error } = await supabase
    .from("generated_insights")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to retrieve cached insights: ${error.message}`);
  }

  return data as GeneratedInsight | null;
}

/**
 * Caches newly generated AI insights.
 */
export async function saveInsights(
  datasetId: string,
  userId: string,
  content: AIInsightsContent
): Promise<GeneratedInsight> {
  const supabase = await createServerSideClient();

  const { data, error } = await supabase
    .from("generated_insights")
    .insert({
      dataset_id: datasetId,
      user_id: userId,
      insights_content: content,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save generated insights: ${error.message}`);
  }

  return data as GeneratedInsight;
}

/**
 * Append audit/platform usage analytics.
 */
export async function createAnalyticsLog(
  userId: string,
  actionType: string,
  metadata: Record<string, any> = {}
): Promise<AnalyticsLog> {
  const supabase = await createServerSideClient();

  const { data, error } = await supabase
    .from("analytics")
    .insert({
      user_id: userId,
      action_type: actionType,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log analytics: ${error.message}`);
  }

  return data as AnalyticsLog;
}
