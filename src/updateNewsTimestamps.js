require('dotenv').config();

const fs = require('fs');
const path = require('path');

const nano = require('nano')(
    'http://' + process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984'
);
const settings = require('../settings.js');
const newsDb = nano.use(settings.COUCHDB_PREFIX + 'news');

// Incremental mode: use CouchDB _changes so we only touch docs that changed since last run.
const RUN_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes (cheap no-op when nothing changes)
const CHECKPOINT_FILE = path.join(__dirname, '.news_timestamp_normalize_checkpoint.json');
let isRunning = false;

function loadCheckpoint() {
    try {
        const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && parsed.since !== undefined ? parsed.since : 0;
    } catch (e) {
        return 0;
    }
}

function saveCheckpoint(since) {
    try {
        fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ since }), 'utf8');
    } catch (e) {
        // Non-fatal: we can just reprocess a few recent changes next cycle.
        console.warn('Could not save timestamp normalization checkpoint:', e && e.message ? e.message : e);
    }
}

function parseIsoDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function computeNormalizedTime(newsItem) {
    // Prefer already-normalized if present.
    return (
        parseIsoDate(newsItem.normalized_timestamp) ||
        parseIsoDate(newsItem.timestamp) ||
        parseIsoDate(newsItem.publishedAt)
    );
}

async function normalizeChangedDocs() {
    if (isRunning) {
        console.log('Timestamp normalization already in progress; skipping this cycle.');
        return;
    }
    isRunning = true;

    const since = loadCheckpoint();

    try {
        // Fetch only changes since our last checkpoint.
        // include_docs:true lets us update docs directly without extra fetches.
        const changes = await newsDb.changes({
            since,
            include_docs: true,
            live: false,
            timeout: 30000,
            limit: 500,
        });

        const results = changes.results || [];
        let lastSeq = since;

        let updatedCount = 0;
        for (const change of results) {
            lastSeq = change.seq !== undefined ? change.seq : lastSeq;
            const doc = change.doc;
            if (!doc) continue;

            const normalized = computeNormalizedTime(doc);
            const shouldUpdate =
                // If normalized_timestamp is missing but we can compute it, update.
                (!doc.normalized_timestamp && normalized) ||
                // If normalized_timestamp exists but differs, update.
                (doc.normalized_timestamp && normalized && doc.normalized_timestamp !== normalized) ||
                // If timestamp is missing but we can compute from other fields, update timestamp.
                (!doc.timestamp && normalized);

            if (!shouldUpdate) continue;

            // Only mutate fields that actually need to be set.
            if (!doc.timestamp && normalized) doc.timestamp = normalized;
            if (normalized) doc.normalized_timestamp = normalized;

            await newsDb.insert(doc);
            updatedCount += 1;
        }

        saveCheckpoint(lastSeq);
        console.log(
            `Timestamp normalization: processed ${results.length} change(s), updated ${updatedCount} doc(s), since=${since} now=${lastSeq}`
        );
    } catch (error) {
        // Avoid killing the worker on transient CouchDB issues/timeouts.
        console.error('Error updating news timestamps (changes feed):', error && error.message ? error.message : error);
    } finally {
        isRunning = false;
    }
}

// Kick once, then run incrementally.
normalizeChangedDocs();
setInterval(normalizeChangedDocs, RUN_INTERVAL_MS);