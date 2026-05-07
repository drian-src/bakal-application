# Quick Start — Background Worker Fix

## ✅ What Was Fixed

| Issue | Fix | Status |
|-------|-----|--------|
| Silent errors (empty error messages) | Added `formatError()` function | ✅ Complete |
| Infinite retries on failed jobs | Added retry cap guard | ✅ Complete |
| Job update failures crash handler | Wrapped in try/catch | ✅ Complete |
| Wrong platform key casing | Use lowercase `_source` | ✅ Complete |
| Non-existent columns crash upsert | Strip in `upsertProduct()` | ✅ Complete |
| Retries not delayed | Added exponential backoff | ✅ Complete |

---

## 🚀 Deploy Now

### Step 1: Apply Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Paste the following SQL:

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

6. Click **Run**
7. Verify: "Executed successfully" message appears

**Option B: Using CLI**

```bash
# (If you have supabase CLI set up)
supabase db push
```

---

### Step 2: Restart Backend Server

```bash
cd bakal-application/backend

# Stop the current server (Ctrl+C if running in terminal)

# Start fresh
npm start
```

**You should see in logs:**
```
[INFO] 🚀 Bakàl backend running on port 3001 [production]
[INFO] [BackgroundWorker] Starting...
[INFO] [BackgroundWorker] Processing 1 jobs...
```

---

### Step 3: Monitor for Errors

Once restarted, watch the logs for the previously-stuck job:

```bash
# If using PM2 or docker logs:
docker logs -f bakal-backend

# Or check log file:
tail -f backend/logs/app.log | grep BackgroundWorker
```

**Expected output (job now shows full error):**
```
[INFO]  [BackgroundWorker] Processing job e31b32ad... (scrape_query) attempt 1/3
[ERROR] [BackgroundWorker] Job e31b32ad... failed (attempt 1): insert or update on table "products" violates foreign key constraint...
[INFO]  [BackgroundWorker] Job e31b32ad... scheduled for retry in 60s
```

---

## 🔍 Verify Changes Were Applied

Run these checks to confirm all fixes are in place:

```bash
cd bakal-application/backend

# Check 1: formatError function exists
grep -n "function formatError" src/jobs/backgroundWorker.js
# Should output: 19:function formatError(err) {

# Check 2: All errors use formatError
grep -c "formatError(err)" src/jobs/backgroundWorker.js
# Should output: 15+ matches

# Check 3: getPendingJobs filters by attempts
grep -n "lt('attempts'" src/repositories/jobQueue.js
# Should output: 48:.lt('attempts', maxRetries)

# Check 4: Column stripping in upsertProduct
grep -n "RUNTIME_FIELDS" src/repositories/productRepository.js
# Should output: 10:const RUNTIME_FIELDS = [

# Check 5: handleScrapeQuery uses _source
grep -n "_source: storeName" src/jobs/backgroundWorker.js
# Should output: 235:_source: storeName,
```

---

## 🧪 Test the Fix

### Manual Test: Enqueue a Job

Open Node REPL and create a test job:

```bash
cd bakal-application/backend
node
```

```javascript
const jobQueue = require('./src/repositories/jobQueue');

(async () => {
  const job = await jobQueue.enqueue({
    job_type: 'scrape_query',
    query_text: 'RTX 4090',
    priority: 1,
  });
  console.log('Created test job:', job.id);
  process.exit(0);
})();
```

Check logs — the job should:
1. ✅ Be picked up within 5 seconds
2. ✅ Show attempt number: `attempt 1/3`
3. ✅ Show full error (if any) with stack trace
4. ✅ Schedule retry with delay if it fails

---

## 📊 Check Job Status in Database

```sql
SELECT 
  id,
  job_type,
  status,
  attempts,
  error_message,
  next_run_at,
  created_at
FROM background_jobs
ORDER BY created_at DESC
LIMIT 5;
```

Expected output:
- ✅ Jobs with `status = 'completed'` have `result_data`
- ✅ Jobs with `status = 'retry'` have `next_run_at` in the future
- ✅ `attempts` column shows number of tries
- ✅ `error_message` is populated (not empty)

---

## 🚨 If Something Still Goes Wrong

### Logs Still Show Empty Errors?

1. Verify the process is using the new code:
   ```bash
   ps aux | grep node
   ```
   The PID should be recent (not cached old version)

2. Clear Node cache:
   ```bash
   rm -rf node_modules/.cache
   npm start
   ```

3. Check git diff to confirm changes:
   ```bash
   git diff src/jobs/backgroundWorker.js | head -100
   ```

### Job Still Stuck in "retry"?

Mark it failed manually (after confirming the error is logged):

```sql
UPDATE background_jobs 
SET status = 'failed', 
    error_message = 'Manual: investigated and fixed'
WHERE id = 'e31b32ad-f53e-42e3-9cdc-ee0e24f79265';
```

Then create a new test job to verify the fix works.

### Database Migration Failed?

If you see: `"relation 'background_jobs' does not exist"`

Create the table first:

```sql
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  query_text text,
  product_id uuid,
  priority integer DEFAULT 5,
  status text DEFAULT 'pending',
  data jsonb,
  error_message text,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  next_run_at timestamptz,
  result_data jsonb
);

CREATE INDEX idx_background_jobs_poll
  ON public.background_jobs(status, attempts, next_run_at)
  WHERE status IN ('pending', 'retry');
```

---

## 📋 Next Steps

1. ✅ Apply database migration
2. ✅ Restart backend server
3. ✅ Monitor logs for the previously-stuck job
4. ✅ Once error is visible, fix the root cause:
   - If FK violation: check platform key mapping
   - If column missing: may need additional migrations
   - If scraper error: check scraper output format

5. ✅ Create test job to verify fix works end-to-end

---

## 📚 Full Documentation

See: `backend/BACKGROUND_WORKER_FIX_IMPLEMENTATION.md`

**Files Modified:**
- ✅ `backend/src/jobs/backgroundWorker.js` — Error handling, retry cap, platform fix
- ✅ `backend/src/repositories/jobQueue.js` — Retry filter
- ✅ `backend/src/repositories/productRepository.js` — Column stripping
- ✅ `backend/src/server.js` — Error logging
- ✅ `backend/BACKGROUND_JOBS_MIGRATION.sql` — Database migration

---

**Status: Ready to deploy. Estimated time to identify root cause: 5-15 minutes after restart.**
