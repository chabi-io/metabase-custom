import { t } from "ttag";

import { Text } from "metabase/ui";

import type { DateRangeSelection, DragState, FiscalWeek } from "../types";

import styles from "./MonthCard.module.css";
import { WeekRow } from "./WeekRow";

interface MonthCardProps {
  month: number;
  year: number;
  periodNames: string[];
  weeks: FiscalWeek[];
  selection: DateRangeSelection | null;
  dragState: DragState;
  onWeekClick: (week: FiscalWeek, event: React.MouseEvent) => void;
  onDayMouseDown: (date: Date) => void;
  onDayMouseMove: (date: Date) => void;
  readOnly?: boolean;
}

export function MonthCard({
  month,
  year,
  periodNames,
  weeks,
  selection,
  dragState,
  onWeekClick,
  onDayMouseDown,
  onDayMouseMove,
  readOnly,
}: MonthCardProps) {
  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Get day names from first week's actual days
  // If no weeks, this component shouldn't be rendered, but provide empty fallback
  const dayHeaders =
    weeks.length > 0
      ? weeks[0].days.map((day) =>
          day.toLocaleDateString("en-US", { weekday: "short" }),
        )
      : [];

  return (
    <div className={styles.monthCard}>
      {/* Header */}
      <div className={styles.header}>
        <Text fw="bold">{monthName}</Text>
        <Text size="sm" c="dimmed">
          {periodNames.join(", ")}
        </Text>
      </div>

      {/* Day headers */}
      <div className={styles.dayHeaders}>
        <div className={styles.weekHeader}>{t`Wk`}</div>
        {dayHeaders.map((day, idx) => (
          <div key={`${day}-${idx}`} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className={styles.weeks}>
        {weeks.map((week) => (
          <WeekRow
            key={week.weekNum}
            week={week}
            selection={selection}
            dragState={dragState}
            onWeekClick={onWeekClick}
            onDayMouseDown={onDayMouseDown}
            onDayMouseMove={onDayMouseMove}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
