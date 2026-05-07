# Background Worker Fix — Final Verification & Deployment Guide

## ✅ Pre-Deployment Verification

Run these commands to verify all changes were applied correctly:

### Test 1: formatError function exists

```bash
cd bakal-application/backend
grep "function formatError" src/jobs/backgroundWorker.js
```

**Expected output:**
```
function formatError(err) {
```

**Status:** ✅ **VERIFIED**

---

### Test 2: All error logging uses formatError

```bash
grep "formatError(err)" src/jobs/backgroundWorker.js | wc -l
```

**Expected output:** `15` or more matches

**Status:** ✅ **VERIFIED**

---

### Test 3: Retry cap guard in processJob

```bash
grep -A2 "if (currentAttempts >= this.maxRetries)" src/jobs/backgroundWorker.js
```

**Expected output:**
```
if (currentAttempts >= this.maxRetries) {
  logger.warn(
    `[BackgroundWorker] Job ${job.id} has ${currentAttempts} attempts`
```

**Status:** ✅ **VERIFIED**

---

### Test 4: getPendingJobs filters by attempts

```bash
grep "lt('attempts'" src/repositories/jobQueue.js
```

**Expected output:**
```
.lt('attempts', maxRetries)               // CRITICAL FIX: exclude exhausted jobs
```

**Status:** ✅ **VERIFIED**

---

### Test 5: handleScrapeQuery uses _source

```bash
grep "_source: storeName" src/jobs/backgroundWorker.js
```

**Expected output:**
```
_source: storeName,
```

**Status:** ✅ **VERIFIED**

---

### Test 6: Non-existent columns stripped

```bash
grep "RUNTIME_FIELDS" src/repositories/productRepository.js
```

**Expected output:**
```
const RUNTIME_FIELDS = [
```

**Status:** ✅ **VERIFIED**

---

### Test 7: updateJob wrapped in try/catch

```bash
grep -B2 "CRITICAL — could not update job status" src/jobs/backgroundWorker.js
```

**Expected output:**
```
} catch (updateErr) {
  logger.error('[BackgroundWorker] CRITICAL — could not update job status: ' + formatError(updateErr));
}
```

**Status:** ✅ **VERIFIED**

---

### Test 8: Server error logging improved

```bash
grep "Critical startup error" src/server.js
```

**Expected output:**
```
logger.error('[BackgroundWorker] Critical startup error: ' + (err?.message || String(err)));
```

**Status:** ✅ **VERIFIED**

---

## 📋 Pre-Deployment Checklist

Complete this checklist before restarting the server:

### Code Changes
- [x] `formatError()` function added to backgroundWorker.js
- [x] All `logger.error()` calls in backgroundWorker.js updated to use `formatError(err)`
- [x] All `logger.error()` calls include stack trace logging
- [x] `processJob()` has retry cap guard at start
- [x] `processJob()` logs attempt number (e.g., "attempt 1/3")
- [x] `processJob()` wraps all `updateJob` calls in try/catch
- [x] `processJob()` implements exponential backoff for retries
- [x] `handleScrapeQuery()` validates `query_text` is not empty
- [x] `handleScrapeQuery()` uses `_source: storeName` (lowercase)
- [x] `handleScrapeQuery()` does NOT set `price_updated_at`, `stock_updated_at`, `rating_updated_at`
- [x] `handleScrapeQuery()` wraps per-product upsert in try/catch
- [x] `getPendingJobs()` filters by `.lt('attempts', maxRetries)`
- [x] `getPendingJobs()` filters by `next_run_at` time
- [x] Server startup logs full error + stack
- [x] `unhandledRejection` handler logs full error + stack
- [x] `result_data` field used instead of `data` for job results

### Database
- [ ] Migration script reviewed: `backend/BACKGROUND_JOBS_MIGRATION.sql`
- [ ] **NOT YET RUN** — will run after code review

### Documentation
- [x] Implementation summary created: `BACKGROUND_WORKER_FIX_IMPLEMENTATION.md`
- [x] Quick start guide created: `QUICK_START_BACKGROUND_WORKER_FIX.md`
- [x] Detailed changes documented: `DETAILED_CHANGES.md`
- [x] This verification guide created

---

## 🚀 Deployment Steps

### Step 1: Final Code Review

Review the three modified files:

1. **backgroundWorker.js** — Main changes
   ```bash
   git diff src/jobs/backgroundWorker.js | head -200
   ```

2. **jobQueue.js** — Retry filter
   ```bash
   git diff src/repositories/jobQueue.js
   ```

3. **productRepository.js** — Column stripping
   ```bash
   git diff src/repositories/productRepository.js | head -50
   ```

