const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * A versioned migration runner.
 *
 * Schema changes were ad-hoc one-off scripts (`seed/backfillOwnerId.js`) that
 * someone had to remember existed, remember to run, and remember whether they had
 * already run — with nothing recorded either way. That is fine exactly once and a
 * liability from the second change onwards: there was no way to tell what state a
 * given database was in, no way to bring a new environment up to date, and no way
 * to stop a backfill running twice.
 *
 * Design:
 *  - Migrations are files in this directory named `NNN-description.js`, applied in
 *    filename order. The numeric prefix *is* the version.
 *  - Each exports `{ description, up(db, session) }`. There is deliberately no
 *    `down`: a reversal that has never been tested is a false sense of safety, and
 *    the honest recovery path for a data migration is a restore from backup. A
 *    migration that needs to be undone gets a new forward migration.
 *  - Applied versions are recorded in a `migrations` collection, so a run is
 *    idempotent and `npm run migrate:status` can say exactly where a database is.
 *  - A lock document stops two instances migrating at once, which matters on a
 *    platform that starts several containers from the same image.
 */

const MIGRATIONS_DIR = __dirname;
const COLLECTION = 'migrations';
const LOCK_ID = 'migration-lock';
// A crashed process leaves its lock behind; after this it is considered stale
// rather than blocking every future deploy until someone clears it by hand.
const LOCK_TTL_MS = 10 * 60 * 1000;

function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(name => /^\d{3,}-.+\.js$/.test(name))
    .sort();
}

function loadMigration(file) {
  const migration = require(path.join(MIGRATIONS_DIR, file));
  if (typeof migration.up !== 'function') {
    throw new Error(`Migration ${file} does not export an \`up\` function.`);
  }
  return {
    version: file.split('-')[0],
    name: file,
    description: migration.description || '',
    up: migration.up
  };
}

function collection() {
  return mongoose.connection.db.collection(COLLECTION);
}

async function appliedVersions() {
  const rows = await collection().find({ _id: { $ne: LOCK_ID } }).toArray();
  return new Set(rows.map(row => row._id));
}

/**
 * Claims the lock, or reports who holds it.
 *
 * `insertOne` on a unique `_id` is the atomic primitive here — two processes
 * racing produce one success and one duplicate-key error, with no read-then-write
 * window.
 */
async function acquireLock() {
  const now = new Date();
  const stale = new Date(now.getTime() - LOCK_TTL_MS);
  await collection().deleteOne({ _id: LOCK_ID, acquiredAt: { $lt: stale } });
  try {
    await collection().insertOne({ _id: LOCK_ID, acquiredAt: now, pid: process.pid });
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

async function releaseLock() {
  await collection().deleteOne({ _id: LOCK_ID });
}

/**
 * Applies every migration that has not run yet.
 *
 * Each migration is recorded immediately after it succeeds, so an interrupted run
 * resumes from where it stopped rather than repeating completed work. Failure
 * stops the run: a later migration may assume an earlier one succeeded, and
 * pressing on would apply it to a shape it was not written for.
 */
async function migrate({ dryRun = false } = {}) {
  const applied = await appliedVersions();
  const pending = migrationFiles()
    .map(loadMigration)
    .filter(migration => !applied.has(migration.version));

  if (!pending.length) {
    logger.info('migrations: nothing to apply', { applied: applied.size });
    return { applied: [], alreadyApplied: applied.size };
  }

  if (dryRun) {
    logger.info('migrations: pending (dry run)', { pending: pending.map(m => m.name) });
    return { applied: [], pending: pending.map(m => m.name) };
  }

  if (!(await acquireLock())) {
    throw new Error('Another migration run holds the lock. Wait for it to finish, or clear the lock if a previous run crashed.');
  }

  const done = [];
  try {
    for (const migration of pending) {
      const startedAt = Date.now();
      logger.info('migrations: applying', { version: migration.version, name: migration.name });
      const result = await migration.up(mongoose.connection.db);
      const durationMs = Date.now() - startedAt;
      await collection().insertOne({
        _id: migration.version,
        name: migration.name,
        description: migration.description,
        appliedAt: new Date(),
        durationMs,
        result: result ?? null
      });
      logger.info('migrations: applied', { version: migration.version, durationMs, result });
      done.push(migration.name);
    }
  } finally {
    await releaseLock();
  }

  return { applied: done, alreadyApplied: applied.size };
}

async function status() {
  const applied = await appliedVersions();
  return migrationFiles().map(loadMigration).map(migration => ({
    version: migration.version,
    name: migration.name,
    description: migration.description,
    applied: applied.has(migration.version)
  }));
}

// CLI: `npm run migrate`, `npm run migrate:status`, `npm run migrate -- --dry-run`
if (require.main === module) {
  const args = process.argv.slice(2);
  const wantStatus = args.includes('status') || args.includes('--status');
  const dryRun = args.includes('--dry-run');

  connectDatabase()
    .then(async () => {
      if (wantStatus) {
        const rows = await status();
        if (!rows.length) {
          process.stdout.write('No migrations found.\n');
        }
        rows.forEach(row => {
          process.stdout.write(`${row.applied ? '[applied]' : '[pending]'} ${row.name}  ${row.description}\n`);
        });
      } else {
        const result = await migrate({ dryRun });
        process.stdout.write(`${result.applied.length} migration(s) applied.\n`);
      }
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(error => {
      logger.error('migrations failed', { err: error });
      process.exit(1);
    });
}

module.exports = { migrate, status, migrationFiles, loadMigration };
