const os = require('os');
const { JobRun } = require('../models/JobRun');
const { logger } = require('../utils/logger');

/**
 * Recording what the background jobs actually did (3.5 #11).
 *
 * See `models/JobRun.js` for why. This file is the wrapper every sweep goes
 * through, plus the two reads the console needs.
 *
 * ── The rule this file lives by ───────────────────────────────────────
 *
 * **Observability must not be able to break the thing it observes.** Every write
 * here is wrapped so that a failure to *record* a job can never fail the job. A
 * monitoring layer that takes down the system it monitors is worse than no
 * monitoring, because it converts a question you could not answer into an outage
 * you did not have. The consequence is accepted deliberately: if the database is
 * unreachable, the job still runs and the run is simply not recorded.
 */

/**
 * The jobs this system runs, and how often each is expected to.
 *
 * Declared centrally rather than discovered from what has run, because the whole
 * point is to notice a job that has **stopped** — and a job that never runs
 * never appears in a list built from its own history. A registry is what lets
 * the console say "reminders have not run for six hours" instead of saying
 * nothing at all.
 *
 * `staleAfterMs` is generous relative to the interval: a sweep that is a few
 * minutes late is normal, and an alert that fires on ordinary jitter is one
 * people learn to ignore.
 */
const JOBS = {
  'invoices.overdue': { label: 'Mark overdue invoices', intervalMs: 60 * 60 * 1000 },
  'quotations.expiry': { label: 'Expire old quotations', intervalMs: 60 * 60 * 1000 },
  'recurring.generate': { label: 'Generate recurring invoices', intervalMs: 60 * 60 * 1000 },
  'payment-links.expiry': { label: 'Expire payment links', intervalMs: 60 * 60 * 1000 },
  'recycle-bin.purge': { label: 'Purge the recycle bin', intervalMs: 60 * 60 * 1000 },
  'reminders.send': { label: 'Send payment reminders', intervalMs: 60 * 60 * 1000 },
  'billing.dunning': { label: 'Chase failed subscription payments', intervalMs: 60 * 60 * 1000 },
  'billing.scheduled-changes': { label: 'Apply scheduled plan downgrades', intervalMs: 60 * 60 * 1000 },
  'metrics.rollup': { label: 'Roll up platform metrics', intervalMs: 60 * 60 * 1000 }
};

/** Three missed ticks before a job is called late — enough that ordinary jitter
 *  and a slow deploy do not raise an alarm nobody should act on. */
const STALE_MULTIPLIER = 3;

/**
 * Runs a job, recording that it started, what it returned, and whether it threw.
 *
 * Returns whatever the job returned, and **re-throws nothing**: every existing
 * caller already treats a sweep failure as something to log and continue from,
 * and changing that here would alter behaviour under the guise of adding
 * observability. The failure is recorded and returned as `null`, which is what
 * the sweeps already do.
 */
async function run(name, fn) {
  const startedAt = new Date();
  let runId = null;

  try {
    const created = await JobRun.create({
      name,
      status: 'running',
      startedAt,
      host: os.hostname(),
      pid: process.pid
    });
    runId = created._id;
  } catch (error) {
    // Recording failed. The job still runs — see the rule at the top of this file.
    logger.warn('could not record job start', { job: name, err: error });
  }

  try {
    const result = await fn();
    await finish(runId, {
      status: 'succeeded',
      startedAt,
      // Only what is summarisable. A sweep that returns documents would put
      // whole records into this collection, which is neither useful nor small.
      result: summarise(result)
    });
    return result;
  } catch (error) {
    logger.error('job failed', { job: name, err: error });
    await finish(runId, {
      status: 'failed',
      startedAt,
      error: {
        message: String(error?.message || error),
        // Bounded: a stack is for orienting, and an unbounded one from a deep
        // async chain can be tens of kilobytes on a row that exists in the
        // thousands.
        stack: String(error?.stack || '').slice(0, 4000)
      }
    });
    return null;
  }
}

