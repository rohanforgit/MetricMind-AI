import Papa from "papaparse";

export interface CleanedRow {
  row_index: number;
  row_data: Record<string, any>;
}

export interface SummaryStatistics {
  row_count: number;
  column_count: number;
  numeric_metrics: Record<string, {
    total: number;
    avg: number;
    min: number;
    max: number;
  }>;
  categorical_distributions: Record<string, Record<string, number>>;
  top_category?: { column: string; name: string; value: number };
  bottom_category?: { column: string; name: string; value: number };
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

export interface CleanResult {
  success: boolean;
  error?: string;
  code?: string;
  name: string;
  headers: string[];
  row_count: number;
  column_count: number;
  cleaned_rows: CleanedRow[];
  summary_statistics: SummaryStatistics;
}

export function sanitizeHeaders(rawHeaders: string[]): string[] {
  if (!rawHeaders || rawHeaders.length === 0) return [];

  const seen: Record<string, number> = {};
  return rawHeaders.map((h, index) => {
    let clean = (h || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/gi, "")
      .replace(/[\s-]+/g, "_");

    if (!clean) {
      clean = `column_${index + 1}`;
    }

    if (seen[clean] !== undefined) {
      seen[clean]++;
      clean = `${clean}_${seen[clean]}`;
    } else {
      seen[clean] = 0;
    }

    return clean;
  });
}

export function coerceDate(value: any): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }
  return str;
}

export function coerceNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const str = String(value)
    .trim()
    .replace(/[\$,\s]/g, "");

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

type BudgetDirection = "income" | "expense" | "unclassified";

const roundMoney = (value: number): number => parseFloat(value.toFixed(2));

const normalizeText = (value: any): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchesAny = (text: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(text));

const incomeTypePatterns = [
  /\bincome\b/,
  /\binflow\b/,
  /\bcredit\b/,
  /\bdeposit\b/,
  /\breceived\b/,
  /\breceipt\b/,
  /\bearning(s)?\b/,
  /\bsalary\b/,
  /\bwage(s)?\b/,
  /\bpaycheck\b/,
  /\bpaycheque\b/,
  /\bfreelance\b/,
  /\bbonus\b/,
  /\brefund\b/,
  /\breimbursement\b/,
  /\binterest\b/,
  /\bdividend\b/,
];

const expenseTypePatterns = [
  /\bexpense(s)?\b/,
  /\boutflow\b/,
  /\bdebit\b/,
  /\bwithdraw(al)?\b/,
  /\bpayment\b/,
  /\bpaid\b/,
  /\bspend\b/,
  /\bspent\b/,
  /\bpurchase\b/,
  /\bbill\b/,
  /\bcharge\b/,
  /\bfee\b/,
];

const incomeTextPatterns = [
  /\bincome\b/,
  /\bsalary\b/,
  /\bwage(s)?\b/,
  /\bpaycheck\b/,
  /\bpaycheque\b/,
  /\bfreelance\b/,
  /\bbonus\b/,
  /\brefund\b/,
  /\breimbursement\b/,
  /\binterest\b/,
  /\bdividend\b/,
  /\bdeposit\b/,
  /\bearning(s)?\b/,
  /\brental income\b/,
  /\ballowance\b/,
];

const expenseTextPatterns = [
  /\bexpense(s)?\b/,
  /\brent\b/,
  /\bgrocery|groceries\b/,
  /\bfood\b/,
  /\bdining\b/,
  /\brestaurant\b/,
  /\butility|utilities\b/,
  /\belectricity\b/,
  /\bwater\b/,
  /\binternet\b/,
  /\bphone\b/,
  /\btransport\b/,
  /\btravel\b/,
  /\bfuel\b/,
  /\bgas\b/,
  /\bshopping\b/,
  /\bsubscription\b/,
  /\binsurance\b/,
  /\bmedical\b/,
  /\bmedicine\b/,
  /\bhealth\b/,
  /\bloan\b/,
  /\bemi\b/,
  /\bmortgage\b/,
  /\btax\b/,
  /\bfee\b/,
  /\beducation\b/,
  /\bschool\b/,
  /\bentertainment\b/,
  /\bmaintenance\b/,
];

const budgetSignalPatterns = [
  /\bbudget\b/,
  /\bexpense(s)?\b/,
  /\bincome\b/,
  /\bspend(ing)?\b/,
  /\btransaction(s)?\b/,
  /\bwallet\b/,
  /\bcash ?flow\b/,
  /\bdebit\b/,
  /\bcredit\b/,
];

function isDateColumnName(col: string): boolean {
  return /date|time|timestamp|created_at/i.test(col);
}