**Action:** ✅ Approve changes

---

### Step 2: Backup Current Job Data (Optional but Recommended)

If you want to preserve current job history before migration:

```sql
-- Backup to a separate table
CREATE TABLE background_jobs_backup_2026_04_28 AS 
SELECT * FROM background_jobs;
```

**Action:** ✅ Run in Supabase SQL Editor

---

### Step 3: Apply Database Migration

Open Supabase SQL Editor and run:

```sql
-- Add next_run_at for retry delay scheduling
ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

-- Add result_data for storing job output
ALTER TABLE public.background_jobs
  ADD COLUMN IF NOT EXISTS result_data jsonb;

-- Index for efficient polling
CREATE INDEX IF NOT EXISTS idx_background_jobs_poll
  ON public.background_jobs(status, attempts, next_run_at)
  WHERE status IN ('pending', 'retry');
```

**Expected output:**
```
Query executed successfully (took X ms)
```

**Troubleshooting:** If migration fails, see **Migration Troubleshooting** section below.

**Action:** ✅ Confirm migration succeeded

---

### Step 4: Stop Current Server

```bash
# If running in terminal:
# Ctrl+C

# If using PM2:
pm2 stop bakal-backend

# If using Docker:
docker-compose down
```

**Action:** ✅ Server stopped

---

### Step 5: Verify Code Was Deployed

Ensure the new code is in place:

```bash
# Check that the file has been updated
ls -la backend/src/jobs/backgroundWorker.js

# Verify modification time is recent
stat backend/src/jobs/backgroundWorker.js | grep Modify
```

**Action:** ✅ Code confirmed in place

---

### Step 6: Start Server with New Code

```bash
cd bakal-application/backend
npm start
```

**Expected output in logs:**
```
[INFO] 🚀 Bakàl backend running on port 3001 [production]
[INFO] [BackgroundWorker] Starting...
```

**Action:** ✅ Server started successfully

---

### Step 7: Monitor Logs for Previous Stuck Job

The job `e31b32ad-f53e-42e3-9cdc-ee0e24f79265` should now either:
1. ✅ Succeed with no error
2. ✅ Show a full, visible error message

Watch logs:
```bash
tail -f backend/logs/app.log | grep -E "e31b32ad|BackgroundWorker.*failed"
```

**Expected output (if error exists):**
```
[INFO]  [BackgroundWorker] Processing job e31b32ad... (scrape_query) attempt 1/3
[ERROR] [BackgroundWorker] Job e31b32ad... failed (attempt 1): [full error message here]
[ERROR] [BackgroundWorker] Job e31b32ad... stack: [stack trace here]
[INFO]  [BackgroundWorker] Job e31b32ad... scheduled for retry in 60s
```

**Action:** ✅ Wait 2-5 minutes, confirm job shows full error or succeeds

---

## 🔍 Post-Deployment Verification

### Check 1: Job Status Updated Correctly

```sql
SELECT 
  id,
  job_type,
  status,
  attempts,
  error_message,
  next_run_at,
  result_data
FROM background_jobs
WHERE id = 'e31b32ad-f53e-42e3-9cdc-ee0e24f79265';
```

**Expected output:**
- `status` = 'failed' OR 'retry' OR 'completed'
- `error_message` = NOT NULL and NOT empty
- `next_run_at` = NULL or future timestamp (if status='retry')
- `result_data` = NULL (if failed) or contains job output (if completed)

**Action:** ✅ Confirm status is populated

---

### Check 2: Retry Delays Are Being Respected

