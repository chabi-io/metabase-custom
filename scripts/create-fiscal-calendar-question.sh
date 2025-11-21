#!/bin/bash

# Create Fiscal Calendar Question via Metabase API
# This script creates a saved question with [FISCAL_CALENDAR_SOURCE] marker

set -e

METABASE_URL="${METABASE_URL:-http://localhost:3000}"
METABASE_USERNAME="${METABASE_USERNAME:-admin@example.com}"
METABASE_PASSWORD="${METABASE_PASSWORD:-password}"

echo "Creating Fiscal Calendar Question..."
echo "Metabase URL: $METABASE_URL"
echo ""

# Login and get session token
echo "Logging in to Metabase..."
SESSION_TOKEN=$(curl -s -X POST \
  "$METABASE_URL/api/session" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$METABASE_USERNAME\",\"password\":\"$METABASE_PASSWORD\"}" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$SESSION_TOKEN" ]; then
    echo "Error: Failed to login. Check credentials and make sure Metabase is running."
    echo ""
    echo "Set environment variables:"
    echo "  export METABASE_URL=http://localhost:3000"
    echo "  export METABASE_USERNAME=your-email@example.com"
    echo "  export METABASE_PASSWORD=your-password"
    exit 1
fi

echo "✓ Logged in successfully"

# Get database ID for fiscal calendar database
echo "Finding Fiscal Calendar database..."
DB_ID=$(curl -s -X GET \
  "$METABASE_URL/api/database" \
  -H "X-Metabase-Session: $SESSION_TOKEN" \
  | python3 -c "import sys, json; dbs = json.load(sys.stdin)['data']; print(next((db['id'] for db in dbs if 'fiscal' in db['name'].lower()), ''))" 2>/dev/null)

if [ -z "$DB_ID" ]; then
    echo "Error: Could not find Fiscal Calendar database."
    echo "Please add the SQLite database first:"
    echo "  Admin > Databases > Add Database > SQLite"
    echo "  Name: Fiscal Calendar"
    echo "  Path: fiscal-calendar.db"
    exit 1
fi

echo "✓ Found database ID: $DB_ID"

# Get table ID
echo "Finding fiscal_calendar table..."
TABLE_ID=$(curl -s -X GET \
  "$METABASE_URL/api/database/$DB_ID/metadata" \
  -H "X-Metabase-Session: $SESSION_TOKEN" \
  | python3 -c "import sys, json; tables = json.load(sys.stdin)['tables']; print(next((t['id'] for t in tables if t['name'] == 'fiscal_calendar'), ''))" 2>/dev/null)

if [ -z "$TABLE_ID" ]; then
    echo "Error: Could not find fiscal_calendar table. Make sure database is synced."
    exit 1
fi

echo "✓ Found table ID: $TABLE_ID"

# Create or find "Fiscal Calendar" collection
echo "Finding or creating Fiscal Calendar collection..."
COLLECTION_ID=$(curl -s -X GET \
  "$METABASE_URL/api/collection" \
  -H "X-Metabase-Session: $SESSION_TOKEN" \
  | python3 -c "import sys, json; colls = json.load(sys.stdin); print(next((c['id'] for c in colls if c['name'] == 'Fiscal Calendar'), ''))" 2>/dev/null)

if [ -z "$COLLECTION_ID" ]; then
    echo "Creating Fiscal Calendar collection..."
    COLLECTION_ID=$(curl -s -X POST \
      "$METABASE_URL/api/collection" \
      -H "X-Metabase-Session: $SESSION_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name":"Fiscal Calendar","color":"#509EE3","description":"System queries for fiscal calendar data"}' \
      | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
    echo "✓ Created collection ID: $COLLECTION_ID"
else
    echo "✓ Found collection ID: $COLLECTION_ID"
fi

# Create the question
echo "Creating Fiscal Calendar Source question..."
QUESTION_RESPONSE=$(curl -s -X POST \
  "$METABASE_URL/api/card" \
  -H "X-Metabase-Session: $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Fiscal Calendar Source\",
    \"description\": \"[FISCAL_CALENDAR_SOURCE] Complete fiscal calendar data for the Extended Date Picker component.\",
    \"display\": \"table\",
    \"visualization_settings\": {},
    \"collection_id\": $COLLECTION_ID,
    \"dataset_query\": {
      \"type\": \"query\",
      \"database\": $DB_ID,
      \"query\": {
        \"source-table\": $TABLE_ID
      }
    }
  }")

QUESTION_ID=$(echo "$QUESTION_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -z "$QUESTION_ID" ]; then
    echo "Error: Failed to create question"
    echo "Response: $QUESTION_RESPONSE"
    exit 1
fi

echo ""
echo "✓ Successfully created Fiscal Calendar Source question!"
echo ""
echo "Question ID: $QUESTION_ID"
echo "Question URL: $METABASE_URL/question/$QUESTION_ID"
echo ""
echo "The question has been tagged with [FISCAL_CALENDAR_SOURCE]"
echo "The Extended Date Picker will automatically discover it!"
echo ""
