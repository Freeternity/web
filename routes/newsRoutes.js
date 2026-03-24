const express = require('express');
const router = express.Router();
const { newsDb } = require('../dbConfig'); // Adjust the path as necessary

function parseNewsTimestamp(doc) {
    const candidates = [
        doc && doc.normalized_timestamp,
        doc && doc.timestamp,
        doc && doc.publishedAt,
    ];
    for (const value of candidates) {
        if (!value) continue;
        const ms = new Date(value).getTime();
        if (!Number.isNaN(ms)) return ms;
    }
    return 0;
}

function sortNewsByNovelty(news) {
    return news.sort((a, b) => {
        const tb = parseNewsTimestamp(b);
        const ta = parseNewsTimestamp(a);
        if (tb !== ta) return tb - ta;
        return String(b?._id || '').localeCompare(String(a?._id || ''));
    });
}

// Get all news
router.get('/', (req, res) => {
    newsDb.list({ include_docs: true }, (err, body) => {
        if (err) {
            console.log('Error retrieving news:', err.message);
            return res.status(500).send({ error: 'Error retrieving news' });
        }
        const news = sortNewsByNovelty(body.rows.map(row => row.doc));
        res.send(news);
    });
});
router.get('/news', (req, res) => {
    console.log('GET /news route hit'); // Add this line for logging
    newsDb.list({ include_docs: true }, (err, body) => {
        if (err) {
            console.log('Error retrieving news:', err.message);
            return res.status(500).send({ error: 'Error retrieving news' });
        }
        const news = sortNewsByNovelty(body.rows.map(row => row.doc));
        console.log('News items:', news); // Add this line for logging
        res.render('news.html', { news });
    });
});

// Post new news
router.post('/', (req, res) => {
    const { msg, username_posting, date_posted, pending } = req.body;
    newsDb.insert({ msg, username_posting, date_posted, pending }, (err, body) => {
        if (err) {
            console.log('Error publishing news:', err.message);
            return res.status(500).send({ error: 'Error publishing news' });
        }
        res.send({ success: 'News published successfully', id: body.id });
    });
});

// Update existing news
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { msg, username_posting, date_posted } = req.body;

    newsDb.get(id, (err, existingNews) => {
        if (err) {
            console.log('Error retrieving news:', err.message);
            return res.status(404).send({ error: 'News not found' });
        }

        const updatedNews = {
            ...existingNews,
            msg,
            username_posting,
            date_posted,
            pending
        };

        newsDb.insert(updatedNews, (err, body) => {
            if (err) {
                console.log('Error updating news:', err.message);
                return res.status(500).send({ error: 'Error updating news' });
            }
            res.send({ success: 'News updated successfully', id: body.id });
        });
    });
});

module.exports = router;