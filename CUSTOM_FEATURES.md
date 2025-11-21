# Custom Features

This document describes custom features added to this Metabase fork and how to maintain them across versions.

## Extended Date Picker

**Feature Branch:** `feature/extended-date-range-picker`
**Tag:** `extended-date-picker-v1.0`
**Base Version:** Metabase v0.56.9+

### Description

A fiscal calendar date picker with advanced week/period selection capabilities, designed for organizations using 13-period (52-week) fiscal calendars.

### Features

- **Fiscal Calendar Structure**: 13 periods × 4 weeks = 52 weeks total
- **Multi-Period Selection**: Dropdown to select specific fiscal periods
- **Week Selection**: Click week numbers (1-52) or enter ranges (e.g., "W5-W12")
- **Quarter Views**: Navigate between Q1, Q2, Q3, Q4, or view full year
- **Quick Select Buttons**: This Week, Last Week, This Period, This Quarter, YTD
- **Drag-to-Select**: Click and drag across dates to select ranges
- **Database-Driven**: Loads fiscal settings from Snowflake via Metabase saved questions
- **Auto-Discovery**: Finds fiscal calendar data using `[FISCAL_CALENDAR_SOURCE]` description marker
- **Timezone-Aware**: Proper local time handling for week start days
- **Metabase Integration**: Full parameter system integration with standard date filter behavior

### Architecture

#### File Structure (24 files)

```
frontend/src/metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker/
├── ExtendedDateFilterPicker.tsx           # Main component
├── ExtendedDateFilterPicker.module.css    # Main styles
├── ExtendedDateFilterPicker.stories.tsx   # Storybook documentation
├── README.md                              # Component documentation
├── index.ts                               # Public exports
├── types.ts                               # TypeScript type definitions
├── utils.ts                               # Date calculation utilities
├── fiscalCalendarApi.ts                   # API integration layer
├── hooks/
│   ├── useDateSelection.ts                # Selection state management
│   ├── useFiscalCalendarCardDiscovery.ts  # Auto-discovery logic
│   └── useFiscalCalendarData.ts           # Data fetching hook
└── components/
    ├── FiscalCalendarGrid.tsx             # Main calendar grid
    ├── FiscalCalendarGrid.module.css
    ├── FiscalCalendarHeader.tsx           # Navigation header
    ├── MonthCard.tsx                      # Individual month display
    ├── MonthCard.module.css
    ├── PeriodDropdown.tsx                 # Period selector
    ├── PeriodDropdown.module.css
    ├── SelectionToolbar.tsx               # Quick actions toolbar
    ├── SelectionToolbar.module.css
    ├── WeekRow.tsx                        # Week number row
    └── WeekRow.module.css

frontend/src/metabase/querying/parameters/components/DateExtendedRangeWidget/
├── DateExtendedRangeWidget.tsx            # Parameter widget wrapper
└── index.ts                               # Public exports
```

#### Integration Points

**1. Widget Registration**
`frontend/src/metabase/parameters/components/ParameterDropdownWidget.tsx`
- Import: Line 7
- Registration: Line 72

**2. Parameter Type Definition**
`frontend/src/metabase-lib/v1/parameters/constants.ts`
- Definition: Lines 147-156
- Type: `date/extended-range`
- Operator: `extended-range`

#### Git Commits (4 total)

1. **934e051af0** - Add extended fiscal calendar date picker with week range selection (24 files)
2. **8ea1640bb6** - Fix ExtendedDateFilterPicker type issues from master (4 files)
3. **158bc78c2e** - Register DateExtendedRangeWidget in parameter system (1 file)
4. **b25db2534d** - Add date/extended-range parameter type definition (1 file)

### Usage

#### 1. Setup Fiscal Calendar Data Source

Create a Metabase saved question that returns fiscal calendar data:

```sql
SELECT
  fiscal_year,
  fiscal_period,
  fiscal_week,
  period_start_date,
  period_end_date,
  week_start_date,
  week_end_date
FROM your_fiscal_calendar_table
```

Add `[FISCAL_CALENDAR_SOURCE]` to the question's description field. The component will auto-discover this question.

**Preferred Collections:**
- "Fiscal Calendar" (highest priority)
- "System Queries" (second priority)
- Any other collection (fallback)

#### 2. Add to Dashboard/Question

1. Create a dashboard or question
2. Add a parameter with type "Extended Date Range"
3. The fiscal calendar picker will automatically appear
4. Connect the parameter to your date fields

