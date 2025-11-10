import { useState } from "react";
import { t } from "ttag";

import { Button, Group, Text, TextInput } from "metabase/ui";

import type {
  DateRangeSelection,
  FiscalCalendarData,
  FiscalPeriod,
  FiscalWeek,
  QuickSelectType,
  ViewMode,
} from "../types";
import { formatSelectionLabel, getPeriodsForQuarter } from "../utils";

import { PeriodDropdown } from "./PeriodDropdown";
import styles from "./SelectionToolbar.module.css";

interface SelectionToolbarProps {
  periods: FiscalPeriod[];
  weeks: FiscalWeek[];
  selection: DateRangeSelection | null;
  viewMode: ViewMode;
  fiscalYear: number;
  fiscalData: FiscalCalendarData;
  onSelectPeriods: (periodIds: number[], periods: FiscalPeriod[]) => void;
  onSelectWeekRange: (start: number, end: number, weeks: FiscalWeek[]) => void;
  onSelectQuick: (
    type: QuickSelectType,
    fiscalData: FiscalCalendarData,
    currentFiscalYear?: number,
  ) => void;
  onClearSelection: () => void;
  onApply?: () => void;
  applyButtonLabel?: string;
  readOnly?: boolean;
}

export function SelectionToolbar({
  periods,
  weeks,
  selection,
  viewMode,
  fiscalYear,
  fiscalData,
  onSelectPeriods,
  onSelectWeekRange,
  onSelectQuick,
  onClearSelection,
  onApply,
  applyButtonLabel,
  readOnly,
}: SelectionToolbarProps) {
  const [weekRangeStart, setWeekRangeStart] = useState("");
  const [weekRangeEnd, setWeekRangeEnd] = useState("");

  const handleWeekRangeApply = () => {
    const start = parseInt(weekRangeStart);
    const end = parseInt(weekRangeEnd);

    if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= 52) {
      onSelectWeekRange(start, end, weeks);
      setWeekRangeStart("");
      setWeekRangeEnd("");
    }
  };

  const visiblePeriods =
    viewMode === "Year"
      ? periods
      : getPeriodsForQuarter(periods, parseInt(viewMode.substring(1)));

  // Determine if we're viewing the current fiscal year
  const today = new Date();
  const currentFiscalYear = fiscalData.years.get(fiscalYear);
  const isCurrentYear =
    currentFiscalYear &&
    today >= currentFiscalYear.startDate &&
    today <= currentFiscalYear.endDate;

  return (
    <div className={styles.toolbar}>
      {/* First row: Periods dropdown + Weeks from/to */}
      <Group gap="sm" align="center" wrap="nowrap">
        <Text
          size="sm"
          fw={600}
          style={{ minWidth: 60, color: "var(--mb-color-text-medium)" }}
        >
          {t`Periods`}
        </Text>
        <PeriodDropdown
          periods={visiblePeriods}
          allPeriods={periods}
          selectedPeriodIds={selection?.meta?.periodIds || []}
          onSelect={(periodIds) => onSelectPeriods(periodIds, periods)}
          disabled={readOnly}
        />
        <Text
          size="sm"
          fw={600}
          ml="lg"
          style={{ minWidth: 50, color: "var(--mb-color-text-medium)" }}
        >
          {t`Weeks`}
        </Text>
        <TextInput
          size="xs"
          placeholder={t`From`}
          value={weekRangeStart}
          onChange={(e) => setWeekRangeStart(e.target.value)}
          style={{ width: 60 }}
          disabled={readOnly}
        />
        <Text size="sm" style={{ color: "var(--mb-color-text-medium)" }}>
          –
        </Text>
        <TextInput
          size="xs"
          placeholder={t`To`}
          value={weekRangeEnd}
          onChange={(e) => setWeekRangeEnd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleWeekRangeApply()}
          style={{ width: 60 }}
          disabled={readOnly}
        />
        <Button
          size="xs"
          onClick={handleWeekRangeApply}
          disabled={!weekRangeStart || !weekRangeEnd || readOnly}
        >
          {t`Select`}
        </Button>
      </Group>

      {/* Second row: Quick select buttons */}
      <Group gap="xs" align="center">
        <Text
          size="sm"
          fw={600}
          style={{ minWidth: 60, color: "var(--mb-color-text-medium)" }}
        >
          {t`Quick`}
        </Text>
        {isCurrentYear ? (
          // Current year: show "This Week", "This Period", etc.
          <>
            <Button
              size="xs"
              variant="default"
              onClick={() => onSelectQuick("thisWeek", fiscalData, fiscalYear)}
              disabled={readOnly}
            >
              {t`This Week`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => onSelectQuick("lastWeek", fiscalData, fiscalYear)}
              disabled={readOnly}
            >
              {t`Last Week`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() =>
                onSelectQuick("thisPeriod", fiscalData, fiscalYear)
              }
              disabled={readOnly}
            >
              {t`This Period`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() =>
                onSelectQuick("thisQuarter", fiscalData, fiscalYear)
              }
              disabled={readOnly}
            >
              {t`This Quarter`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => onSelectQuick("ytd", fiscalData, fiscalYear)}
              disabled={readOnly}
            >
              {t`YTD`}
            </Button>
          </>
        ) : (
          // Past/Future year: show "First Week", "Last Period", etc.
          <>
            <Button
              size="xs"
              variant="default"
              onClick={() => onSelectQuick("firstWeek", fiscalData, fiscalYear)}
              disabled={readOnly}
            >
              {t`First Week`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => onSelectQuick("lastWeek", fiscalData, fiscalYear)}
              disabled={readOnly}
            >
              {t`Last Week`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() =>
                onSelectQuick("firstPeriod", fiscalData, fiscalYear)
              }
              disabled={readOnly}
            >
              {t`First Period`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() =>
                onSelectQuick("lastPeriod", fiscalData, fiscalYear)
              }
              disabled={readOnly}
            >
              {t`Last Period`}
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => onSelectQuick("fullYear", fiscalData, fiscalYear)}
              disabled={readOnly}
            >
              {t`Full Year`}
            </Button>
          </>
        )}
      </Group>

      {/* Selection display and actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        className={styles.selectionSummary}
      >
        {selection ? (
          <Group gap="sm">
            <Text size="sm">{formatSelectionLabel(selection)}</Text>
            <Button size="xs" variant="subtle" onClick={onClearSelection}>
              {t`Clear`}
            </Button>
          </Group>
        ) : (
          <div />
        )}
        {onApply ? (
          <Button size="xs" variant="filled" onClick={onApply}>
            {applyButtonLabel || t`Apply filter`}
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
