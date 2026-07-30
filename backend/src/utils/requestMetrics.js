/**
 * In-process request statistics.
 *
 * The console's "live" panel wants requests per minute, error rate and p50/p95/p99
 * latency by route. A real answer to that is an APM with a metrics backend, which
 * this deployment does not have — but the honest alternative is not "no numbers",
 * it is *bounded, clearly-scoped* numbers: what this instance has served in the
 * last few minutes.
 *
 * Two properties matter for that to be safe to leave switched on:
 *
 *  - **Bounded memory.** A ring buffer per route, and a cap on how many distinct
 *    routes are tracked. A URL-shaped key space (`/invoices/:id`) is normalised to
 *    its route, so a scan of a thousand invoice ids does not become a thousand
 *    buckets.
 *  - **No I/O.** Recording a request is an array write. Nothing is persisted, and
 *    nothing is awaited.
 *
 * The trade-off is explicit and reported alongside the figures: these are per
 * instance and reset on restart. Anyone reading them needs to know that, so
 * `snapshot()` says so.
 */

/** How many recent samples to keep per route. Enough for a stable p95. */
const SAMPLES_PER_ROUTE = 200;
/** Distinct routes tracked before new ones are folded into `other`. */
const MAX_ROUTES = 80;
/** Requests kept for the rate/error-rate window. */
const RECENT_WINDOW = 2000;

const routes = new Map();
/** Timestamps and statuses of recent requests, for rpm and the error rate. */
const recent = [];
const startedAt = Date.now();

/**
 * Collapses the variable parts of a path so `/invoices/665f.../pdf` and
 * `/invoices/770a.../pdf` share a bucket. Without this the map is unbounded and
 * every percentile is computed over a single sample.
 */
function normalisePath(path) {
  return String(path || '')
    .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:n')
    .slice(0, 120);
}

function record({ method, path, status, durationMs }) {
  const key = `${method} ${normalisePath(path)}`;
  let bucket = routes.get(key);
  if (!bucket) {
    // Past the cap, everything new shares one bucket rather than growing the map.
    // A console that shows 80 routes plus "other" is useful; one that OOMs is not.
    if (routes.size >= MAX_ROUTES) {
      bucket = routes.get('other') || { count: 0, errors: 0, samples: [] };
      routes.set('other', bucket);
    } else {
      bucket = { count: 0, errors: 0, samples: [] };
      routes.set(key, bucket);
    }
  }
  bucket.count += 1;
  if (status >= 500) bucket.errors += 1;
  bucket.samples.push(durationMs);
  if (bucket.samples.length > SAMPLES_PER_ROUTE) bucket.samples.shift();

  recent.push({ at: Date.now(), status });
  if (recent.length > RECENT_WINDOW) recent.shift();
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(fraction * sorted.length));
  return Math.round(sorted[index] * 10) / 10;
}

function snapshot({ topRoutes = 12 } = {}) {
  const cutoff = Date.now() - 60 * 1000;
  const lastMinute = recent.filter(entry => entry.at >= cutoff);
  const errorsLastMinute = lastMinute.filter(entry => entry.status >= 500).length;

  const byRoute = [...routes.entries()].map(([route, bucket]) => {
    const sorted = [...bucket.samples].sort((a, b) => a - b);
    return {
      route,
      count: bucket.count,
      errors: bucket.errors,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99)
    };
  });

  const allSamples = byRoute.length
    ? [...routes.values()].flatMap(bucket => bucket.samples).sort((a, b) => a - b)
    : [];

  return {
    /** Stated explicitly: these figures describe one process, since it booted. */
    scope: 'this instance only, since boot',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    requestsPerMinute: lastMinute.length,
    errorRate: lastMinute.length ? Math.round((errorsLastMinute / lastMinute.length) * 1000) / 10 : 0,
    latency: { p50: percentile(allSamples, 0.5), p95: percentile(allSamples, 0.95), p99: percentile(allSamples, 0.99) },
    /** Slowest by p95, which is what a "what should I look at" list should rank by
     *  — a route that is usually fast and occasionally terrible is the interesting
     *  one, and a mean hides it. */
    slowestRoutes: byRoute.sort((a, b) => b.p95 - a.p95).slice(0, topRoutes),
    busiestRoutes: [...byRoute].sort((a, b) => b.count - a.count).slice(0, topRoutes)
  };
}

function reset() {
  routes.clear();
  recent.length = 0;
}

module.exports = { record, snapshot, reset, normalisePath };
