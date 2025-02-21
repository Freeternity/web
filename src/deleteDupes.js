require('dotenv').config();
const nano = require('nano')('http://' + process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984');
const newsDb = nano.db.use('freeternity_news');

async function removeDuplicateArticles() {
    console.log('Starting removeDuplicateArticles');

    try {
        // Fetch all articles from the database
        const allArticles = await newsDb.find({ selector: {}, fields: ['_id', '_rev', 'title'] });
        console.log('Total articles fetched:', allArticles.docs.length);

        // Create a map to track unique titles
        const uniqueTitles = new Map();

        // Identify duplicates
        const duplicates = [];
        for (const article of allArticles.docs) {
            // Normalize the title for comparison
            const normalizedTitle = article.title.trim().toLowerCase();

            if (uniqueTitles.has(normalizedTitle)) {
                duplicates.push(article);
            } else {
                uniqueTitles.set(normalizedTitle, article);
            }
        }

        console.log('Total duplicate articles found:', duplicates.length);

        // Delete duplicates
        const deletePromises = duplicates.map(duplicate => {
            return newsDb.destroy(duplicate._id, duplicate._rev);
        });

        await Promise.all(deletePromises);
        console.log('Duplicate articles removed successfully');
    } catch (error) {
        console.error('Error removing duplicate articles:', error);
    }
}

removeDuplicateArticles();