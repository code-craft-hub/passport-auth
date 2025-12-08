#!/bin/bash

# BullMQ Enterprise Tutorial - Comprehensive Feature Testing Script
# This script tests all BullMQ features one by one

BASE_URL="http://localhost:3000/api"

echo "🧪 BullMQ Enterprise Tutorial - Feature Testing"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -e "${BLUE}Testing: ${name}${NC}"
    echo "Endpoint: ${method} ${endpoint}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -X GET "${BASE_URL}${endpoint}")
    elif [ "$method" = "DELETE" ]; then
        if [ -z "$data" ]; then
            response=$(curl -s -X DELETE "${BASE_URL}${endpoint}")
        else
            response=$(curl -s -X DELETE "${BASE_URL}${endpoint}" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        response=$(curl -s -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    echo "Response: $response"
    echo -e "${GREEN}✓ Complete${NC}"
    echo ""
    sleep 1
}

# =============================================
# 1. CONNECTION TESTING
# =============================================
echo "1️⃣  CONNECTION TESTING"
echo "-------------------------------------------"
test_endpoint "Test Redis Connection" "GET" "/connection/test"

# =============================================
# 2. QUEUE OPERATIONS
# =============================================
echo "2️⃣  QUEUE OPERATIONS"
echo "-------------------------------------------"

# Basic job addition
test_endpoint "Add Basic Job" "POST" "/queue/email-queue/add" \
'{
  "data": {
    "to": "user@example.com",
    "subject": "Test Email",
    "body": "This is a test email"
  }
}'

# Bulk job addition
test_endpoint "Add Bulk Jobs" "POST" "/queue/bulk-queue/add-bulk" \
'{
  "jobs": [
    {"name": "bulk-job-1", "data": {"items": ["item1", "item2", "item3"]}},
    {"name": "bulk-job-2", "data": {"items": ["item4", "item5", "item6"]}},
    {"name": "bulk-job-3", "data": {"items": ["item7", "item8", "item9"]}}
  ]
}'

# Auto-removal settings
test_endpoint "Add Job with Auto-removal" "POST" "/queue/email-queue/add-with-removal" \
'{
  "data": {"to": "test@example.com", "subject": "Auto-remove test"},
  "removeOnComplete": true,
  "removeOnFail": false
}'

# Rate-limited queue
test_endpoint "Add Rate-limited Job" "POST" "/queue/rate-limited/add" \
'{
  "data": {"message": "Rate limited job"},
  "max": 3,
  "duration": 10000
}'

# Queue metadata
test_endpoint "Set Queue Metadata" "POST" "/queue/email-queue/metadata" \
'{
  "metadata": {
    "description": "Email processing queue",
    "team": "Platform Team",
    "sla": "5 minutes"
  }
}'

test_endpoint "Get Queue Metadata" "GET" "/queue/email-queue/metadata"

# Queue stats
test_endpoint "Get Queue Stats" "GET" "/queue/email-queue/stats"

# Pause/Resume queue
test_endpoint "Pause Queue" "POST" "/queue/email-queue/pause"
test_endpoint "Resume Queue" "POST" "/queue/email-queue/resume"

# =============================================
# 3. JOB TYPES
# =============================================
echo "3️⃣  JOB TYPES"
echo "-------------------------------------------"

# FIFO Job
test_endpoint "Add FIFO Job" "POST" "/job/fifo" \
'{
  "data": {"message": "First In First Out job"}
}'

# LIFO Job
test_endpoint "Add LIFO Job" "POST" "/job/lifo" \
'{
  "data": {"message": "Last In First Out job"}
}'

# Custom Job ID
test_endpoint "Add Job with Custom ID" "POST" "/job/custom-id" \
'{
  "jobId": "custom-email-123",
  "data": {"to": "custom@example.com", "subject": "Custom ID test"}
}'

# Delayed Job
test_endpoint "Add Delayed Job" "POST" "/job/delayed" \
'{
  "data": {"message": "This job will process after 5 seconds"},
  "delay": 5000
}'

# Priority Jobs
test_endpoint "Add High Priority Job" "POST" "/job/priority" \
'{
  "data": {"task": "Critical task"},
  "priority": 1
}'

test_endpoint "Add Low Priority Job" "POST" "/job/priority" \
'{
  "data": {"task": "Regular task"},
  "priority": 10
}'

