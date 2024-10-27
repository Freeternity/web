const nano = require('nano')('http://admin:freeternity45@localhost:5984');
const settings = require('./index.js');

const databases = [
    settings.COUCHDB_PREFIX + 'waivers',
    settings.COUCHDB_PREFIX + 'eternities',
<<<<<<< HEAD
    settings.COUCHDB_PREFIX + 'news' // Add the news database
=======
    settings.COUCHDB_PREFIX + 'comparisons'
>>>>>>> 40008df (recreate script created)
];

databases.forEach(dbName => {
    nano.db.create(dbName, (err) => {
        if (err) {
            console.log(`Error creating database ${dbName}:`, err.message);
        } else {
            console.log(`Database ${dbName} created successfully.`);
        }
    });
<<<<<<< HEAD
});
=======
});
>>>>>>> 40008df (recreate script created)
