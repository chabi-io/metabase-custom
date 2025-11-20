import { t } from "ttag";

import { ActionIcon, Badge, Button, Group, Icon, Text } from "metabase/ui";

import type { ViewMode } from "../types";

interface FiscalCalendarHeaderProps {
  fiscalYear: number;
  viewMode: ViewMode;
  minYear: number;
  maxYear: number;
  onYearChange: (year: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onBack?: () => void;
}

export function FiscalCalendarHeader({
  fiscalYear,
  viewMode,
  minYear,
  maxYear,
  onYearChange,
  onViewModeChange,
  onBack,
}: FiscalCalendarHeaderProps) {
  const canGoPrev = fiscalYear > minYear;
  const canGoNext = fiscalYear < maxYear;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        borderBottom: "1px solid var(--mb-color-border)",
      }}
    >
      {/* Year navigation and view mode buttons grouped together */}
      <Group gap="sm">
        <Icon name="calendar" size={20} />
        <Group gap="xs">
          <ActionIcon
            onClick={() => onYearChange(fiscalYear - 1)}
            disabled={!canGoPrev}
          >
            <Icon name="chevronleft" />
          </ActionIcon>
          <Text fw="bold" size="lg">
            FY {fiscalYear}
          </Text>
          <ActionIcon
            onClick={() => onYearChange(fiscalYear + 1)}
            disabled={!canGoNext}
          >
            <Icon name="chevronright" />
          </ActionIcon>
        </Group>
        <Badge>{t`13 Periods • 52 Weeks`}</Badge>
        <Group gap="xs" ml="md">
          {(["Q1", "Q2", "Q3", "Q4", "Year"] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={viewMode === mode ? "filled" : "default"}
              onClick={() => onViewModeChange(mode)}
            >
              {mode}
            </Button>
          ))}
        </Group>
      </Group>

      {/* Back button - all the way right */}
      {onBack ? (
        <Button size="sm" variant="subtle" onClick={onBack}>
          {t`Back`}
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
