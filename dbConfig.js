const nano = require('nano')('http://'+process.env.admin_username+':'+process.env.admin_password+'@localhost:5984'); // Adjust the URL as necessary
const settings = require('./index.js'); // Assuming settings are exported from index.js

// Initialize the news database using the COUCHDB_PREFIX
const newsDb = nano.db.use(settings.COUCHDB_PREFIX + 'news');

module.exports = {
    newsDb
};