# Deduplicated Jobs
test_endpoint "Add Deduplicated Job (1st attempt)" "POST" "/job/deduplicate" \
'{
  "jobId": "dedup-12345",
  "data": {"message": "This job will be deduplicated"}
}'

test_endpoint "Add Deduplicated Job (2nd attempt - should be ignored)" "POST" "/job/deduplicate" \
'{
  "jobId": "dedup-12345",
  "data": {"message": "This is a duplicate"}
}'

# =============================================
# 4. REPEATABLE JOBS
# =============================================
echo "4️⃣  REPEATABLE JOBS"
echo "-------------------------------------------"

# Cron pattern
test_endpoint "Add Repeatable Job (Cron)" "POST" "/job/repeatable/cron" \
'{
  "data": {"reportType": "daily-summary"},
  "pattern": "*/2 * * * *",
  "jobId": "daily-report-cron"
}'

# Interval
test_endpoint "Add Repeatable Job (Interval)" "POST" "/job/repeatable/interval" \
'{
  "data": {"task": "health-check"},
  "every": 30000,
  "jobId": "health-check-interval"
}'

# Get repeatable jobs
test_endpoint "Get Repeatable Jobs" "GET" "/job/repeatable/scheduled-queue"

# =============================================
# 5. JOB GETTERS
# =============================================
echo "5️⃣  JOB GETTERS"
echo "-------------------------------------------"

# Get waiting jobs
test_endpoint "Get Waiting Jobs" "GET" "/jobs/email-queue/waiting?start=0&end=10"

# Get active jobs
test_endpoint "Get Active Jobs" "GET" "/jobs/email-queue/active?start=0&end=10"

# Get completed jobs
test_endpoint "Get Completed Jobs" "GET" "/jobs/email-queue/completed?start=0&end=10"

# Get job counts
test_endpoint "Get Job Counts" "GET" "/jobs/email-queue/counts"

# =============================================
# 6. WORKER OPERATIONS
# =============================================
echo "6️⃣  WORKER OPERATIONS"
echo "-------------------------------------------"

test_endpoint "Pause Worker" "POST" "/worker/email-queue/pause"
sleep 2
test_endpoint "Resume Worker" "POST" "/worker/email-queue/resume"

# =============================================
# 7. JOB SCHEDULERS
# =============================================
echo "7️⃣  JOB SCHEDULERS"
echo "-------------------------------------------"

test_endpoint "Create Scheduler" "POST" "/scheduler/email-queue/create" \
'{
  "maxStalledCount": 3,
  "stalledInterval": 30000
}'

test_endpoint "Get All Schedulers" "GET" "/schedulers"

test_endpoint "Get Cron Examples" "GET" "/scheduler/cron-examples"

# Scheduler repeat strategies
test_endpoint "Add Cron Scheduled Job" "POST" "/scheduler/repeat/cron" \
'{
  "queueName": "scheduled-queue",
  "data": {"reportType": "weekly-report"},
  "pattern": "0 9 * * 1"
}'

test_endpoint "Add Interval Scheduled Job" "POST" "/scheduler/repeat/interval" \
'{
  "queueName": "scheduled-queue",
  "data": {"task": "cleanup"},
  "every": 60000,
  "limit": 10
}'

test_endpoint "Get Repeatable Jobs in Scheduled Queue" "GET" "/scheduler/scheduled-queue/repeatable-jobs"

# =============================================
# 8. QUEUE CLEANING
# =============================================
echo "8️⃣  QUEUE CLEANING OPERATIONS"
echo "-------------------------------------------"

test_endpoint "Clean Completed Jobs" "POST" "/queue/email-queue/clean" \
'{
  "grace": 1000,
  "limit": 100,
  "type": "completed"
}'

test_endpoint "Drain Queue" "POST" "/queue/email-queue/drain" \
'{
  "delayed": false
}'

# =============================================
# FINAL SUMMARY
# =============================================
echo ""
echo "================================================"
echo -e "${GREEN}✅ All feature tests completed!${NC}"
echo ""
echo "Next Steps:"
echo "1. Check the console output of your Node.js server"
echo "2. Monitor job processing in real-time"
echo "3. Test in production with your actual use cases"
echo ""
echo "For more details, check the API documentation:"
echo "- Queues: http://localhost:3000/api/docs/queues"
echo "- Jobs: http://localhost:3000/api/docs/jobs"
echo "- Workers: http://localhost:3000/api/docs/workers"
echo "- Schedulers: http://localhost:3000/api/docs/schedulers"
echo "================================================"