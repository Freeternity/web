require('dotenv').config();

// Destructive maintenance script: deletes old news documents in CouchDB.
// It runs incrementally in a loop (via setInterval) so it doesn't do massive sweeps.
//
// Targets documents where:
// - `normalized_timestamp` is older than GC_MONTHS months, OR
// - `timestamp` is older than GC_MONTHS months (legacy docs)
//
// Usage:
//   node src/garbageCollect.js

const GC_REQUEST_TIMEOUT_MS = parseInt(process.env.GC_REQUEST_TIMEOUT_MS || '45000', 10);

const NANO_URL =
  'http://' +
  process.env.admin_username +
  ':' +
  process.env.admin_password +
  '@localhost:5984';

// Configure a real HTTP/request timeout (not a Mango query "timeout" key).
const nano = require('nano')({
  url: NANO_URL,
  requestDefaults: { timeout: GC_REQUEST_TIMEOUT_MS },
});

const settings = require('../settings.js');

const newsDb = nano.use(settings.COUCHDB_PREFIX + 'news');

function monthsAgoIso(months) {
  const d = new Date();
  // Approximation: subtract months in calendar terms by adjusting date.
  // Example: March 31 - 1 month => February 28/29 (JS adjusts).
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

function parseIsoMs(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  return ms;
}

function isCouchTimeoutError(err) {
  const msg = (err && err.message ? err.message : '').toLowerCase();
  const reason = (err && err.reason ? String(err.reason) : '').toLowerCase();
  return msg.includes('reasonable amount of time') || reason === 'timeout' || msg.includes('timeout');
}

async function ensureIndex(fieldName, indexName) {
  try {
    await newsDb.createIndex({
      index: { fields: [fieldName] },
      name: indexName,
      type: 'json',
    });
    console.log(`Created/ensured Mango index: ${indexName}`);
  } catch (e) {
    // CouchDB returns errors if the index exists; keep going.
    // Also ignore "already exists" style failures.
    console.log(
      `Index create skipped/failed (continuing): ${e && e.message ? e.message : e}`
    );
  }
}

async function deleteOldDocsByField(fieldName, indexName, cutoffIso, batchSize, maxDocs) {
  let deleted = 0;
  const cutoffMs = parseIsoMs(cutoffIso);
  if (cutoffMs === null) return 0;

  while (deleted < maxDocs) {
    const remaining = maxDocs - deleted;
    const limit = Math.min(batchSize, remaining);

    const query = {
      selector: {
        [fieldName]: { $lt: cutoffIso },
      },
      limit,
      // Only need id/rev for deletion.
      fields: ['_id', '_rev', fieldName],
      use_index: indexName,
    };

    let result;
    try {
      result = await newsDb.find(query);
    } catch (err) {
      // If CouchDB is overloaded or the query is expensive, stop this field for now.
      // Next interval cycle will retry.
      const extra = isCouchTimeoutError(err) ? ' (timeout)' : '';
      console.error(
        `GC find failed for field=${fieldName} index=${indexName}${extra}:`,
        err && err.message ? err.message : err
      );
      break;
    }
    const docs = (result && result.docs) || [];

    if (!docs.length) break;

    // Delete sequentially to keep memory and load down.
    for (const doc of docs) {
      const ms = parseIsoMs(doc[fieldName]);
      // Final safety check.
      if (ms === null || ms >= cutoffMs) continue;
      await newsDb.destroy(doc._id, doc._rev);
      deleted += 1;
      if (deleted >= maxDocs) break;
    }
  }

  return deleted;
}

const GC_MONTHS = parseInt(process.env.GC_MONTHS || '9', 10);
const GC_INTERVAL_MS = parseInt(process.env.GC_INTERVAL_MS || String(60 * 60 * 1000), 10); // default 1h
const GC_BATCH_SIZE = parseInt(process.env.GC_BATCH_SIZE || '100', 10);
const GC_MAX_DOCS_PER_CYCLE = parseInt(process.env.GC_MAX_DOCS_PER_CYCLE || '300', 10);

let isRunning = false;
let indexesEnsured = false;

async function runGcCycle() {
  if (isRunning) return;
  isRunning = true;

  const cutoffIso = monthsAgoIso(GC_MONTHS);
  console.log(
    `GC cycle: deleting news older than ${GC_MONTHS} months (cutoff=${cutoffIso}). Max docs per cycle=${GC_MAX_DOCS_PER_CYCLE}`
  );

  try {
    if (!indexesEnsured) {
      await ensureIndex('normalized_timestamp', 'gc-normalized_timestamp');
      await ensureIndex('timestamp', 'gc-timestamp');
      indexesEnsured = true;
    }

    let remaining = GC_MAX_DOCS_PER_CYCLE;
    if (remaining > 0) {
      const deletedNorm = await deleteOldDocsByField(
        'normalized_timestamp',
        'gc-normalized_timestamp',
        cutoffIso,
        GC_BATCH_SIZE,
        remaining
      );
      remaining -= deletedNorm;
      console.log(
        `GC cycle: deleted ${deletedNorm} doc(s) using normalized_timestamp. Remaining=${remaining}`
      );
    }

    if (remaining > 0) {
      const deletedTs = await deleteOldDocsByField(
        'timestamp',
        'gc-timestamp',
        cutoffIso,
        GC_BATCH_SIZE,
        remaining
      );
      remaining -= deletedTs;
      console.log(`GC cycle: deleted ${deletedTs} doc(s) using timestamp. Remaining=${remaining}`);
    }

    console.log('GC cycle complete.');
  } catch (err) {
    console.error('GC cycle failed:', err && err.stack ? err.stack : err);
  } finally {
    isRunning = false;
  }
}

// Run immediately, then incrementally.
runGcCycle();
setInterval(runGcCycle, GC_INTERVAL_MS);

