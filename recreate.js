const nano = require('nano')('http://' + process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984');
const settings = require('./settings.js');

const databases = [
    settings.COUCHDB_PREFIX + 'waivers',
    settings.COUCHDB_PREFIX + 'eternities',
    settings.COUCHDB_PREFIX + 'users',
    settings.COUCHDB_PREFIX + 'sessions',
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
