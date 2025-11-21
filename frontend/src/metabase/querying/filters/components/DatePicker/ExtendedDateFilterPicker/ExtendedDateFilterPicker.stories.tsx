import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import type { SpecificDatePickerValue } from "metabase/querying/filters/types";

import { ExtendedDateFilterPicker } from "./ExtendedDateFilterPicker";

const meta: Meta<typeof ExtendedDateFilterPicker> = {
  title: "Components/ExtendedDateFilterPicker",
  component: ExtendedDateFilterPicker,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ExtendedDateFilterPicker>;

function ExtendedDateFilterPickerDemo() {
  const [value, setValue] = useState<SpecificDatePickerValue | undefined>();

  // Component automatically discovers fiscal calendar card at runtime
  // Setup: Create saved question with [FISCAL_CALENDAR_SOURCE] in description
  // See README.md for complete setup instructions

  return (
    <div style={{ width: "100%", minHeight: "100vh", padding: 24 }}>
      <ExtendedDateFilterPicker
        value={value}
        onChange={(v) => setValue(v ?? undefined)}
        onApply={(v) => setValue(v ?? undefined)}
      />

      {value && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <h4>Selected Filter:</h4>
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export const Default: Story = {
  render: () => <ExtendedDateFilterPickerDemo />,
};

export const ReadOnly: Story = {
  render: () => <ExtendedDateFilterPicker readOnly onChange={() => {}} />,
};
