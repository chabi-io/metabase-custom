import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "ttag";

import { Alert, Button, Group, Loader, Text } from "metabase/ui";

import Styles from "./ExtendedDateFilterPicker.module.css";
import { FiscalCalendarGrid } from "./components/FiscalCalendarGrid";
import { FiscalCalendarHeader } from "./components/FiscalCalendarHeader";
import { SelectionToolbar } from "./components/SelectionToolbar";
import { useDateSelection } from "./hooks/useDateSelection";
import { useFiscalCalendarCardDiscovery } from "./hooks/useFiscalCalendarCardDiscovery";
import { useFiscalCalendarData } from "./hooks/useFiscalCalendarData";
import type {
  ExtendedDateFilterPickerProps,
  FiscalWeek,
  ViewMode,
} from "./types";
import { getCurrentFiscalYear, getWeeksForView } from "./utils";

export function ExtendedDateFilterPicker({
  value,
  onApply,
  onBack,
  readOnly = false,
}: ExtendedDateFilterPickerProps) {
  // Navigation state - initialize with current calendar year, will update once data loads
  const [fiscalYear, setFiscalYear] = useState(() => new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("Year");

  // Track previous value to detect external clears
  const prevValueRef = useRef(value);
  // Track if we've initialized from the current value
  const initializedFromValueRef = useRef(false);
  // Track last clicked week for shift-click range selection
  const lastClickedWeekRef = useRef<number | null>(null);

  // Discover fiscal calendar card
  const {
    cardId,
    isLoading: isDiscovering,
    error: discoveryError,
  } = useFiscalCalendarCardDiscovery();

  // Data fetching
  const {
    data: fiscalData,
    loading: isLoadingData,
    error: dataError,
    refetch,
  } = useFiscalCalendarData({
    cardId,
  });

  const loading = isDiscovering || isLoadingData;
  const error = discoveryError || dataError;

  // Update fiscal year to actual current fiscal year once data loads
  useEffect(() => {
    if (fiscalData && !value) {
      const currentFY = getCurrentFiscalYear(fiscalData);
      if (currentFY !== fiscalYear) {
        setFiscalYear(currentFY);
      }
    }
  }, [fiscalData, fiscalYear, value]);

  // Selection state
  const {
    selection,
    dragState,
    selectPeriods,
    selectWeek,
    selectWeekRange,
    selectQuick,
    selectCustomRange,
    startDrag,
    updateDrag,
    endDrag,
    clearSelection,
  } = useDateSelection();

  // Sync selection with value prop
  useEffect(() => {
    if (!fiscalData) {
      return;
    }

    const prevValue = prevValueRef.current;
    const valueChanged = prevValue !== value;
    const valueCleared = prevValue && !value;

    if (value && value.values && value.values.length === 2) {
      // Value prop has a selection - initialize only if value changed
      if (valueChanged && !initializedFromValueRef.current) {
        const [startDate, endDate] = value.values;
        selectCustomRange(startDate, endDate, "Selected Range");

        // Set fiscal year to the year containing the start date
        for (const [year, yearData] of fiscalData.years.entries()) {
          if (
            startDate >= yearData.startDate &&
            startDate <= yearData.endDate
          ) {
            setFiscalYear(year);
            break;
          }
        }
        initializedFromValueRef.current = true;
      }
    } else if (valueCleared) {
      // Value prop was cleared externally - clear our selection
      clearSelection();
      initializedFromValueRef.current = false;
    } else if (!value) {
      // No value - reset initialization flag
      initializedFromValueRef.current = false;
    }

    prevValueRef.current = value;
  }, [value, fiscalData, selectCustomRange, clearSelection]);

  // Get current fiscal year data
  const currentYearData = fiscalData?.years.get(fiscalYear);

  // Get visible weeks based on view mode
  const visibleWeeks = useMemo(() => {
    if (!currentYearData) {
      return [];
    }
    return getWeeksForView(currentYearData.weeks, viewMode);
  }, [currentYearData, viewMode]);

  // Global mouse up handler for drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (dragState.isDragging) {
        endDrag();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [dragState.isDragging, endDrag]);

  // Loading state
  if (loading) {
    return (
      <div className={Styles.loadingContainer}>
        <Loader size="lg" />
        <Text mt="md">{t`Loading...`}</Text>
      </div>
    );
  }

  // Error state
  if (error || !fiscalData || !currentYearData) {
    return (
      <div className={Styles.errorContainer}>
        <Alert color="error" title={t`Failed to load fiscal calendar`}>
          {error?.message || t`Unable to load fiscal calendar data`}
        </Alert>
        <Button mt="md" onClick={refetch}>
          {t`Retry`}
        </Button>
      </div>
    );
  }

  const handleApply = () => {
    if (!onApply) {
      return;
    }

    if (selection) {
      onApply({
        type: "specific",
        operator: "between",
        values: [selection.startDate, selection.endDate],
        hasTime: false,
      });
    } else {
      // No selection means user cleared - apply null to remove filter
      onApply(null);
    }
  };

  const handleClear = () => {
    // Just clear local state - don't apply yet
    clearSelection();
  };

  const handleWeekClick = (week: FiscalWeek, event: React.MouseEvent) => {
    if (
      event.shiftKey &&
      lastClickedWeekRef.current !== null &&
      currentYearData
    ) {
      // Check if shift+clicking a boundary of the current range to shrink it
      const currentRange = selection?.meta?.weekRange;
      const isAtStartBoundary =
        currentRange && week.weekNum === currentRange[0];
      const isAtEndBoundary = currentRange && week.weekNum === currentRange[1];

      if (isAtStartBoundary && currentRange[0] < currentRange[1]) {
        // Shrink from start: move start forward by 1
        selectWeekRange(
          currentRange[0] + 1,
          currentRange[1],
          currentYearData.weeks,
        );
        lastClickedWeekRef.current = currentRange[1]; // Anchor stays at the other end
      } else if (isAtEndBoundary && currentRange[1] > currentRange[0]) {
        // Shrink from end: move end backward by 1
        selectWeekRange(
          currentRange[0],
          currentRange[1] - 1,
          currentYearData.weeks,
        );
        lastClickedWeekRef.current = currentRange[0]; // Anchor stays at the other end
      } else {
        // Normal shift+click: select range from last clicked week to current week
        const startWeek = Math.min(lastClickedWeekRef.current, week.weekNum);
        const endWeek = Math.max(lastClickedWeekRef.current, week.weekNum);
        selectWeekRange(startWeek, endWeek, currentYearData.weeks);
      }
    } else {
      // Check if clicking the exact same week that was last clicked
      const isClickingSameWeek = lastClickedWeekRef.current === week.weekNum;

      if (isClickingSameWeek) {
        // Clicking the same week twice - deselect
        clearSelection();
        lastClickedWeekRef.current = null;
      } else {
        // Clicking a different week - select it (or update anchor point)
        selectWeek(week);
        lastClickedWeekRef.current = week.weekNum;
      }
    }
  };

  const applyButtonLabel = value ? t`Update filter` : t`Add filter`;

  return (
    <div className={Styles.container}>
      {/* Header with year navigation and view mode */}
      <FiscalCalendarHeader
        fiscalYear={fiscalYear}
        viewMode={viewMode}
        onYearChange={setFiscalYear}
        onViewModeChange={setViewMode}
        minYear={fiscalData.minYear}
        maxYear={fiscalData.maxYear}
        onBack={onBack}
      />

      {/* Selection toolbar */}
      <SelectionToolbar
        periods={currentYearData.periods}
        weeks={currentYearData.weeks}
        selection={selection}
        viewMode={viewMode}
        fiscalYear={fiscalYear}
        fiscalData={fiscalData}
        onSelectPeriods={selectPeriods}
        onSelectWeekRange={selectWeekRange}
        onSelectQuick={selectQuick}
        onClearSelection={handleClear}
        onApply={handleApply}
        applyButtonLabel={applyButtonLabel}
        readOnly={readOnly}
      />

      {/* Calendar grid */}
      <FiscalCalendarGrid
        weeks={visibleWeeks}
        selection={selection}
        dragState={dragState}
        onWeekClick={handleWeekClick}
        onDayMouseDown={startDrag}
        onDayMouseMove={updateDrag}
        readOnly={readOnly}
      />

      {/* Actions - also at bottom for convenience */}
      <Group className={Styles.actions} justify="space-between" mt="md">
        <div>
          {onBack && (
            <Button variant="subtle" onClick={onBack}>
              {t`Back`}
            </Button>
          )}
        </div>
        <Button variant="filled" onClick={handleApply}>
          {applyButtonLabel}
        </Button>
      </Group>
    </div>
  );
}
