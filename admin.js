const express = require('express');
const bodyParser = require('body-parser');
const nano = require('nano')('http://'+ process.env.admin_username +':'+ process.env.admin_password +'@localhost:5984');
const settings = require('./index.js');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const newsDb = nano.use(settings.COUCHDB_PREFIX + 'news');

// Endpoint to retrieve all news articles
app.get('/admin/news', (req, res) => {
    newsDb.list({ include_docs: true }, (err, body) => {
        if (err) {
            console.log('Error retrieving news:', err.message);
            return res.status(500).send({ error: 'Error retrieving news' });
        }
        const news = body.rows.map(row => row.doc);
        res.send(news);
    });
});

// Endpoint to publish a new news article
app.post('/admin/news', (req, res) => {
    const { msg, username_posting, date_posted } = req.body;
    newsDb.insert({ msg, username_posting, date_posted }, (err, body) => {
        if (err) {
            console.log('Error publishing news:', err.message);
            return res.status(500).send({ error: 'Error publishing news' });
        }
        res.send({ success: 'News published successfully', id: body.id });
    });
});

// Endpoint to edit an existing news article
app.put('/admin/news/:id', (req, res) => {
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
            date_posted
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

// Endpoint to delete a news article
app.delete('/admin/news/:id', (req, res) => {
    const { id } = req.params;

    newsDb.get(id, (err, existingNews) => {
        if (err) {
            console.log('Error retrieving news:', err.message);
            return res.status(404).send({ error: 'News not found' });
        }

        newsDb.destroy(id, existingNews._rev, (err) => {
            if (err) {
                console.log('Error deleting news:', err.message);
                return res.status(500).send({ error: 'Error deleting news' });
            }
            res.send({ success: 'News deleted successfully' });
        });
    });
});

const PORT = 3637;
app.listen(PORT, () => {
    console.log(`Admin server running on port ${PORT}`);
});