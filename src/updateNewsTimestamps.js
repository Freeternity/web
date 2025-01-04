require('dotenv').config();
const nano = require('nano')('http://'+ process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984');
const newsDb = nano.use('freeternity_news');

async function updateNewsTimestamps() {
    try {
        const body = await newsDb.list({ include_docs: true });
        const updatePromises = body.rows.map(async row => {
            const newsItem = row.doc;
            if (!newsItem.timestamp) {
                newsItem.timestamp = new Date().toISOString(); // Add current timestamp
                await newsDb.insert(newsItem);
                console.log(`Updated news item with ID: ${newsItem._id}`);
            }
        });

        await Promise.all(updatePromises);
        console.log('All news items updated with timestamps');
    } catch (error) {
        console.error('Error updating news timestamps:', error);
    }
}

updateNewsTimestamps();