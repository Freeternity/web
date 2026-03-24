require('dotenv').config();
const nano = require('nano')('http://'+ process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984');
const settings = require('../settings.js');
const newsDb = nano.use(settings.COUCHDB_PREFIX + 'news');

const RUN_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
let isRunning = false;

function normalizeTimestamp(newsItem) {
    const candidates = [
        newsItem.normalized_timestamp,
        newsItem.timestamp,
        newsItem.publishedAt,
    ];

    for (const value of candidates) {
        if (!value) continue;
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    return null;
}

async function updateNewsTimestamps() {
    if (isRunning) {
        console.log('Timestamp normalization already in progress, skipping this cycle.');
        return;
    }
    isRunning = true;

    try {
        const body = await newsDb.list({ include_docs: true });
        const updatePromises = body.rows.map(async row => {
            const newsItem = row.doc;
            const normalized = normalizeTimestamp(newsItem);
            const needsUpdate =
                !newsItem.timestamp ||
                (!!normalized && (!newsItem.normalized_timestamp || newsItem.normalized_timestamp !== normalized));

            if (needsUpdate) {
                if (!newsItem.timestamp) {
                    newsItem.timestamp = normalized || new Date().toISOString();
                }
                if (normalized) {
                    newsItem.normalized_timestamp = normalized;
                }
                await newsDb.insert(newsItem);
                console.log(`Updated news item with ID: ${newsItem._id}`);
            }
        });

        await Promise.all(updatePromises);
        console.log('Timestamp normalization cycle completed.');
    } catch (error) {
        console.error('Error updating news timestamps:', error);
    } finally {
        isRunning = false;
    }
}

updateNewsTimestamps();
setInterval(updateNewsTimestamps, RUN_INTERVAL_MS);