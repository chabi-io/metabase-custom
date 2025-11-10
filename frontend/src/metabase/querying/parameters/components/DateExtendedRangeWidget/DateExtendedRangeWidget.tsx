import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";

import { ExtendedDateFilterPicker } from "metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker";
import type { SpecificDatePickerValue } from "metabase/querying/filters/types";
import {
  deserializeDateParameterValue,
  serializeDateParameterValue,
} from "metabase/querying/parameters/utils/parsing";
import type { ParameterValueOrArray } from "metabase-types/api";

type DateExtendedRangeWidgetProps = {
  value: ParameterValueOrArray | null | undefined;
  onChange: (value: string | null) => void;
};

export function DateExtendedRangeWidget({
  value,
  onChange,
}: DateExtendedRangeWidgetProps) {
  const [pickerValue, setPickerValue] = useState<
    SpecificDatePickerValue | undefined
  >(() => getPickerValue(value) ?? getPickerDefaultValue());

  // Sync internal state when external value changes (e.g., when "x" is clicked)
  useEffect(() => {
    const externalValue = getPickerValue(value);
    if (!value) {
      // Value was cleared externally
      setPickerValue(undefined);
    } else if (externalValue) {
      // Value was set externally
      setPickerValue(externalValue);
    }
  }, [value]);

  const handleChange = (value: SpecificDatePickerValue) => {
    // Only update internal state, don't call onChange yet
    setPickerValue(value);
  };

  const handleApply = (value: SpecificDatePickerValue | null) => {
    // This is called when user actually wants to apply the filter
    if (value) {
      setPickerValue(value);
      onChange(getWidgetValue(value));
    } else {
      // Clear was clicked
      setPickerValue(undefined);
      onChange(null);
    }
  };

  return (
    <ExtendedDateFilterPicker
      value={pickerValue}
      onChange={handleChange}
      onApply={handleApply}
      readOnly={false}
    />
  );
}

function getPickerValue(
  value: ParameterValueOrArray | null | undefined,
): SpecificDatePickerValue | undefined {
  return match(deserializeDateParameterValue(value))
    .returnType<SpecificDatePickerValue | undefined>()
    .with(
      { type: "specific", operator: "between" },
      (specificValue) => specificValue,
    )
    .otherwise(() => undefined);
}

function getPickerDefaultValue(): SpecificDatePickerValue {
  const today = dayjs().startOf("date").toDate();
  const past30Days = dayjs(today).subtract(30, "day").toDate();
  return {
    type: "specific",
    operator: "between",
    values: [past30Days, today],
    hasTime: false,
  };
}

function getWidgetValue(value: SpecificDatePickerValue) {
  return serializeDateParameterValue(value);
}