```sql
SELECT 
  id,
  status,
  attempts,
  next_run_at,
  created_at,
  updated_at
FROM background_jobs
WHERE status = 'retry'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected output:**
- `attempts` = 1, 2, or 3
- `next_run_at` = future timestamp (not NULL, not in past)

**Action:** ✅ Confirm retries are scheduled properly

---

### Check 3: New Jobs Are Being Processed

Enqueue a test job:

```javascript
// In Node REPL:
const jobQueue = require('./src/repositories/jobQueue');
const job = await jobQueue.enqueue({
  job_type: 'scrape_query',
  query_text: 'RTX 4090',
  priority: 1,
});
console.log('Test job created:', job.id);
```

Watch logs:
```bash
tail -f backend/logs/app.log | grep -E "Processing job|completed successfully"
```

**Expected output:**
```
[INFO] [BackgroundWorker] Processing job [test-job-id] (scrape_query) attempt 1/3
[INFO] [BackgroundWorker] Job [test-job-id] completed successfully
```

**Action:** ✅ Confirm test job processes and completes

---

## 🚨 Troubleshooting

### Problem: Migration Failed

**Error:** `relation 'background_jobs' does not exist`

**Solution:** Create the table first (see QUICK_START_BACKGROUND_WORKER_FIX.md)

---

### Problem: Logs Still Show Empty Errors

**Symptom:**
```
[ERROR] [BackgroundWorker] Job failed:
```

**Diagnosis:**
1. Check if the old code is still running:
   ```bash
   grep "formatError" backend/src/jobs/backgroundWorker.js
   ```
   Should show matches. If not, code wasn't deployed.

2. Check process is using new code:
   ```bash
   ps aux | grep node
   ```

**Solution:**
1. Stop server: `npm stop` (Ctrl+C)
2. Verify code was updated
3. Clear node cache: `rm -rf node_modules/.cache`
4. Start fresh: `npm start`

---

### Problem: Job Still Stuck in "retry" Forever

**Diagnosis:** Previous fix didn't work, or new code issue

**Solution:**
1. Wait 2 minutes for next poll cycle
2. If still stuck, manually mark as failed:
   ```sql
   UPDATE background_jobs 
   SET status = 'failed', 
       error_message = 'Manual: stuck job'
   WHERE id = 'e31b32ad...';
   ```
3. Create new test job to verify fix works
4. If test job fails too, we have a systemic issue to investigate

---

### Problem: Database Index Creation Failed

**Error:** `ERROR: syntax error in expression...`

**Solution:** 
1. Verify the SQL syntax is correct
2. Run the three ALTER/CREATE statements separately:
   ```sql
   ALTER TABLE public.background_jobs
     ADD COLUMN IF NOT EXISTS next_run_at timestamptz;
   
   -- Wait for success message
   
   ALTER TABLE public.background_jobs
     ADD COLUMN IF NOT EXISTS result_data jsonb;
   
   -- Wait for success message
   
   CREATE INDEX IF NOT EXISTS idx_background_jobs_poll
     ON public.background_jobs(status, attempts, next_run_at)
     WHERE status IN ('pending', 'retry');
   ```

---

## 📊 Expected Results

### Before Fix
```
[ERROR] [BackgroundWorker] Job e31b32ad... failed:        ← NO ERROR MESSAGE
[ERROR] [BackgroundWorker] Batch error:                   ← NO ERROR MESSAGE
Job reprocessed every 5 seconds forever
```

### After Fix
```
[INFO]  [BackgroundWorker] Processing job e31b32ad... (scrape_query) attempt 1/3
[ERROR] [BackgroundWorker] Job e31b32ad... failed (attempt 1): [FULL ERROR MESSAGE WITH DETAILS]
[ERROR] [BackgroundWorker] Job e31b32ad... stack: [COMPLETE STACK TRACE]
[INFO]  [BackgroundWorker] Job e31b32ad... scheduled for retry in 60s
[Wait 60 seconds]
[INFO]  [BackgroundWorker] Processing job e31b32ad... (scrape_query) attempt 2/3
[...either succeeds or shows different error...]
```

---

## ✨ Success Criteria

All of the following must be true:

1. ✅ Server starts without errors
2. ✅ BackgroundWorker initializes successfully
3. ✅ Previously-stuck job shows full error message (or completes)
4. ✅ Attempt count increments on retry (1/3, 2/3, 3/3)
5. ✅ Retry delays are respected (60s, 120s, 240s)
6. ✅ Job status in database is always updated correctly
7. ✅ New test jobs process successfully
8. ✅ Error messages are populated in database (not empty strings)
9. ✅ next_run_at is set for retry status jobs

---

## 📞 If Deployment Fails

1. **Stop the server immediately** — prevent cascading failures
2. **Check the logs:**
   ```bash
   tail -100 backend/logs/app.log
   ```
3. **Run the verification commands** above to identify which fix didn't apply
4. **Revert and try again:**
   ```bash
   git checkout backend/src/jobs/backgroundWorker.js
   git checkout backend/src/repositories/jobQueue.js
   ```

---

## 📝 Summary

| Step | Status | Time Est. |
|------|--------|-----------|
| Code Review | ⏳ Pending | 5 min |
| Database Migration | ⏳ Pending | 2 min |
| Server Restart | ⏳ Pending | 1 min |
| Error Diagnosis | ⏳ Pending | 5 min |
| Fix Root Cause | ⏳ Pending | 10-60 min |
| Verification | ⏳ Pending | 5 min |
| **TOTAL** | **⏳ READY** | **~30 min** |

---

**Status: All code changes applied and verified. Ready for deployment.**

**Next Action:** Apply database migration and restart server.
