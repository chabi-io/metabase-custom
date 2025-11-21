# Scripts

Automation scripts for Metabase custom features and development workflows.

## Deployment Scripts

### apply-extended-date-picker.sh

Deploys the Extended Date Picker feature to any Metabase version.

**Usage:**
```bash
./scripts/apply-extended-date-picker.sh <version> [options]

# Examples:
./scripts/apply-extended-date-picker.sh v0.56.15.1
./scripts/apply-extended-date-picker.sh v0.57.0 --push
./scripts/apply-extended-date-picker.sh v0.56.20 --skip-validation --force
./scripts/apply-extended-date-picker.sh v0.56.15.1 --dry-run
```

**Options:**
- `--skip-validation` - Skip build validation step
- `--force` - Force branch creation even if it exists
- `--push` - Push branch to origin after creation
- `--dry-run` - Show what would be done without making changes

## Development Setup Scripts

### setup-fiscal-calendar-db.sh

Creates a persistent SQLite database with fiscal calendar data from your CSV file.

**Purpose:**
- One-time setup to avoid re-uploading CSV to Metabase every time you test
- Works across all Metabase versions (separate from Metabase app database)
- Provides consistent test data

**Usage:**
```bash
# 1. Make sure your CSV is at ~/Downloads/Uncommon Brands Nov 3 2025.csv
#    Or edit the CSV_PATH variable in the script

# 2. Run the script
./scripts/setup-fiscal-calendar-db.sh

# 3. Start Metabase
yarn dev

# 4. Add database in Metabase UI:
#    Admin > Databases > Add Database
#    Type: SQLite
#    Name: Fiscal Calendar
#    Path: /full/path/to/metabase-custom/fiscal-calendar.db
#    Click "Save"

# 5. Create the question (see next script)
```

The database will be created at `./fiscal-calendar.db` (git-ignored).

### create-fiscal-calendar-question.sh

Automatically creates a Metabase saved question with `[FISCAL_CALENDAR_SOURCE]` marker via API.

**Prerequisites:**
1. Fiscal calendar database must be added to Metabase (see above)
2. Metabase must be running
3. You must have admin credentials

**Usage:**
```bash
# With defaults (http://localhost:3000, admin@example.com/password)
./scripts/create-fiscal-calendar-question.sh

# Or with custom credentials
export METABASE_URL=http://localhost:3000
export METABASE_USERNAME=your-email@example.com
export METABASE_PASSWORD=your-password
./scripts/create-fiscal-calendar-question.sh
```

The script will:
- Login to Metabase
- Find the Fiscal Calendar database
- Create a "Fiscal Calendar" collection (if it doesn't exist)
- Create a "Fiscal Calendar Source" question
- Tag it with `[FISCAL_CALENDAR_SOURCE]` in the description

## Complete Workflow: Setting Up Test Environment

### First Time Setup

```bash
# 1. Create fiscal calendar database from CSV
./scripts/setup-fiscal-calendar-db.sh

# 2. Use a fresh test Metabase app database
export MB_DB_FILE=./test-metabase.db

# 3. Start Metabase
yarn dev

# 4. Complete initial setup in browser (create admin account)

# 5. Add fiscal calendar database (see setup-fiscal-calendar-db.sh instructions)

# 6. Create the question automatically
export METABASE_USERNAME=your-email@example.com
export METABASE_PASSWORD=your-password
./scripts/create-fiscal-calendar-question.sh

# 7. Test the Extended Date Picker!
```

### Testing on Different Metabase Versions

Each version gets its own Metabase app database, but shares the fiscal calendar database:

```bash
# Version 1: v0.56.9
export MB_DB_FILE=./test-mb-56.9.db
yarn dev
# Add fiscal calendar database once
# Create question once

# Version 2: v0.56.15
git checkout v0.56.15-custom
export MB_DB_FILE=./test-mb-56.15.db
yarn dev
# Add fiscal calendar database once (same path: ./fiscal-calendar.db)
# Create question once

# Version 3: v0.57.0
git checkout v0.57.0-custom
export MB_DB_FILE=./test-mb-57.0.db
yarn dev
# Add fiscal calendar database once
# Create question once
```

**Pro tip:** Add these to your shell aliases:

```bash
# ~/.bash_profile or ~/.zshrc
alias mb-dev-56.9='MB_DB_FILE=./test-mb-56.9.db yarn dev'
alias mb-dev-56.15='MB_DB_FILE=./test-mb-56.15.db yarn dev'
alias mb-dev-57.0='MB_DB_FILE=./test-mb-57.0.db yarn dev'
```

## File Structure

```
metabase-custom/
├── fiscal-calendar.db           # SQLite database (git-ignored)
├── test-mb-56.9.db              # Metabase app DB for v0.56.9 (git-ignored)
├── test-mb-56.15.db             # Metabase app DB for v0.56.15 (git-ignored)
├── test-mb-57.0.db              # Metabase app DB for v0.57.0 (git-ignored)
├── scripts/
│   ├── apply-extended-date-picker.sh          # Deploy feature
│   ├── setup-fiscal-calendar-db.sh            # Create fiscal DB
│   ├── create-fiscal-calendar-question.sh     # Create question via API
│   └── README.md                              # This file
└── CUSTOM_FEATURES.md                         # Feature documentation
```

## Troubleshooting

### "Database has been downgraded"

You tried to run an older Metabase version with a newer database schema.

**Solution:** Use separate app databases per version (see above).

### "CSV file not found"

Update the `CSV_PATH` variable in `setup-fiscal-calendar-db.sh` to point to your CSV location.

### "Could not find Fiscal Calendar database"

Make sure you added the SQLite database to Metabase first (Admin > Databases).

### Question not auto-discovered

1. Check the question has `[FISCAL_CALENDAR_SOURCE]` in its description
2. Clear browser cache: `localStorage.removeItem('metabase.fiscalCalendar.cardId')`
3. Check browser console for discovery logs

## See Also

- [CUSTOM_FEATURES.md](../CUSTOM_FEATURES.md) - Complete feature documentation
- [Extended Date Picker Component](../frontend/src/metabase/querying/filters/components/DatePicker/ExtendedDateFilterPicker/README.md) - Component documentation
