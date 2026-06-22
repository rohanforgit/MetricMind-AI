import { AIInsightsContent } from "@/types/database.types";

/**
 * Constructs the standard system fallback response when Gemini is offline or fails.
 */
export function getFallbackInsights(datasetName: string, summaryStats: any): AIInsightsContent {
  const numericKeys = summaryStats.numeric_metrics ? Object.keys(summaryStats.numeric_metrics) : [];
  
  const observations = [
    `Dataset contains ${summaryStats.row_count || 0} rows and ${summaryStats.column_count || 0} columns.`,
  ];

  if (summaryStats.budget_summary?.is_budget) {
    const budget = summaryStats.budget_summary;
    observations.push(
      `Budget summary: Total Income = ${budget.total_income.toLocaleString()}, Total Expenses = ${budget.total_expenses.toLocaleString()}, Net Savings = ${budget.net_savings.toLocaleString()}.`
    );
    if (budget.expense_categories?.length) {
      observations.push(
        `Expense categories detected: ${budget.expense_categories.join(", ")}.`
      );
    }
    if (budget.income_categories?.length) {
      observations.push(
        `Income categories detected: ${budget.income_categories.join(", ")}.`
      );
    }
  }

  if (numericKeys.length > 0) {
    // Add brief statistics observations for numeric columns
    numericKeys.forEach((key) => {
      const metric = summaryStats.numeric_metrics[key];
      observations.push(
        `Column "${key}" statistics: Total Sum = ${metric.total.toLocaleString()}, Average = ${metric.avg.toLocaleString()}, Min = ${metric.min.toLocaleString()}, Max = ${metric.max.toLocaleString()}.`
      );
    });
  }

  if (summaryStats.top_category) {
    observations.push(
      `Top category in column "${summaryStats.top_category.column}" is "${summaryStats.top_category.name}" with count of ${summaryStats.top_category.value}.`
    );
  }

  if (summaryStats.growth_rate_pct !== undefined) {
    observations.push(
      `Calculated timeline growth rate percentage: ${summaryStats.growth_rate_pct}%.`
    );
  }

  if (summaryStats.regional_distribution) {
    const regionMetrics = Object.entries(summaryStats.regional_distribution)
      .map(([region, val]) => `${region}: ${(val as any).toLocaleString()}`)
      .join(", ");
    observations.push(`Regional Distribution breakdown: ${regionMetrics}.`);
  }

  return {
    business_insights: `AI analysis is currently unavailable, but your charts and raw data statistics are fully computed below.`,
    key_observations: observations,
    warnings: [
      "Gemini AI Service is currently offline, or the GEMINI_API_KEY environment variable is not configured."
    ],
    recommendations: [
      "Check your network settings or configure your GEMINI_API_KEY within Vercel's project settings panel or local .env configuration.",
      "Review the visual charts under the Analytics Dashboard tab to inspect trends and categories manually."
    ]
  };
}

/**
 * Triggers the Google Gemini API to generate plain-English business insights.
 * Strict system limits verify that NO raw CSV rows are ever sent to the model.
 */
export async function generateAIInsights(
  datasetName: string,
  headers: string[],
  summaryStats: any
): Promise<AIInsightsContent> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is missing. Activating fallback insights.");
    return getFallbackInsights(datasetName, summaryStats);
  }

  // Sanitizing datasetName against prompt injection & capping length
  const safeDatasetName = datasetName
    .replace(/[\r\n]/g, "")
    .slice(0, 100);

  // Construct structured data payload (Zero Raw Data Transfer Policy compliance)
  const statisticsContext = {
    dataset_metadata: {
      name: safeDatasetName,
      row_count: summaryStats.row_count,
      column_count: summaryStats.column_count,
      headers: headers,
    },
    calculated_statistics: summaryStats.numeric_metrics || {},
    growth_trends: {
      growth_rate_pct: summaryStats.growth_rate_pct,
    },
    categorical_distribution: {
      top_category: summaryStats.top_category,
      bottom_category: summaryStats.bottom_category,
    },
    regional_distribution: summaryStats.regional_distribution || {},
    budget_summary: summaryStats.budget_summary || null,
  };

  const promptText = `
You are an expert business analyst for MetricMind AI. 
Analyze the provided JSON statistical summary of a dataset and generate plain-English business insights.

RULES:
1. You must ONLY describe and explain the data provided. Never invent numbers, trends, or predictions not mathematically present in the parameters.
2. If region A has higher metrics than region B, explain that difference. Do not invent marketing campaigns or other external reasons outside this data to explain it.
3. If budget_summary.is_budget is true, treat budget_summary.total_income, budget_summary.total_expenses, and budget_summary.net_savings as authoritative. Do not describe raw amount totals as expenses, because they may include income rows.
4. The response must be structured strictly in JSON.

Expected Output Format:
{
  "business_insights": "A cohesive 2-3 sentence summary of the trends.",
  "key_observations": ["Observation 1", "Observation 2"],
  "warnings": ["Warning 1 if data shows declines, high disparities, or anomalies. Else empty."],
  "recommendations": ["Recommendation 1 based on optimization of performance."]
}

Provided Dataset Statistics JSON:
${JSON.stringify(statisticsContext, null, 2)}
  `.trim();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Empty candidate response content returned from Gemini API.");
    }

    // Strip markdown code block wrappers if Gemini outputs them despite configuration
    let cleanedText = candidateText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    }

    const parsedResponse = JSON.parse(cleanedText);

    // Validate structure of parsed output
    const validated: AIInsightsContent = {
      business_insights: parsedResponse.business_insights || "No summary provided by AI.",
      key_observations: Array.isArray(parsedResponse.key_observations)
        ? parsedResponse.key_observations
        : [],
      warnings: Array.isArray(parsedResponse.warnings) ? parsedResponse.warnings : [],
      recommendations: Array.isArray(parsedResponse.recommendations)
        ? parsedResponse.recommendations
        : [],
    };

    return validated;
  } catch (err: any) {
    console.error("Gemini API call failed. Activating fallback insights:", err);
    return getFallbackInsights(datasetName, summaryStats);
  }
}
