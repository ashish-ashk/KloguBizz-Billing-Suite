const mongoose = require('mongoose');

/**
 * One execution of a background job (3.5 #11).
 *
 * Everything asynchronous in this product is a `setInterval` with a try/catch
 * that logs and moves on. That is fine until you have to answer a question about
 * it, and then it is nothing:
 *
 *   - *Did the reminder sweep run today?* Unanswerable without grepping logs on
 *     a host that may have been redeployed since.
 *   - *Did it fail?* The catch logs and returns; the next tick behaves as if
 *     nothing happened.
 *   - *Has it stopped running altogether?* **This is the one that matters.** A
 *     crashed timer, an unhandled rejection that killed the interval, a deploy
 *     that never called the start function — all of them look exactly like "no
 *     work to do". Silence is the failure mode, and silence is invisible.
 *
 * The plan offered two options: a `JobRun` collection, or BullMQ and Redis. This
 * is the first, deliberately. Retries and a dead-letter queue are real
 * capabilities that would matter *if* jobs were failing in ways a retry fixes —
 * and nobody knows whether they are, because nothing records it. Buying
 * infrastructure to solve a problem you cannot yet see is how you end up
 * operating Redis to run five cron sweeps. Making the sweeps observable is
 * cheap, needs no new infrastructure, and is what tells you whether the queue is
 * warranted.
 */
const jobRunSchema = new mongoose.Schema({
  /** The job's stable name, e.g. `reminders.send`. Not the function's name:
   *  renaming a function must not orphan its history. */
  name: { type: String, required: true, index: true },

  /**
   * `running` is written before the work starts, not after.
   *
   * Which means a process killed mid-job leaves a row stuck in `running`
   * forever — and that is the point. A missing row and a stuck row look
   * different, and the second one says "this died", which is exactly the fact
   * the old logging threw away. `staleAfterMs` below is how a reader tells a
   * long job from a dead one.
   */
  status: { type: String, enum: ['running', 'succeeded', 'failed'], required: true },

  startedAt: { type: Date, required: true },
  finishedAt: { type: Date, default: null },
  durationMs: { type: Number, default: null },

  /**
   * What the job did — the counts it already returns and currently only logs.
   *
   * `Mixed`, because each sweep reports a different shape and forcing them into
   * a common one would either lose detail or invent fields. This is a record of
   * what happened, not a queryable dimension.
   */
  result: { type: mongoose.Schema.Types.Mixed, default: null },

  /** Message and stack, kept apart so a list can show one without the other. */
  error: {
    message: { type: String, default: null },
    stack: { type: String, default: null }
  },

  /**
   * Which process ran it.
   *
   * Two instances both running the same sweep is not a bug here — the writes are
   * idempotent and the in-process guard only covers one process — but it doubles
   * the work and is worth being able to *see* rather than deduce from timing.
   */
  host: String,
  pid: Number
}, { timestamps: true });

/** The console's main query: latest runs of one job. */
jobRunSchema.index({ name: 1, startedAt: -1 });
/** "What ran recently", across jobs. */
jobRunSchema.index({ startedAt: -1 });

/**
 * Thirty days, expired by the database rather than by a sweep of our own.
 *
 * A job-run table is the definition of data that grows forever and is worth
 * almost nothing after a month: seven jobs on an hourly tick is ~5,000 rows a
 * month, and the questions it answers are all recent ones. Using a TTL index
 * rather than a purge job also avoids the obvious circularity of needing a
 * background job to clean up the record of background jobs.
 */
jobRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = { JobRun: mongoose.model('JobRun', jobRunSchema) };
