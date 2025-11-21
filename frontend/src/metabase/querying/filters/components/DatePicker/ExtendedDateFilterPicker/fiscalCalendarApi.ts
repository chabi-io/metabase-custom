import { CardApi } from "metabase/services";

import type { FiscalCalendarData, FiscalCalendarRow } from "./types";
import { parseFiscalCalendarRows } from "./utils";

export interface FetchFiscalCalendarOptions {
  cardId: number;
  startYear?: number;
  endYear?: number;
}

/**
 * Fetch fiscal calendar data from Snowflake via Metabase saved question
 *
 * Year parameters are optional - if omitted, all years are fetched.
 * This is recommended for most use cases as fiscal calendar data is small.
 */
export async function fetchFiscalCalendarData({
  cardId,
  startYear,
  endYear,
}: FetchFiscalCalendarOptions): Promise<FiscalCalendarData> {
  try {
    // Build parameters only if year filtering is requested
    const parameters =
      startYear !== undefined && endYear !== undefined
        ? [
            {
              type: "number/=",
              value: startYear,
              target: ["variable", ["template-tag", "start_year"]],
            },
            {
              type: "number/=",
              value: endYear,
              target: ["variable", ["template-tag", "end_year"]],
            },
          ]
        : [];

    // Execute the card (saved question) with parameters
    const result = await CardApi.query({
      cardId,
      parameters,
    });

    // Parse the result rows
    const rows = parseQueryResult(result);

    // Transform into domain model
    return parseFiscalCalendarRows(rows);
  } catch (error) {
    console.error("Failed to fetch fiscal calendar data:", error);
    throw new Error(
      `Unable to load fiscal calendar data. Please ensure card ${cardId} exists and is accessible.`,
    );
  }
}

/**
 * Parse Metabase query result into typed rows
 * Expects simple period-level data: YEAR, START_DATE, END_DATE, PERIOD, QUARTER
 */
function parseQueryResult(result: any): FiscalCalendarRow[] {
  const { data } = result;
  if (!data?.rows || !data?.cols) {
    throw new Error("Invalid query result format");
  }

  // Map column names to indices
  const colMap = new Map<string, number>();
  data.cols.forEach((col: any, idx: number) => {
    colMap.set(col.name.toUpperCase(), idx);
  });

  // Required columns (simple period-level schema)
  const requiredCols = ["YEAR", "START_DATE", "END_DATE", "PERIOD", "QUARTER"];

  const missingCols = requiredCols.filter((col) => !colMap.has(col));
  if (missingCols.length > 0) {
    throw new Error(
      `Missing required columns: ${missingCols.join(", ")}. Expected: YEAR, START_DATE, END_DATE, PERIOD, QUARTER`,
    );
  }

  // Transform rows into typed objects
  return data.rows.map((row: any[]) => {
    // Parse YEAR: remove comma if present and convert to number
    const yearStr = String(row[colMap.get("YEAR")!]);
    const year = parseInt(yearStr.replace(/,/g, ""), 10);

    // Parse PERIOD and QUARTER: convert to numbers
    const period = parseInt(String(row[colMap.get("PERIOD")!]), 10);
    const quarter = parseInt(String(row[colMap.get("QUARTER")!]), 10);

    return {
      YEAR: year,
      START_DATE: row[colMap.get("START_DATE")!],
      END_DATE: row[colMap.get("END_DATE")!],
      PERIOD: period,
      QUARTER: quarter,
    };
  });
}
