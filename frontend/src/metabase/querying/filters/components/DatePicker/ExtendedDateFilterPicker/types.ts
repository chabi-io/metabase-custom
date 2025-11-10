import type { SpecificDatePickerValue } from "metabase/querying/filters/types";

// ===== DATABASE ROW TYPE =====
// Simple period-level data from database - weeks are generated on frontend
export interface FiscalCalendarRow {
  YEAR: number; // Fiscal year
  START_DATE: string; // Period start date (ISO or parseable date string)
  END_DATE: string; // Period end date (ISO or parseable date string)
  PERIOD: number; // Period number (can be any count, not fixed to 12 or 13)
  QUARTER: number; // Quarter number (1-4 typically)
}

// ===== DOMAIN TYPES =====
export interface FiscalPeriod {
  id: number; // Period number from database (variable count per year)
  name: string; // "P01", "P02", etc.
  fiscalYear: number;
  quarter: number; // Quarter number from database
  startDate: Date;
  endDate: Date;
  daysInPeriod: number; // Calculated: varies by period
  startWeek: number; // Fiscal week number (generated on frontend)
  endWeek: number; // Fiscal week number (generated on frontend)
}

export interface FiscalWeek {
  weekNum: number; // Fiscal week number (1-N, generated sequentially per year)
  periodNum: number; // Period number from database
  periodName: string; // "P01", "P02", etc.
  quarter: number; // Quarter number from database
  fiscalYear: number;
  label: string; // "P01-W01", "P01-W02", etc.
  weekInPeriod: number; // Week number within the period (1-N)
  startDate: Date; // Monday (week start)
  endDate: Date; // Sunday (week end)
  days: Date[]; // Array of 7 dates (Mon-Sun)
}

export interface FiscalYear {
  year: number;
  startDate: Date;
  endDate: Date;
  periods: FiscalPeriod[];
  weeks: FiscalWeek[];
}

export interface FiscalCalendarData {
  years: Map<number, FiscalYear>; // Keyed by fiscal year
  dateToWeek: Map<string, FiscalWeek>; // ISO date string → week lookup
  minYear: number;
  maxYear: number;
}

// ===== SELECTION TYPES =====
export type SelectionType =
  | "periods"
  | "week"
  | "weekRange"
  | "custom"
  | "quick";

export interface DateRangeSelection {
  type: SelectionType;
  startDate: Date;
  endDate: Date;
  label: string; // Human-readable description
  // Metadata for reconstruction
  meta?: {
    periodIds?: number[]; // For multi-period selection
    weekNum?: number; // For single week
    weekRange?: [number, number]; // For week range
    quickType?: QuickSelectType;
  };
}

export type QuickSelectType =
  | "thisWeek"
  | "lastWeek"
  | "thisPeriod"
  | "lastPeriod"
  | "thisQuarter"
  | "ytd"
  | "firstWeek"
  | "firstPeriod"
  | "fullYear";

// ===== DRAG STATE =====
export interface DragState {
  isDragging: boolean;
  startDate: Date | null;
  currentDate: Date | null;
}

// ===== VIEW MODE =====
export type ViewMode = "Q1" | "Q2" | "Q3" | "Q4" | "Year";

// ===== COMPONENT PROPS =====
export interface ExtendedDateFilterPickerProps {
  value?: SpecificDatePickerValue;
  onChange?: (value: SpecificDatePickerValue) => void; // Optional - for live updates without Apply button
  onApply?: (value: SpecificDatePickerValue | null) => void; // Recommended - called when user clicks Apply or Clear
  onBack?: () => void;
  readOnly?: boolean;
}
