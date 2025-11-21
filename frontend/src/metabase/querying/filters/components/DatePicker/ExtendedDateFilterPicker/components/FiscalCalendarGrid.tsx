import { useMemo } from "react";

import type { DateRangeSelection, DragState, FiscalWeek } from "../types";
import { getMonthsInView } from "../utils";

import styles from "./FiscalCalendarGrid.module.css";
import { MonthCard } from "./MonthCard";

interface FiscalCalendarGridProps {
  weeks: FiscalWeek[];
  selection: DateRangeSelection | null;
  dragState: DragState;
  onWeekClick: (week: FiscalWeek, event: React.MouseEvent) => void;
  onDayMouseDown: (date: Date) => void;
  onDayMouseMove: (date: Date) => void;
  readOnly?: boolean;
}

export function FiscalCalendarGrid({
  weeks,
  selection,
  dragState,
  onWeekClick,
  onDayMouseDown,
  onDayMouseMove,
  readOnly,
}: FiscalCalendarGridProps) {
  const monthsInView = useMemo(() => getMonthsInView(weeks), [weeks]);

  return (
    <div className={styles.grid}>
      {monthsInView.map(({ month, year, periodNames }) => {
        const monthWeeks = weeks.filter((week) => {
          const wednesday = week.days[2];
          return (
            wednesday.getMonth() === month && wednesday.getFullYear() === year
          );
        });

        if (monthWeeks.length === 0) {
          return null;
        }

        return (
          <MonthCard
            key={`${year}-${month}`}
            month={month}
            year={year}
            periodNames={periodNames}
            weeks={monthWeeks}
            selection={selection}
            dragState={dragState}
            onWeekClick={onWeekClick}
            onDayMouseDown={onDayMouseDown}
            onDayMouseMove={onDayMouseMove}
            readOnly={readOnly}
          />
        );
      })}
    </div>
  );
}