#### 3. Development Override

For testing, you can override the fiscal calendar card ID in the browser console:

```javascript
// Set specific card ID
setFiscalCalendarCardId(123);

// Clear override and use auto-discovery
clearFiscalCalendarCardId();
```

### Testing

```bash
# Run component tests
yarn test-unit frontend/src/metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker

# Run Storybook
yarn storybook
# Navigate to ExtendedDateFilterPicker stories

# Type checking
yarn type-check
```

### Dependencies

- React 18+
- Mantine UI v8 (via metabase/ui)
- TypeScript 5+
- ttag (for localization)

---

## Deployment to New Metabase Versions

### Quick Deployment

Use the provided automation script:

```bash
./scripts/apply-extended-date-picker.sh v0.56.15.1
```

This will:
1. Create a new branch `v0.56.15.1-custom` from the Metabase tag
2. Cherry-pick the 4 feature commits
3. Run build validation
4. Prepare for Docker image creation

### Manual Deployment Process

If you prefer manual control:

#### Step 1: Create Version Branch

```bash
# Fetch latest Metabase tags
git fetch upstream --tags

# Create custom branch from desired version
git checkout -b v0.XX.X-custom vX.XX.X

# Example for v0.56.15.1
git checkout -b v0.56.15.1-custom v0.56.15.1
```

#### Step 2: Apply Feature Commits

**Option A: Cherry-pick (preferred)**

```bash
# Cherry-pick all 4 commits in order
git cherry-pick 934e051af0 8ea1640bb6 158bc78c2e b25db2534d

# Or use the tag reference
git cherry-pick extended-date-picker-v1.0~3..extended-date-picker-v1.0
```

**Option B: Use Git Patches** (if cherry-pick fails)

```bash
# Create patches from feature branch
git format-patch extended-date-picker-v1.0~3..extended-date-picker-v1.0 -o patches/

# Apply patches
git am patches/*.patch

# If conflicts occur
git am --abort  # Abort and try cherry-pick instead
```

#### Step 3: Resolve Conflicts (if any)

Common conflict locations:
- `frontend/src/metabase-lib/v1/parameters/constants.ts` (parameter type definitions)
- `frontend/src/metabase/parameters/components/ParameterDropdownWidget.tsx` (widget registration)

Resolution strategy:
1. Keep existing Metabase parameter types
2. Add the `date/extended-range` type to the appropriate array
3. Keep existing widget registrations
4. Add the `DateExtendedRangeWidget` import and mapping

#### Step 4: Validate Build

```bash
# Install dependencies (if not already done)
yarn install

# Type check
yarn type-check

# Lint
yarn lint-eslint

# Build frontend
yarn build

# Run targeted tests
yarn test-unit frontend/src/metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker
```

#### Step 5: Build Docker Image

```bash
# Tag appropriately for your registry
docker build -t your-registry/metabase-custom:v0.XX.X .

# Push to registry
docker push your-registry/metabase-custom:v0.XX.X
```

### Version-Specific Considerations

#### Metabase v0.56.x Series
- ✅ Fully compatible
- Uses Mantine v8 UI components
- No known issues

#### Metabase v0.57.x+ (Future)
- ⚠️ Check for Mantine version updates
- ⚠️ Verify parameter system changes
- May require type signature updates

#### Metabase v0.55.x (Legacy)
- ⚠️ May have different parameter system structure
- Test thoroughly before deployment

### Rollback Procedure

If the feature causes issues:

```bash
# Revert to base Metabase version
git reset --hard vX.XX.X

# Or remove just the feature
git revert extended-date-picker-v1.0~3..extended-date-picker-v1.0

# Rebuild
yarn build
```

### Maintenance

#### Updating the Feature

1. Make changes on `feature/extended-date-range-picker` branch
2. Test thoroughly
3. Create new version tag (e.g., `extended-date-picker-v1.1`)
4. Re-apply to version branches using new tag

#### Staying Current with Upstream

```bash
# Periodically sync upstream Metabase
git fetch upstream
git fetch upstream --tags

# When new Metabase version is released, deploy feature using steps above
```

---

## Support

For issues or questions:
- Check component README: `frontend/src/metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker/README.md`
- Review Storybook examples: `yarn storybook`
- Check browser console for discovery logs: `[FiscalCalendar] Discovered card: ...`

## License

This custom feature inherits the AGPL-3.0 license from Metabase.