async function finish(runId, patch) {
  if (!runId) return;
  try {
    await JobRun.updateOne({ _id: runId }, {
      $set: {
        status: patch.status,
        finishedAt: new Date(),
        durationMs: Date.now() - patch.startedAt.getTime(),
        result: patch.result ?? null,
        'error.message': patch.error?.message ?? null,
        'error.stack': patch.error?.stack ?? null
      }
    });
  } catch (error) {
    logger.warn('could not record job finish', { err: error });
  }
}

/**
 * Reduces a job's return value to something worth storing.
 *
 * Counts and small scalars only. The sweeps mostly return exactly this already —
 * `{ scanned, sent, failed }` and the like — but `runRecurringSweep` nests one
 * level and a future job might return documents, and a job-run row is not the
 * place to discover that.
 */
function summarise(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return { value };
  if (Array.isArray(value)) return { count: value.length };

  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === undefined) continue;
    if (typeof entry === 'number' || typeof entry === 'boolean' || typeof entry === 'string') {
      out[key] = typeof entry === 'string' ? entry.slice(0, 200) : entry;
    } else if (Array.isArray(entry)) {
      out[key] = entry.length;
    } else if (typeof entry === 'object') {
      // One level of nesting, flattened. `runRecurringSweep` returns
      // `{ recurring: { generated, failed } }`, and losing that would hide the
      // only sweep that creates documents.
      for (const [innerKey, innerValue] of Object.entries(entry)) {
        if (typeof innerValue === 'number' || typeof innerValue === 'boolean') {
          out[`${key}.${innerKey}`] = innerValue;
        }
      }
    }
  }
  return Object.keys(out).length ? out : null;
}

/**
 * The health of every registered job.
 *
 * Built from the **registry**, not from what has run, so a job that has never
 * run once still appears — as `never`, which is the most important state this
 * whole feature exists to make visible and the one a history-driven list would
 * silently omit.
 */
async function summary() {
  const names = Object.keys(JOBS);
  const now = Date.now();

  const [latestRuns, latestSuccesses] = await Promise.all([
    Promise.all(names.map(name => JobRun.findOne({ name }).sort({ startedAt: -1 }).lean())),
    Promise.all(names.map(name => JobRun.findOne({ name, status: 'succeeded' }).sort({ startedAt: -1 }).lean()))
  ]);

  const jobs = names.map((name, index) => {
    const definition = JOBS[name];
    const last = latestRuns[index];
    const lastSuccess = latestSuccesses[index];
    const staleAfterMs = definition.intervalMs * STALE_MULTIPLIER;

    let state;
    if (!last) {
      state = 'never';
    } else if (last.status === 'running') {
      // A run still open past its own staleness window is not a long job, it is
      // a process that died holding it.
      state = now - new Date(last.startedAt).getTime() > staleAfterMs ? 'stuck' : 'running';
    } else if (now - new Date(lastSuccess?.startedAt || 0).getTime() > staleAfterMs) {
      // Late covers both "failing repeatedly" and "the timer stopped", which
      // from the outside are the same problem: the work is not getting done.
      state = 'late';
    } else {
      state = last.status === 'failed' ? 'failing' : 'healthy';
    }

    return {
      name,
      label: definition.label,
      intervalMs: definition.intervalMs,
      state,
      lastRunAt: last?.startedAt || null,
      lastStatus: last?.status || null,
      lastDurationMs: last?.durationMs ?? null,
      lastResult: last?.result || null,
      lastError: last?.error?.message || null,
      lastSuccessAt: lastSuccess?.startedAt || null,
      host: last?.host || null
    };
  });

  return {
    jobs,
    // The counts a console header needs, so it does not recompute them from the
    // list and disagree with it.
    unhealthy: jobs.filter(job => job.state !== 'healthy' && job.state !== 'running').length,
    checkedAt: new Date()
  };
}

/** Recent runs, newest first. One job when named, otherwise everything. */
async function history({ name, limit = 50 } = {}) {
  const filter = name ? { name } : {};
  return JobRun.find(filter).sort({ startedAt: -1 }).limit(Math.min(200, Number(limit) || 50)).lean();
}

module.exports = { run, summary, history, JOBS, summarise };
