import { useState } from "react";
import { t } from "ttag";

import { Button, Checkbox, Group, Popover, Stack, Text } from "metabase/ui";

import type { FiscalPeriod } from "../types";

import styles from "./PeriodDropdown.module.css";

interface PeriodDropdownProps {
  periods: FiscalPeriod[];
  allPeriods: FiscalPeriod[];
  selectedPeriodIds: number[];
  onSelect: (periodIds: number[]) => void;
  disabled?: boolean;
}

export function PeriodDropdown({
  periods,
  allPeriods,
  selectedPeriodIds,
  onSelect,
  disabled,
}: PeriodDropdownProps) {
  const [opened, setOpened] = useState(false);

  const togglePeriod = (periodId: number, e?: React.MouseEvent) => {
    // Stop event from bubbling up and closing parent popover
    // but DON'T preventDefault - that breaks checkbox visual feedback
    if (e) {
      e.stopPropagation();
    }

    const allPeriodIds = allPeriods.map((p) => p.id).sort((a, b) => a - b);
    const isCurrentlySelected = selectedPeriodIds.includes(periodId);

    if (isCurrentlySelected) {
      // UNCHECKING a period: truncate range at this point
      // If unchecking period 4 from [1,2,3,4,5,6], result should be [1,2,3]
      const sortedSelection = [...selectedPeriodIds].sort((a, b) => a - b);
      const uncheckedIdx = sortedSelection.indexOf(periodId);

      // Keep only periods before the unchecked one
      const newSelection = sortedSelection.slice(0, uncheckedIdx);
      onSelect(newSelection);
    } else {
      // CHECKING a period: auto-fill range to this period
      if (selectedPeriodIds.length === 0) {
        // First selection: just add this period
        onSelect([periodId]);
      } else {
        // Find the min and max of current selection
        const currentMin = Math.min(...selectedPeriodIds);
        const currentMax = Math.max(...selectedPeriodIds);

        // Determine the new range
        const newMin = Math.min(currentMin, periodId);
        const newMax = Math.max(currentMax, periodId);

        // Get all period IDs in the range [newMin, newMax]
        const minIdx = allPeriodIds.indexOf(newMin);
        const maxIdx = allPeriodIds.indexOf(newMax);

        if (minIdx !== -1 && maxIdx !== -1) {
          const rangePeriodIds = allPeriodIds.slice(minIdx, maxIdx + 1);
          onSelect(rangePeriodIds);
        }
      }
    }
  };

  const selectAll = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onSelect(periods.map((p) => p.id));
  };

  const clearAll = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onSelect([]);
  };

  const displayText =
    selectedPeriodIds.length === 0
      ? "Select periods..."
      : selectedPeriodIds.length === 1
        ? allPeriods.find((p) => p.id === selectedPeriodIds[0])?.name
        : `${selectedPeriodIds.length} selected`;

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start">
      <Popover.Target>
        <Button
          size="xs"
          variant="default"
          onClick={() => setOpened(!opened)}
          disabled={disabled}
          rightSection={
            // eslint-disable-next-line i18next/no-literal-string -- Icon character
            <span aria-hidden="true">▼</span>
          }
        >
          {displayText}
        </Button>
      </Popover.Target>

      <Popover.Dropdown
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ minWidth: "350px" }}
      >
        <Stack gap="xs" className={styles.periodList}>
          {periods.map((period) => {
            const isSelected = selectedPeriodIds.includes(period.id);
            const formatDate = (d: Date) =>
              d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

            return (
              <div
                key={period.id}
                className={styles.periodItem}
                onClick={(e) => togglePeriod(period.id, e)}
              >
                <Group
                  gap="sm"
                  wrap="nowrap"
                  align="flex-start"
                  style={{ width: "100%" }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => togglePeriod(period.id, e as any)}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap" mb={4}>
                      <Text
                        fw={600}
                        size="sm"
                        style={{ color: "var(--mb-color-text-dark)" }}
                      >
                        {period.name}
                      </Text>
                      {/* eslint-disable i18next/no-literal-string */}
                      <Text
                        size="xs"
                        style={{
                          whiteSpace: "nowrap",
                          color: "var(--mb-color-text-medium)",
                        }}
                        aria-label={t`Week ${period.startWeek} to ${period.endWeek}, Quarter ${period.quarter}`}
                      >
                        W{period.startWeek}-{period.endWeek} • Q{period.quarter}
                      </Text>
                      {/* eslint-enable i18next/no-literal-string */}
                    </Group>
                    <Text
                      size="xs"
                      style={{
                        lineHeight: 1.4,
                        color: "var(--mb-color-text-medium)",
                      }}
                    >
                      {formatDate(period.startDate)} -{" "}
                      {formatDate(period.endDate)}
                    </Text>
                  </div>
                </Group>
              </div>
            );
          })}
        </Stack>

        <Group gap="xs" mt="xs" className={styles.periodActions}>
          <Button size="xs" onClick={(e) => selectAll(e)} style={{ flex: 1 }}>
            {t`All`}
          </Button>
          <Button
            size="xs"
            variant="default"
            onClick={(e) => clearAll(e)}
            style={{ flex: 1 }}
          >
            {t`Clear`}
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
