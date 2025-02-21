require('dotenv').config();
const nano = require('nano')('http://' + process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984');
const settings = require('./settings.js');

const databases = [
    settings.COUCHDB_PREFIX + 'waivers',
    settings.COUCHDB_PREFIX + 'eternities',
    settings.COUCHDB_PREFIX + 'users',
    settings.COUCHDB_PREFIX + 'sessions',
    settings.COUCHDB_PREFIX + 'applications',
    settings.COUCHDB_PREFIX + 'news' // Add the news database
];

databases.forEach(dbName => {
    nano.db.create(dbName, (err) => {
        if (err) {
            console.log(`Error creating database ${dbName}:`, err.message);
        } else {
            console.log(`Database ${dbName} created successfully.`);
        }
    });
});

const newsDb = nano.db.use('freeternity_news');

async function createIndexes() {
    try {
        // Create an index on the 'title' field
        const titleIndexResponse = await newsDb.createIndex({
            index: {
                fields: ['title']
            },
            name: 'title-index',
            type: 'json'
        });
        console.log('Title index creation result:', titleIndexResponse);

        // Create an index on the 'timestamp' field
        const timestampIndexResponse = await newsDb.createIndex({
            index: {
                fields: ['timestamp']
            },
            name: 'timestamp-index',
            type: 'json'
        });
        console.log('Timestamp index creation result:', timestampIndexResponse);

        // Create an index on the '_id' field
        const idIndexResponse = await newsDb.createIndex({
            index: {
                fields: ['_id']
            },
            name: 'id-index',
            type: 'json'
        });
        console.log('ID index creation result:', idIndexResponse);

    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

createIndexes();
