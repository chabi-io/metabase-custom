import type {
  DateRangeSelection,
  FiscalCalendarData,
  FiscalCalendarRow,
  FiscalPeriod,
  FiscalWeek,
  FiscalYear,
  ViewMode,
} from "./types";

// ===== FISCAL CALENDAR PARSING =====

/**
 * Parse raw database rows into domain model
 * Takes simple period-level data and generates weeks dynamically
 */
export function parseFiscalCalendarRows(
  rows: FiscalCalendarRow[],
): FiscalCalendarData {
  const years = new Map<number, FiscalYear>();
  const dateToWeek = new Map<string, FiscalWeek>();

  // Group rows by fiscal year
  const rowsByYear = new Map<number, FiscalCalendarRow[]>();
  rows.forEach((row) => {
    if (!rowsByYear.has(row.YEAR)) {
      rowsByYear.set(row.YEAR, []);
    }
    rowsByYear.get(row.YEAR)!.push(row);
  });

  // Build fiscal year objects
  rowsByYear.forEach((yearRows, fiscalYear) => {
    // Sort periods by period number
    const sortedRows = yearRows.sort((a, b) => a.PERIOD - b.PERIOD);

    const periods = buildPeriodsForYear(sortedRows, fiscalYear);
    const weeks = buildWeeksForYear(sortedRows, fiscalYear, periods);

    // Build date lookup
    weeks.forEach((week) => {
      week.days.forEach((day) => {
        dateToWeek.set(formatISODate(day), week);
      });
    });

    // Calculate fiscal year start/end from first and last periods
    const fyStart = parseDate(sortedRows[0].START_DATE);
    const fyEnd = parseDate(sortedRows[sortedRows.length - 1].END_DATE);

    years.set(fiscalYear, {
      year: fiscalYear,
      startDate: fyStart,
      endDate: fyEnd,
      periods,
      weeks,
    });
  });

  const yearNumbers = Array.from(years.keys()).sort();

  return {
    years,
    dateToWeek,
    minYear: yearNumbers[0],
    maxYear: yearNumbers[yearNumbers.length - 1],
  };
}

/**
 * Build periods from simple period rows
 */
function buildPeriodsForYear(
  rows: FiscalCalendarRow[],
  fiscalYear: number,
): FiscalPeriod[] {
  return rows.map((row) => {
    const startDate = parseDate(row.START_DATE);
    const endDate = parseDate(row.END_DATE);
    const daysInPeriod =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    return {
      id: row.PERIOD,
      name: `P${String(row.PERIOD).padStart(2, "0")}`,
      fiscalYear,
      quarter: row.QUARTER,
      startDate,
      endDate,
      daysInPeriod,
      startWeek: 0, // Will be calculated after weeks are generated
      endWeek: 0, // Will be calculated after weeks are generated
    };
  });
}

/**
 * Build weeks from period boundaries
 * Week start day is determined by the first period's START_DATE
 */
function buildWeeksForYear(
  rows: FiscalCalendarRow[],
  fiscalYear: number,
  periods: FiscalPeriod[],
): FiscalWeek[] {
  const weeks: FiscalWeek[] = [];
  let fiscalWeekNum = 1;

  // Determine week start day from first period (e.g., Monday=1, Tuesday=2, etc.)
  const firstPeriodStart = parseDate(rows[0].START_DATE);
  const weekStartDay = firstPeriodStart.getDay();

  rows.forEach((row, periodIndex) => {
    const periodStart = parseDate(row.START_DATE);
    const periodEnd = parseDate(row.END_DATE);
    const period = periods[periodIndex];

    // Find the week-start day on or before the period start
    let weekStart = getWeekStart(periodStart, weekStartDay);

    // Track first and last week numbers for this period
    const periodFirstWeek = fiscalWeekNum;
    let weekInPeriod = 1;

    // Generate weeks until we pass the period end
    while (weekStart <= periodEnd) {
      // Generate 7 days for this week
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        days.push(day);
      }

      const weekEnd = days[6];

      weeks.push({
        weekNum: fiscalWeekNum,
        periodNum: row.PERIOD,
        periodName: `P${String(row.PERIOD).padStart(2, "0")}`,
        quarter: row.QUARTER,
        fiscalYear,
        label: `P${String(row.PERIOD).padStart(2, "0")}-W${String(weekInPeriod).padStart(2, "0")}`,
        weekInPeriod,
        startDate: new Date(weekStart),
        endDate: weekEnd,
        days,
      });

      // Move to next week
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
      fiscalWeekNum++;
      weekInPeriod++;
    }

    // Update period with week numbers
    period.startWeek = periodFirstWeek;
    period.endWeek = fiscalWeekNum - 1;
  });

  return weeks;
}

/**
 * Get the week-start day on or before the given date
 * @param date - The date to find the week start for
 * @param weekStartDay - Day of week (0=Sunday, 1=Monday, 2=Tuesday, etc.)
 */
