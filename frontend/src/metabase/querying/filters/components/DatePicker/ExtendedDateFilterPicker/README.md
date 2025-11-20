# ExtendedDateFilterPicker

A fiscal calendar date filter component designed for businesses using 13-period fiscal calendars with 52 weeks. Connects to Snowflake fiscal calendar data via Metabase saved questions for database-driven configuration.

## Features

- **Fiscal Calendar Structure**: 13 periods (P01-P13) × 4 weeks each = 52 weeks total
- **Multi-Period Selection**: Dropdown with checkboxes to select one or more fiscal periods
- **Week Selection**: Click week numbers (1-52) or enter week ranges (e.g., W5-W12)
- **Drag-to-Select**: Click and drag across calendar days to select custom date ranges
- **Quick Select Buttons**: This Week, Last Week, This Period, This Quarter, YTD
- **Fiscal Year Navigation**: Navigate between fiscal years with prev/next controls
- **Quarter Views**: Filter view by Q1, Q2, Q3, Q4, or see full Year
- **Database-Driven**: Fiscal settings loaded from Snowflake via Metabase saved question
- **Responsive Calendar Grid**: Month cards adapt to screen size

## Setup

### 1. Create Fiscal Calendar Saved Question

Create a saved question in Metabase that queries your period-level fiscal calendar data. See [SNOWFLAKE_SETUP.md](./SNOWFLAKE_SETUP.md) for detailed instructions.

Your saved question should:
- Accept `start_year` and `end_year` parameters
- Return 5 columns: `YEAR`, `START_DATE`, `END_DATE`, `PERIOD`, `QUARTER`
- Simple period-level data (weeks are generated automatically on frontend)

### 2. Enable Auto-Discovery

To make your fiscal calendar card discoverable:

1. **Add description marker** (Required):
   - Edit your saved question
   - In the **Description** field, add: `[FISCAL_CALENDAR_SOURCE]`
   - Save the question

2. **Use collection convention** (Optional but recommended):
   - Create a collection named "Fiscal Calendar" or "System Queries"
   - Move your saved question to this collection
   - This helps organize system queries and improves discoverability

### 3. Done!

The `ExtendedDateFilterPicker` will automatically discover your fiscal calendar card at runtime. No Card ID configuration needed!

**For development/testing:** Override the card ID in browser console:
```javascript
setFiscalCalendarCardId(123)  // Set override
clearFiscalCalendarCardId()   // Clear override
```

## Usage

```tsx
import { ExtendedDateFilterPicker } from "metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker";
import type { SpecificDatePickerValue } from "metabase/querying/filters/types";

function MyComponent() {
  const [dateFilter, setDateFilter] = useState<SpecificDatePickerValue | undefined>();

  return (
    <ExtendedDateFilterPicker
      value={dateFilter}
      onChange={setDateFilter}
      onApply={(value) => {
        // Apply the filter to your query
        console.log("Filter applied:", value);
      }}
      onBack={() => console.log("Back clicked")}
      readOnly={false}
    />
  );
}
```

The component automatically discovers the fiscal calendar card - no configuration needed!

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `SpecificDatePickerValue?` | Current filter value (between dates) |
| `onChange` | `(value: SpecificDatePickerValue) => void` | Called when selection changes |
| `onApply` | `(value: SpecificDatePickerValue) => void` | Called when Apply button clicked |
| `onBack` | `() => void` | Optional back button handler |
| `readOnly` | `boolean` | Disable interactions (default: false) |

## Value Structure

The component uses Metabase's standard `SpecificDatePickerValue` format:

```typescript
interface SpecificDatePickerValue {
  type: "specific";
  operator: "between";
  values: [Date, Date];  // [startDate, endDate]
  hasTime: false;
}
```

Internally, the component tracks rich selection metadata:

```typescript
interface DateRangeSelection {
  type: "periods" | "week" | "weekRange" | "custom" | "quick";
  startDate: Date;
  endDate: Date;
  label: string;  // e.g., "P01-P03 (Q1)" or "Week 5" or "W5-W12"
  meta?: {
    periodIds?: number[];        // [1, 2, 3] for P01-P03
    weekNum?: number;            // 5 for Week 5
    weekRange?: [number, number]; // [5, 12] for W5-W12
    quickType?: "thisWeek" | "lastWeek" | "thisPeriod" | "thisQuarter" | "ytd";
  };
}
```

## Selection Methods

The component provides multiple ways to select date ranges:

### 1. Period Selection
Click the "Select periods..." dropdown to select one or more fiscal periods (P01-P13). Selecting P01, P02, P03 will create a date range spanning all three periods.

### 2. Week Selection
Click any week number (1-52) in the calendar to select that entire week.

### 3. Week Range
Enter start and end week numbers in the "WEEKS" section (e.g., From: 5, To: 12) and click Apply to select weeks 5-12.

### 4. Drag to Select
Click and drag across calendar days to select a custom date range. The selection will snap to complete days.