function isLikelyIdColumn(col: string): boolean {
  return /(^|_)id(_|$)|uuid|identifier|row_index/i.test(col);
}

function isGenericAmountColumn(col: string): boolean {
  return /(^|_)(amount|amt|value|money|cash|payment|paid|spent|cost|price|total)(_|$)/i.test(col) &&
    !/(rate|percent|percentage|qty|quantity|count|number)/i.test(col) &&
    !isLikelyIdColumn(col);
}

function isIncomeAmountColumn(col: string): boolean {
  return /(^|_)(income|credit|deposit|received|earning|earnings|salary|wage|wages|revenue)(_|$)/i.test(col) &&
    !isLikelyIdColumn(col);
}

function isExpenseAmountColumn(col: string): boolean {
  return /(^|_)(expense|expenses|debit|withdrawal|paid|spent|spend|cost)(_|$)/i.test(col) &&
    !isLikelyIdColumn(col);
}

function addCategoryAmount(target: Record<string, number>, category: string, amount: number) {
  target[category] = roundMoney((target[category] || 0) + amount);
}

function sortedCategoryNames(categoryTotals: Record<string, number>): string[] {
  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function getTypeColumn(headers: string[], distributions: Record<string, Record<string, number>>): string | null {
  const candidates = headers.filter((header) =>
    /(^|_)(type|kind|direction|flow|transaction_type|credit_debit|debit_credit|dr_cr)(_|$)/i.test(header)
  );

  return candidates.find((header) => {
    const values = Object.keys(distributions[header] || {}).map(normalizeText);
    return values.some((value) =>
      matchesAny(value, incomeTypePatterns) || matchesAny(value, expenseTypePatterns)
    );
  }) || candidates[0] || null;
}

function getCategoryColumn(headers: string[], typeColumn: string | null): string | null {
  const explicitCategory = headers.find((header) =>
    header !== typeColumn &&
    !isDateColumnName(header) &&
    !isLikelyIdColumn(header) &&
    /category|subcategory|classification|class|group|bucket|account|head/i.test(header)
  );

  if (explicitCategory) return explicitCategory;

  return headers.find((header) =>
    header !== typeColumn &&
    !isDateColumnName(header) &&
    !isLikelyIdColumn(header) &&
    /merchant|vendor|description|details|memo|note|item|name|source|remarks|particular/i.test(header)
  ) || null;
}

function getDescriptionColumns(headers: string[], categoryColumn: string | null, typeColumn: string | null): string[] {
  return headers.filter((header) =>
    header !== categoryColumn &&
    header !== typeColumn &&
    !isDateColumnName(header) &&
    !isLikelyIdColumn(header) &&
    /description|desc|details|memo|note|merchant|vendor|item|name|source|remarks|particular|narration/i.test(header)
  );
}

function classifyBudgetRow(
  rowData: Record<string, any>,
  amount: number,
  typeColumn: string | null,
  categoryColumn: string | null,
  descriptionColumns: string[],
  defaultDirection: BudgetDirection
): BudgetDirection {
  let incomeScore = 0;
  let expenseScore = 0;

  if (typeColumn) {
    const typeText = normalizeText(rowData[typeColumn]);
    if (matchesAny(typeText, incomeTypePatterns)) incomeScore += 5;
    if (matchesAny(typeText, expenseTypePatterns)) expenseScore += 5;
  }

  if (categoryColumn) {
    const categoryText = normalizeText(rowData[categoryColumn]);
    if (matchesAny(categoryText, incomeTextPatterns)) incomeScore += 3;
    if (matchesAny(categoryText, expenseTextPatterns)) expenseScore += 3;
  }

  descriptionColumns.forEach((column) => {
    const text = normalizeText(rowData[column]);
    if (matchesAny(text, incomeTextPatterns)) incomeScore += 2;
    if (matchesAny(text, expenseTextPatterns)) expenseScore += 2;
  });

  if (amount < 0) {
    expenseScore += 4;
  }

  if (incomeScore > expenseScore) return "income";
  if (expenseScore > incomeScore) return "expense";
  return defaultDirection;
}

function buildBudgetSummary(
  filename: string,
  headers: string[],
  cleanedRows: CleanedRow[],
  numericMetrics: Record<string, number[]>,
  distributions: Record<string, Record<string, number>>
): SummaryStatistics["budget_summary"] | undefined {
  const numericColumns = Object.keys(numericMetrics).filter((col) => !isLikelyIdColumn(col));
  if (numericColumns.length === 0) return undefined;

  const signalText = normalizeText(`${filename} ${headers.join(" ")}`);
  const hasBudgetSignal = matchesAny(signalText, budgetSignalPatterns);

  const incomeAmountColumn = numericColumns.find(isIncomeAmountColumn) || null;
  const expenseAmountColumn = numericColumns.find(isExpenseAmountColumn) || null;
  const genericAmountColumn =
    numericColumns.find((col) => isGenericAmountColumn(col) && col !== incomeAmountColumn && col !== expenseAmountColumn) ||
    numericColumns[0] ||
    null;

  const typeColumn = getTypeColumn(headers, distributions);
  const categoryColumn = getCategoryColumn(headers, typeColumn);
  const descriptionColumns = getDescriptionColumns(headers, categoryColumn, typeColumn);

  const explicitTypeHits = typeColumn
    ? Object.keys(distributions[typeColumn] || {}).filter((value) => {
        const normalized = normalizeText(value);
        return matchesAny(normalized, incomeTypePatterns) || matchesAny(normalized, expenseTypePatterns);
      }).length
    : 0;

  const hasSeparateIncomeExpenseColumns =
    Boolean(incomeAmountColumn || expenseAmountColumn) &&
    incomeAmountColumn !== expenseAmountColumn;

  if (!hasBudgetSignal && !hasSeparateIncomeExpenseColumns && explicitTypeHits === 0) {
    return undefined;
  }

  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;
  let unclassifiedTotal = 0;
  const transactionCounts = {
    income: 0,
    expense: 0,
    unclassified: 0,
  };

  const hasExpenseSignal = /\bbudget\b|\bexpense(s)?\b|\bspend(ing)?\b|\bdebit\b|\btransaction(s)?\b|\bwallet\b/.test(signalText);
  const hasIncomeOnlySignal = /\bincome\b|\bsalary\b|\brevenue\b|\bcredit\b/.test(signalText) && !hasExpenseSignal;
  const defaultDirection: BudgetDirection = hasExpenseSignal ? "expense" : hasIncomeOnlySignal ? "income" : "unclassified";

  const getCategory = (rowData: Record<string, any>, fallback: string): string => {
    const rawCategory = categoryColumn ? rowData[categoryColumn] : null;
    const category = normalizeText(rawCategory) ? String(rawCategory).trim() : fallback;
    return category || fallback;
  };

  const addDirectedAmount = (direction: BudgetDirection, rawAmount: number, category: string) => {
    if (!rawAmount) return;

    const amount = Math.abs(rawAmount);
    if (direction === "income") {
      totalIncome += amount;
      transactionCounts.income++;
      addCategoryAmount(incomeByCategory, category, amount);
      return;
    }

    if (direction === "expense") {
      totalExpenses += amount;
      transactionCounts.expense++;
      addCategoryAmount(expenseByCategory, category, amount);
      return;
    }

    unclassifiedTotal += amount;
    transactionCounts.unclassified++;
  };

  cleanedRows.forEach(({ row_data }) => {
    if (hasSeparateIncomeExpenseColumns) {
      if (incomeAmountColumn) {
        const incomeAmount = coerceNumber(row_data[incomeAmountColumn]);
        if (incomeAmount !== null && incomeAmount !== 0) {
          addDirectedAmount("income", incomeAmount, getCategory(row_data, "Uncategorized Income"));
        }
      }

      if (expenseAmountColumn) {
        const expenseAmount = coerceNumber(row_data[expenseAmountColumn]);
        if (expenseAmount !== null && expenseAmount !== 0) {
          addDirectedAmount("expense", expenseAmount, getCategory(row_data, "Uncategorized Expense"));
        }
      }

      return;
    }

    if (!genericAmountColumn) return;

    const amount = coerceNumber(row_data[genericAmountColumn]);
    if (amount === null || amount === 0) return;

    const direction = classifyBudgetRow(
      row_data,
      amount,
      typeColumn,
      categoryColumn,
      descriptionColumns,
      defaultDirection
    );

    addDirectedAmount(
      direction,
      amount,
      getCategory(row_data, direction === "income" ? "Uncategorized Income" : "Uncategorized Expense")
    );
  });

  totalIncome = roundMoney(totalIncome);
  totalExpenses = roundMoney(totalExpenses);
  unclassifiedTotal = roundMoney(unclassifiedTotal);

  if (totalIncome === 0 && totalExpenses === 0 && unclassifiedTotal === 0) {
    return undefined;
  }

  return {
    is_budget: true,
    amount_column: hasSeparateIncomeExpenseColumns
      ? [incomeAmountColumn, expenseAmountColumn].filter(Boolean).join(" / ")
      : genericAmountColumn || "",
    category_column: categoryColumn,
    type_column: typeColumn,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_savings: roundMoney(totalIncome - totalExpenses),
    income_categories: sortedCategoryNames(incomeByCategory),
    expense_categories: sortedCategoryNames(expenseByCategory),
    income_by_category: incomeByCategory,
    expense_by_category: expenseByCategory,
    transaction_counts: transactionCounts,
    unclassified_total: unclassifiedTotal || undefined,
  };
}

export function cleanAndProcessCSV(csvText: string, filename: string): CleanResult {
  if (!csvText || !csvText.trim()) {
    return {
      success: false,
      error: "The uploaded file contains no rows. Please verify your dataset and try again.",
      code: "EMPTY_CSV",
      name: filename,
      headers: [],
      row_count: 0,
      column_count: 0,
      cleaned_rows: [],
      summary_statistics: { row_count: 0, column_count: 0, numeric_metrics: {}, categorical_distributions: {} },
    };
  }

  const parseResult = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: true,
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return {
      success: false,
      error: "Could not parse CSV. " + parseResult.errors[0].message,
      code: "PARSING_FAILED",
      name: filename,
      headers: [],
      row_count: 0,
      column_count: 0,
      cleaned_rows: [],
      summary_statistics: { row_count: 0, column_count: 0, numeric_metrics: {}, categorical_distributions: {} },
    };
  }

  let rawHeaders = parseResult.meta.fields || [];
  let warningMessage = "";

  if (rawHeaders.length === 0) {
    const firstRow = parseResult.data[0];
    if (firstRow) {
      const keys = Object.keys(firstRow);
      rawHeaders = keys.map((_, i) => `column_${i + 1}`);
      warningMessage = "Headers were missing. We named them generic columns so you can still visualize the data.";
    } else {
      return {
        success: false,
        error: "The uploaded file contains no headers or rows.",
        code: "NO_HEADERS",
        name: filename,
        headers: [],
        row_count: 0,
        column_count: 0,
        cleaned_rows: [],
        summary_statistics: { row_count: 0, column_count: 0, numeric_metrics: {}, categorical_distributions: {} },
      };
    }
  }

  const cleanHeaders = sanitizeHeaders(rawHeaders);
  const columnCount = cleanHeaders.length;

  const headerMap: Record<string, string> = {};
  rawHeaders.forEach((raw, i) => {
    headerMap[raw] = cleanHeaders[i];
  });

  const cleanedRows: CleanedRow[] = [];
  const numericMetrics: Record<string, number[]> = {};
  const categoricalValues: Record<string, string[]> = {};

  const isDateColumn = (col: string) => /date|time|timestamp|created_at/i.test(col);
  const isRevenueOrSalesColumn = (col: string) => /revenue|sales|amount|price|total/i.test(col);

  parseResult.data.forEach((row, index) => {
    const rowData: Record<string, any> = {};

    cleanHeaders.forEach((header) => {
      rowData[header] = null;
    });

    Object.entries(row).forEach(([rawKey, val]) => {
      const cleanKey = headerMap[rawKey];
      if (!cleanKey) return;

      if (isDateColumn(cleanKey)) {
        rowData[cleanKey] = coerceDate(val);
      } else {
        const numVal = coerceNumber(val);
        if (numVal !== null) {
          rowData[cleanKey] = numVal;
        } else {
          rowData[cleanKey] = val === null || val === undefined ? "" : String(val).trim();
        }
      }
    });

    cleanHeaders.forEach((header) => {
      if (rowData[header] === undefined) {
        rowData[header] = null;
      }
    });

    // Excel Injection Prevention (prevent formula characters like =, +, -, @, or control characters prefixing them)
    cleanHeaders.forEach((header) => {
      const val = rowData[header];
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (/^[=+\-@\t\r\n]/.test(trimmed) || /^[=+\-@]/.test(val)) {
          rowData[header] = "'" + val; // escape by prefixing single quote
        }
      }
    });

    cleanedRows.push({
      row_index: index + 1,
      row_data: rowData,
    });

    cleanHeaders.forEach((header) => {
      const val = rowData[header];
      if (typeof val === "number") {
        if (!numericMetrics[header]) numericMetrics[header] = [];
        numericMetrics[header].push(val);
      } else if (val !== null && val !== "") {
        if (!categoricalValues[header]) categoricalValues[header] = [];
        categoricalValues[header].push(String(val));
      }
    });
  });

  const calculatedMetrics: Record<string, { total: number; avg: number; min: number; max: number }> = {};
  Object.entries(numericMetrics).forEach(([colName, vals]) => {
    if (vals.length === 0) return;
    const total = vals.reduce((sum, v) => sum + v, 0);
    const avg = total / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    calculatedMetrics[colName] = {
      total: parseFloat(total.toFixed(2)),
      avg: parseFloat(avg.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
    };
  });

  const distributions: Record<string, Record<string, number>> = {};
  Object.entries(categoricalValues).forEach(([colName, vals]) => {
    const counts: Record<string, number> = {};
    vals.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
    distributions[colName] = counts;
  });

  let topCategory: any = undefined;
  let bottomCategory: any = undefined;

  Object.entries(distributions).forEach(([colName, counts]) => {
    if (isDateColumn(colName) || colName.includes("id")) return;

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];

      if (!topCategory || top[1] > topCategory.value) {
        topCategory = { column: colName, name: top[0], value: top[1] };
      }
      if (!bottomCategory || bottom[1] < bottomCategory.value) {
        bottomCategory = { column: colName, name: bottom[0], value: bottom[1] };
      }
    }
  });

  let trendData: { label: string; value: number }[] = [];
  let growthRatePct: number | undefined = undefined;

  const dateCol = cleanHeaders.find(isDateColumn);
  const numericCol = cleanHeaders.find(isRevenueOrSalesColumn) || Object.keys(calculatedMetrics)[0];
  const regionCol = cleanHeaders.find((col) => /region|country|state|city/i.test(col));

  let regionalDistribution: Record<string, number> | undefined = undefined;
  if (regionCol) {
    const regionAggregates: Record<string, number> = {};
    cleanedRows.forEach((row) => {
      const regionRawVal = row.row_data[regionCol];
      const regionVal = (regionRawVal === null || regionRawVal === undefined || String(regionRawVal).trim() === "")
        ? "Unknown"
        : String(regionRawVal).trim();

      if (numericCol) {
        const numVal = coerceNumber(row.row_data[numericCol]);
        if (numVal !== null) {
          regionAggregates[regionVal] = (regionAggregates[regionVal] || 0) + numVal;
        } else {
          regionAggregates[regionVal] = regionAggregates[regionVal] || 0;
        }
      } else {
        regionAggregates[regionVal] = (regionAggregates[regionVal] || 0) + 1;
      }
    });

    regionalDistribution = {};
    for (const [key, val] of Object.entries(regionAggregates)) {
      regionalDistribution[key] = numericCol ? parseFloat(val.toFixed(2)) : val;
    }
  }

  if (dateCol && numericCol) {
    const dateAggregates: Record<string, number> = {};
    cleanedRows.forEach((row) => {
      const dateVal = row.row_data[dateCol];
      const numVal = coerceNumber(row.row_data[numericCol]);

      if (dateVal && numVal !== null) {
        dateAggregates[dateVal] = (dateAggregates[dateVal] || 0) + numVal;
      }
    });

    const sortedDates = Object.entries(dateAggregates).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    trendData = sortedDates.map(([date, val]) => ({
      label: date,
      value: parseFloat(val.toFixed(2)),
    }));

    if (trendData.length >= 2) {
      const mid = Math.max(1, Math.floor(trendData.length * 0.15));
      const firstPart = trendData.slice(0, mid);
      const lastPart = trendData.slice(-mid);

      const firstAvg = firstPart.reduce((sum, d) => sum + d.value, 0) / firstPart.length;
      const lastAvg = lastPart.reduce((sum, d) => sum + d.value, 0) / lastPart.length;

      if (firstAvg > 0) {
        growthRatePct = parseFloat((((lastAvg - firstAvg) / firstAvg) * 100).toFixed(1));
      }
    }
  }

  const budgetSummary = buildBudgetSummary(
    filename,
    cleanHeaders,
    cleanedRows,
    numericMetrics,
    distributions
  );

  const finalResult: CleanResult = {
    success: true,
    name: filename,
    headers: cleanHeaders,
    row_count: cleanedRows.length,
    column_count: columnCount,
    cleaned_rows: cleanedRows,
    summary_statistics: {
      row_count: cleanedRows.length,
      column_count: columnCount,
      numeric_metrics: calculatedMetrics,
      categorical_distributions: distributions,
      top_category: topCategory,
      bottom_category: bottomCategory,
      growth_rate_pct: growthRatePct,
      trend_data: trendData.slice(0, 100),
      regional_distribution: regionalDistribution,
      budget_summary: budgetSummary,
    },
  };

  if (warningMessage) {
    finalResult.error = warningMessage;
  }

  return finalResult;
}