function getWeekStart(date: Date, weekStartDay: number): Date {
  const d = new Date(date);
  const currentDay = d.getDay();

  // Calculate days to go back to reach the week start day
  let diff = currentDay - weekStartDay;
  if (diff < 0) {
    diff += 7;
  }

  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== VIEW & FILTERING =====

/**
 * Get periods for a specific quarter
 */
export function getPeriodsForQuarter(
  periods: FiscalPeriod[],
  quarter: number,
): FiscalPeriod[] {
  return periods.filter((p) => p.quarter === quarter);
}

/**
 * Get weeks for view mode
 */
export function getWeeksForView(
  weeks: FiscalWeek[],
  viewMode: ViewMode,
): FiscalWeek[] {
  if (viewMode === "Year") {
    return weeks;
  }

  const quarterNum = parseInt(viewMode.substring(1));
  return weeks.filter((w) => w.quarter === quarterNum);
}

/**
 * Get calendar months to display for given weeks
 */
export function getMonthsInView(weeks: FiscalWeek[]): Array<{
  month: number;
  year: number;
  periodNames: string[];
}> {
  if (weeks.length === 0) {
    return [];
  }

  // Use middle day of week to determine month
  const monthSet = new Set<string>();
  const monthPeriods = new Map<string, Set<string>>();

  weeks.forEach((week) => {
    const middleDay = week.days[Math.floor(week.days.length / 2)]; // Middle day of week
    const month = middleDay.getMonth();
    const year = middleDay.getFullYear();
    const key = `${year}-${month}`;

    monthSet.add(key);

    if (!monthPeriods.has(key)) {
      monthPeriods.set(key, new Set());
    }
    monthPeriods.get(key)!.add(week.periodName);
  });

  return Array.from(monthSet)
    .sort((a, b) => {
      // Parse year-month keys and sort chronologically
      const [yearA, monthA] = a.split("-").map(Number);
      const [yearB, monthB] = b.split("-").map(Number);
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return monthA - monthB;
    })
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return {
        month,
        year,
        periodNames: Array.from(monthPeriods.get(key)!).sort(),
      };
    });
}

// ===== SELECTION HELPERS =====

/**
 * Check if date is in selection
 */
export function isDateInSelection(
  date: Date,
  selection: DateRangeSelection | null,
  dragStart: Date | null,
  dragCurrent: Date | null,
): boolean {
  const dateOnly = stripTime(date);

  // Check drag preview
  if (dragStart && dragCurrent) {
    const start = stripTime(dragStart < dragCurrent ? dragStart : dragCurrent);
    const end = stripTime(dragStart < dragCurrent ? dragCurrent : dragStart);
    if (dateOnly >= start && dateOnly <= end) {
      return true;
    }
  }

  // Check selection
  if (selection) {
    const selStart = stripTime(selection.startDate);
    const selEnd = stripTime(selection.endDate);
    return dateOnly >= selStart && dateOnly <= selEnd;
  }

  return false;
}

/**
 * Format selection as human-readable string
 */
export function formatSelectionLabel(selection: DateRangeSelection): string {
  const start = formatDate(selection.startDate);
  const end = formatDate(selection.endDate);
  const days =
    Math.ceil(
      (selection.endDate.getTime() - selection.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  let details = `${start} - ${end}`;

  if (selection.meta) {
    const { periodIds, weekNum, weekRange, quickType } = selection.meta;

    if (periodIds && periodIds.length > 0) {
      const periodNames = periodIds
        .map((id) => `P${String(id).padStart(2, "0")}`)
        .join(", ");
      details += ` • ${periodNames}`;
    }

    if (weekNum) {
      details += ` • Week ${weekNum}`;
    }

    if (weekRange) {
      details += ` • Weeks ${weekRange[0]}-${weekRange[1]}`;
    }

    if (quickType) {
      details += ` • ${formatQuickType(quickType)}`;
    }
  }

  details += ` • ${days} days`;

  return details;
}

/**
 * Get current fiscal week/period
 */
export function getCurrentFiscalContext(
  fiscalData: FiscalCalendarData,
  today: Date = new Date(),
): { week: FiscalWeek | null; period: FiscalPeriod | null } {
  const todayKey = formatISODate(today);
  const week = fiscalData.dateToWeek.get(todayKey) ?? null;

  if (!week) {
    return { week: null, period: null };
  }

  const year = fiscalData.years.get(week.fiscalYear);
  const period = year?.periods.find((p) => p.id === week.periodNum) ?? null;

  return { week, period };
}

/**
 * Determine current fiscal year from data based on today's date
 */
export function getCurrentFiscalYear(
  fiscalData: FiscalCalendarData,
  today: Date = new Date(),
): number {
  // Try to find fiscal year containing today
  const todayKey = formatISODate(today);
  const week = fiscalData.dateToWeek.get(todayKey);

  if (week) {
    return week.fiscalYear;
  }

  // Fallback: find fiscal year where today falls between FY_START and FY_END
  for (const [year, yearData] of fiscalData.years.entries()) {
    if (today >= yearData.startDate && today <= yearData.endDate) {
      return year;
    }
  }

  // Last resort: return the middle year of available data
  const years = Array.from(fiscalData.years.keys()).sort();
  return years[Math.floor(years.length / 2)] ?? today.getFullYear();
}

// ===== HELPER FUNCTIONS =====

function parseDate(isoString: string): Date {
  // Parse date components to avoid timezone issues
  // Using new Date(isoString) interprets as UTC, which can shift to previous day
  // Handle both "2025-01-01" and "2025-01-01T00:00:00" formats
  const dateOnly = isoString.split("T")[0];
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatQuickType(type: string): string {
  const labels: Record<string, string> = {
    thisWeek: "This Week",
    lastWeek: "Last Week",
    thisPeriod: "This Period",
    lastPeriod: "Last Period",
    thisQuarter: "This Quarter",
    ytd: "Year to Date",
  };
  return labels[type] || type;
}
