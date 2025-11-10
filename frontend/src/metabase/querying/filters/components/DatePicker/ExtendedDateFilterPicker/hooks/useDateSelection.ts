import { useCallback, useState } from "react";

import type {
  DateRangeSelection,
  DragState,
  FiscalCalendarData,
  FiscalPeriod,
  FiscalWeek,
  QuickSelectType,
} from "../types";
import { getCurrentFiscalContext } from "../utils";

interface UseDateSelectionResult {
  selection: DateRangeSelection | null;
  dragState: DragState;
  selectPeriods: (periodIds: number[], periods: FiscalPeriod[]) => void;
  selectWeek: (week: FiscalWeek) => void;
  selectWeekRange: (
    startWeek: number,
    endWeek: number,
    weeks: FiscalWeek[],
  ) => void;
  selectCustomRange: (start: Date, end: Date, label?: string) => void;
  selectQuick: (
    type: QuickSelectType,
    fiscalData: FiscalCalendarData,
    currentFiscalYear?: number,
  ) => void;
  startDrag: (date: Date) => void;
  updateDrag: (date: Date) => void;
  endDrag: () => void;
  clearSelection: () => void;
}

export function useDateSelection(): UseDateSelectionResult {
  const [selection, setSelection] = useState<DateRangeSelection | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startDate: null,
    currentDate: null,
  });

  const selectPeriods = useCallback(
    (periodIds: number[], periods: FiscalPeriod[]) => {
      if (periodIds.length === 0) {
        setSelection(null);
        return;
      }

      const sortedIds = [...periodIds].sort((a, b) => a - b);
      const firstPeriod = periods.find((p) => p.id === sortedIds[0])!;
      const lastPeriod = periods.find(
        (p) => p.id === sortedIds[sortedIds.length - 1],
      )!;

      const periodNames = sortedIds
        .map((id) => `P${String(id).padStart(2, "0")}`)
        .join(", ");

      setSelection({
        type: "periods",
        startDate: firstPeriod.startDate,
        endDate: lastPeriod.endDate,
        label: periodNames,
        meta: { periodIds: sortedIds },
      });
    },
    [],
  );

  const selectWeek = useCallback((week: FiscalWeek) => {
    setSelection({
      type: "week",
      startDate: week.startDate,
      endDate: week.endDate,
      label: week.label,
      meta: { weekNum: week.weekNum },
    });
  }, []);

  const selectWeekRange = useCallback(
    (startWeek: number, endWeek: number, weeks: FiscalWeek[]) => {
      const minWeek = Math.min(startWeek, endWeek);
      const maxWeek = Math.max(startWeek, endWeek);

      const firstWeek = weeks.find((w) => w.weekNum === minWeek)!;
      const lastWeek = weeks.find((w) => w.weekNum === maxWeek)!;

      const label =
        minWeek === maxWeek ? `Week ${minWeek}` : `Weeks ${minWeek}-${maxWeek}`;

      setSelection({
        type: "weekRange",
        startDate: firstWeek.startDate,
        endDate: lastWeek.endDate,
        label,
        meta: { weekRange: [minWeek, maxWeek] },
      });
    },
    [],
  );

  const selectCustomRange = useCallback(
    (start: Date, end: Date, label = "Custom Range") => {
      setSelection({
        type: "custom",
        startDate: start,
        endDate: end,
        label,
      });
    },
    [],
  );

  const selectQuick = useCallback(
    (
      type: QuickSelectType,
      fiscalData: FiscalCalendarData,
      currentFiscalYear?: number,
    ) => {
      const today = new Date();

      // Use provided fiscal year or fall back to today's fiscal year
      let targetFiscalYear: number;
      let referenceWeek: FiscalWeek | undefined;
      let referencePeriod: FiscalPeriod | undefined;

      if (currentFiscalYear) {
        // User is viewing a specific fiscal year - use that year's data
        targetFiscalYear = currentFiscalYear;
        const yearData = fiscalData.years.get(targetFiscalYear);
        if (!yearData) {
          console.warn(`Fiscal year ${targetFiscalYear} not found in data`);
          return;
        }

        // Find the "current" week/period within the viewed year based on today's date
        const { week, period } = getCurrentFiscalContext(fiscalData, today);

        // If today falls in the viewed year, use those
        if (week?.fiscalYear === targetFiscalYear) {
          referenceWeek = week;
          referencePeriod = period;
        } else {
          // Otherwise, default to first week/period of the viewed year
          referenceWeek = yearData.weeks[0];
          referencePeriod = yearData.periods[0];
        }
      } else {
        // No specific year provided - use today's actual fiscal context
        const { week, period } = getCurrentFiscalContext(fiscalData, today);
        if (!week || !period) {
          console.warn("Unable to determine current fiscal week/period");
          return;
        }
        targetFiscalYear = week.fiscalYear;
        referenceWeek = week;
        referencePeriod = period;
      }

      if (!referenceWeek || !referencePeriod) {
        console.warn("Unable to determine reference week/period");
        return;
      }

      const fiscalYear = fiscalData.years.get(targetFiscalYear)!;

      // Check if we're viewing the current fiscal year (where today falls)
      const isViewingCurrentYear =
        today >= fiscalYear.startDate && today <= fiscalYear.endDate;

      switch (type) {
        case "thisWeek":
          selectWeek(referenceWeek);
          break;

        case "lastWeek": {
          // If current year, select the week before reference week
          // If other year, select the last week of that year
          let lastWeek: FiscalWeek | undefined;
          if (isViewingCurrentYear) {
            lastWeek = fiscalYear.weeks.find(
              (w) => w.weekNum === referenceWeek.weekNum - 1,
            );
          } else {
            lastWeek = fiscalYear.weeks[fiscalYear.weeks.length - 1];
          }
          if (lastWeek) {
            selectWeek(lastWeek);
          }
          break;
        }

        case "firstWeek": {
          const firstWeek = fiscalYear.weeks[0];
          if (firstWeek) {
            selectWeek(firstWeek);
          }
          break;
        }

        case "thisPeriod":
          selectPeriods([referencePeriod.id], fiscalYear.periods);
          break;

        case "firstPeriod": {
          const firstPeriod = fiscalYear.periods[0];
          if (firstPeriod) {
            selectPeriods([firstPeriod.id], fiscalYear.periods);
          }
          break;
        }

        case "lastPeriod": {
          // If current year, select the period before reference period
          // If other year, select the last period of that year
          let lastPeriod: FiscalPeriod | undefined;
          if (isViewingCurrentYear) {
            lastPeriod = fiscalYear.periods.find(
              (p) => p.id === referencePeriod.id - 1,
            );
          } else {
            lastPeriod = fiscalYear.periods[fiscalYear.periods.length - 1];
          }
          if (lastPeriod) {
            selectPeriods([lastPeriod.id], fiscalYear.periods);
          }
          break;
        }

        case "thisQuarter": {
          const quarterPeriods = fiscalYear.periods.filter(
            (p) => p.quarter === referencePeriod.quarter,
          );
          selectPeriods(
            quarterPeriods.map((p) => p.id),
            fiscalYear.periods,
          );
          break;
        }

        case "ytd":
          setSelection({
            type: "quick",
            startDate: fiscalYear.startDate,
            endDate: today,
            label: "Year to Date",
            meta: { quickType: type },
          });
          break;

        case "fullYear":
          setSelection({
            type: "quick",
            startDate: fiscalYear.startDate,
            endDate: fiscalYear.endDate,
            label: `FY ${targetFiscalYear}`,
            meta: { quickType: type },
          });
          break;
      }
    },
    [selectWeek, selectPeriods],
  );

  const startDrag = useCallback((date: Date) => {
    setDragState({
      isDragging: true,
      startDate: date,
      currentDate: date,
    });
  }, []);

  const updateDrag = useCallback((date: Date) => {
    setDragState((prev) => ({
      ...prev,
      currentDate: date,
    }));
  }, []);

  const endDrag = useCallback(() => {
    if (dragState.isDragging && dragState.startDate && dragState.currentDate) {
      const start =
        dragState.startDate < dragState.currentDate
          ? dragState.startDate
          : dragState.currentDate;
      const end =
        dragState.startDate < dragState.currentDate
          ? dragState.currentDate
          : dragState.startDate;

      selectCustomRange(start, end, "Custom Range");
    }

    setDragState({
      isDragging: false,
      startDate: null,
      currentDate: null,
    });
  }, [dragState, selectCustomRange]);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  return {
    selection,
    dragState,
    selectPeriods,
    selectWeek,
    selectWeekRange,
    selectCustomRange,
    selectQuick,
    startDrag,
    updateDrag,
    endDrag,
    clearSelection,
  };
}