### 5. Quick Select
Use preset buttons for common selections:
- **This Week**: Current fiscal week
- **Last Week**: Previous fiscal week
- **This Period**: Current fiscal period (4 weeks)
- **This Quarter**: Current fiscal quarter (13 weeks)
- **YTD**: Year-to-date from fiscal year start

## Component Architecture

```
ExtendedDateFilterPicker/
├── ExtendedDateFilterPicker.tsx          # Main component
├── types.ts                               # TypeScript interfaces
├── fiscalCalendarApi.ts                   # Data fetching via CardApi
├── utils.ts                               # Parsing and utility functions
├── hooks/
│   ├── useFiscalCalendarData.ts          # Data fetching hook
│   └── useDateSelection.ts               # Selection state management
└── components/
    ├── FiscalCalendarHeader.tsx          # Year nav + view mode switcher
    ├── SelectionToolbar.tsx              # Period/week/quick selectors
    ├── PeriodDropdown.tsx                # Multi-select period dropdown
    ├── FiscalCalendarGrid.tsx            # Month cards container
    ├── MonthCard.tsx                     # Single month display
    └── WeekRow.tsx                       # Week number + 7 day cells
```

## Styling

The component uses CSS Modules (Metabase's preferred approach) for all styling:

- `ExtendedDateFilterPicker.module.css` - Main container and layout
- `components/WeekRow.module.css` - Week rows with hover/selection states
- `components/MonthCard.module.css` - Month card styling
- `components/FiscalCalendarGrid.module.css` - Responsive grid layout
- `components/PeriodDropdown.module.css` - Period dropdown styling
- `components/SelectionToolbar.module.css` - Toolbar layout

Metabase CSS custom properties used:

```css
:root {
  --mb-color-brand: #509ee3;          /* Primary brand color for selections */
  --mb-color-brand-light: #e6f2ff;    /* Light selection background */
  --mb-color-brand-dark: #2c5aa0;     /* Hover states */
  --mb-color-bg-white: #ffffff;       /* Calendar background */
  --mb-color-bg-light: #f9fbfc;       /* Hover backgrounds */
  --mb-color-bg-medium: #eef2f5;      /* Header backgrounds */
  --mb-color-border: #dce1e4;         /* Border color */
  --mb-color-text-dark: #2e353b;      /* Primary text */
  --mb-color-text-medium: #7c8381;    /* Secondary text */
  --mb-color-text-light: #b8bbc0;     /* Disabled text */
}
```

## Development

### Prerequisites

1. **Snowflake Database**: Set up fiscal calendar table with required schema
2. **Metabase Saved Question**: Create and configure (see [SNOWFLAKE_SETUP.md](./SNOWFLAKE_SETUP.md))
3. **Description Marker**: Add `[FISCAL_CALENDAR_SOURCE]` to saved question description

### Testing

1. **Data Parsing**: Run the test parser to verify data transformation
   ```bash
   node test-parser.js
   ```

2. **Storybook**: Launch component in isolation
   ```bash
   yarn storybook
   # Navigate to Components/ExtendedDateFilterPicker
   ```

3. **Local Development**: Import and use in your Metabase dashboard
   ```tsx
   import { ExtendedDateFilterPicker } from "metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker";
   ```

4. **Type Checking**: Ensure TypeScript compilation
   ```bash
   yarn type-check-pure
   ```

5. **Linting**: Check code style
   ```bash
   yarn lint-eslint-pure
   ```

### Troubleshooting

**Loader appears but never loads**
- Verify Snowflake database connection in Metabase
- Check that saved question has `[FISCAL_CALENDAR_SOURCE]` in description
- Inspect browser console for discovery errors
- Try setting card ID manually: `setFiscalCalendarCardId(YOUR_ID)`

**"Fiscal calendar card not found" error**
- Ensure saved question has `[FISCAL_CALENDAR_SOURCE]` in description field
- Verify the saved question is not archived
- Check Metabase permissions for the saved question
- Try searching manually to confirm card exists

**"Failed to load fiscal calendar data" error**
- Ensure saved question has `start_year` and `end_year` parameters
- Verify column names match expected schema (see types.ts)
- Check that parameters are properly configured

**Week numbers don't align**
- Verify fiscal calendar data uses Monday week starts
- Check that WEEK_START_DATE is always a Monday
- Ensure FISCAL_WEEK_NUM runs 1-52

**Quick select buttons don't work**
- Verify current date falls within loaded fiscal year data
- Check browser console for calculation errors
- Ensure fiscal periods have correct quarter assignments

## Fork-Friendly Design

This component is designed to be:
- **Standalone**: No modifications to existing Metabase core files
- **Additive**: Only adds new functionality, doesn't change existing behavior
- **Self-contained**: All logic and styling in its own directory
- **Type-safe**: Follows Metabase's type system patterns

This makes it easy to:
- Merge upstream Metabase changes
- Maintain the component independently
- Migrate to official Metabase features if they're added later