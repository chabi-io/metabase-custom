import classNames from "classnames";
import { useState } from "react";

import type { DateRangeSelection, DragState, FiscalWeek } from "../types";
import { isDateInSelection } from "../utils";

import styles from "./WeekRow.module.css";

interface WeekRowProps {
  week: FiscalWeek;
  selection: DateRangeSelection | null;
  dragState: DragState;
  onWeekClick: (week: FiscalWeek, event: React.MouseEvent) => void;
  onDayMouseDown: (date: Date) => void;
  onDayMouseMove: (date: Date) => void;
  readOnly?: boolean;
}

export function WeekRow({
  week,
  selection,
  dragState,
  onWeekClick,
  onDayMouseDown,
  onDayMouseMove,
  readOnly,
}: WeekRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isWeekSelected =
    selection?.meta?.weekNum === week.weekNum ||
    selection?.meta?.periodIds?.includes(week.periodNum) ||
    (selection?.meta?.weekRange &&
      week.weekNum >= selection.meta.weekRange[0] &&
      week.weekNum <= selection.meta.weekRange[1]);

  return (
    <div
      className={classNames(styles.weekRow, {
        [styles.weekRowHovered]: isHovered,
        [styles.weekRowSelected]: isWeekSelected,
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Week number cell */}
      <div
        className={classNames(styles.weekNumber, {
          [styles.weekNumberSelected]: isWeekSelected,
        })}
        onClick={(e) => !readOnly && onWeekClick(week, e)}
        title={`Week ${week.weekNum}\n${week.label}\nClick to select\nShift+Click to select range`}
      >
        <div className={styles.weekNum}>{week.weekNum}</div>
        <div className={styles.periodLabel}>{week.periodName}</div>
      </div>

      {/* Day cells */}
      {week.days.map((day, idx) => {
        const isDaySelected = isDateInSelection(
          day,
          selection,
          dragState.startDate,
          dragState.currentDate,
        );
        const isToday = day.toDateString() === new Date().toDateString();

        return (
          <div
            key={idx}
            className={classNames(styles.dayCell, {
              [styles.dayCellSelected]: isDaySelected,
              [styles.dayCellToday]: isToday,
              [styles.dayCellDragging]: dragState.isDragging,
            })}
            onMouseDown={() => !readOnly && onDayMouseDown(day)}
            onMouseEnter={() =>
              !readOnly && dragState.isDragging && onDayMouseMove(day)
            }
          >
            {day.getDate()}
          </div>
        );
      })}
    </div>
  );
}
