#!/bin/bash

# Setup Fiscal Calendar Database
# Creates a SQLite database with fiscal calendar data from CSV

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/fiscal-calendar.db"
CSV_PATH="$HOME/Downloads/periods.csv"

echo "Setting up Fiscal Calendar Database..."
echo "Database path: $DB_PATH"
echo "CSV path: $CSV_PATH"
echo ""

# Check if CSV exists
if [ ! -f "$CSV_PATH" ]; then
    echo "Error: CSV file not found at $CSV_PATH"
    echo "Please update CSV_PATH in this script to point to your CSV file"
    exit 1
fi

# Remove existing database if it exists
if [ -f "$DB_PATH" ]; then
    echo "Removing existing database..."
    rm "$DB_PATH"
fi

# Create SQLite database and import CSV
echo "Creating SQLite database and importing CSV..."

sqlite3 "$DB_PATH" <<EOF
-- Import CSV directly with headers
.mode csv
.import '$CSV_PATH' fiscal_calendar

-- Create indexes for better performance
CREATE INDEX idx_year ON fiscal_calendar(YEAR);
CREATE INDEX idx_period ON fiscal_calendar(PERIOD);
CREATE INDEX idx_quarter ON fiscal_calendar(QUARTER);
CREATE INDEX idx_start_date ON fiscal_calendar(START_DATE);

-- Show row count
SELECT 'Imported ' || COUNT(*) || ' rows' FROM fiscal_calendar;

-- Show sample data
SELECT 'Sample data:';
SELECT * FROM fiscal_calendar LIMIT 5;
EOF

echo ""
echo "✓ Database created successfully at: $DB_PATH"
echo ""
echo "Next steps:"
echo "1. Start Metabase: yarn dev"
echo "2. Go to Admin > Databases > Add Database"
echo "3. Choose 'SQLite' as database type"
echo "4. Enter path: $DB_PATH"
echo "5. Save and sync"
echo "6. Create a question from fiscal_calendar table"
echo "7. Add [FISCAL_CALENDAR_SOURCE] to the question description"
echo ""
