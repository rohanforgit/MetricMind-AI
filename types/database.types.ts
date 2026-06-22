export interface UserProfile {
  id: string; // UUID references auth.users
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface SummaryStatistics {
  row_count: number;
  column_count: number;
  numeric_metrics: Record<
    string,
    {
      total: number;
      avg: number;
      min: number;
      max: number;
    }
  >;
  categorical_distributions: Record<string, Record<string, number>>;
  top_category?: {
    column: string;
    name: string;
    value: number;
  };
  bottom_category?: {
    column: string;
    name: string;
    value: number;
  };
  growth_rate_pct?: number;
  trend_data?: { label: string; value: number }[];
  regional_distribution?: Record<string, number>;
  budget_summary?: {
    is_budget: boolean;
    amount_column: string;
    category_column: string | null;
    type_column?: string | null;
    total_income: number;
    total_expenses: number;
    net_savings: number;
    income_categories: string[];
    expense_categories: string[];
    income_by_category: Record<string, number>;
    expense_by_category: Record<string, number>;
    transaction_counts: {
      income: number;
      expense: number;
      unclassified: number;
    };
    unclassified_total?: number;
  };
}

export interface Dataset {
  id: string; // UUID primary key
  user_id: string; // UUID references users.id
  name: string;
  file_path: string;
  file_size: number;
  row_count: number;
  column_count: number;
  headers: string[];
  summary_statistics: SummaryStatistics;
  created_at: string;
  updated_at: string;
}

export interface DatasetRow {
  id: string; // Bigserial primary key (represented as string in JS/TS for safety)
  dataset_id: string; // UUID references datasets.id
  row_index: number;
  row_data: Record<string, any>;
  created_at: string;
}

export interface AIInsightsContent {
  business_insights: string;
  key_observations: string[];
  warnings: string[];
  recommendations: string[];
}

export interface GeneratedInsight {
  id: string; // UUID primary key
  dataset_id: string; // UUID references datasets.id
  user_id: string; // UUID references users.id
  insights_content: AIInsightsContent;
  created_at: string;
}

export interface AnalyticsLog {
  id: string; // UUID primary key
  user_id: string; // UUID references users.id
  action_type: string; // e.g. "upload_dataset", "generate_insights", "view_dataset"
  metadata: Record<string, any>;
  created_at: string;
}
