require('dotenv').config();

const fs = require('fs');
const https = require('https');

const key = fs.readFileSync('ssl/localhost-key.pem');
const cert = fs.readFileSync('ssl/localhost.pem');

const express = require('express');
const expressNunjucks = require('express-nunjucks');
const session = require('express-session');
connect = require('connect');
ConnectCouchDB = require('connect-couchdb')(session);
const userMiddleware = require('./middleware/userMiddleware');
// Add this near the top of your file with other requires
const sessionDebugMiddleware = require('./middleware/sessionDebugMiddleware');
var cookieSession = require('cookie-session');

const util = require('util');

const app = express();

//app.use(express.bodyParser());
//app.use(express.cookieParser());

console.log('Secure cookie:', process.env.secure_cookie);
console.log('Admin username set:', !!process.env.admin_username);
console.log('Admin password set:', !!process.env.admin_password);

var store = new ConnectCouchDB({
    // Name of the database you would like to use for sessions.
    name: 'freeternity_sessions',
  
    // Optional. Database connection details. See yacw documentation 
    // for more informations
    username: process.env.admin_username, 
    password: process.env.admin_password, 
    host: 'localhost',
  
    // Optional. How often expired sessions should be cleaned up.
    // Defaults to 600000 (10 minutes).
    reapInterval: 600000,
  
    // Optional. How often to run DB compaction against the session
    // database. Defaults to 300000 (5 minutes).
    // To disable compaction, set compactInterval to -1
    compactInterval: 300000,
  
    // Optional. How many time between two identical session store
    // Defaults to 60000 (1 minute)
    setThrottle: 60000,

    connectionListener: function(err) {
        if (err) {
            console.error('CouchDB session store connection error:', err);
        } else {
            console.log('CouchDB session store connected successfully');
        }
    }

  });
  var server = connect();
  server.use(session({secret: 'asdfadf788asf7as8f7d7', store: store }));

// Use the user middleware
app.use(userMiddleware);

console.log('secure cookie secure?', process.env.secure_cookie);

if (process.env.secure_cookie === "true") {
    // Code to execute if MY_FLAG is true

    app.set('trust proxy'); // trust first proxy
    secure_cookie = true;
    console.log("secure_cookie is true ", typeof(process.env.secure_cookie));
    
    /*app.use(cookieSession({
        name: 'session',
        keys: ['asdfhjkas43uii344uh34h43hsjddjjs', 'sdjkjk34784373478shhhjhsjsyu'],
        cookie: {
            secure: secure_cookie, // Ensure cookies are only sent over HTTPS
            httpOnly: false, // Prevent JavaScript access to cookies
            sameSite: 'lax', // Restrict cross-site cookie access
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          }

    }));*/

    console.log("secure_cookie is true ", typeof(process.env.secure_cookie));
    
    app.enable('trust proxy', 1);
    app.use(session({
        secret: 'asfjdhag34474hifah347838939349jjks489934sjkdjksdjkjksd',
        proxy: true,
        store: store,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: secure_cookie, httpOnly:false, maxAge: 24000000 * 60 * 60 * 1000, domain: '.freeternity.com' } // Set to true if using HTTPS secure: process.env.secure_cookie
    }));

  } else {
    // Code to execute if MY_FLAG is false
    console.log("secure_cookie is false ",  typeof(process.env.secure_cookie));
    secure_cookie = false;
    
    /*
    app.use(cookieSession({
        name: 'session',
        keys: ['safkafjfak3493474794734kskj', 'asdfjkf4773477ajksdjkf443943'],
        cookie: {
            secure: secure_cookie, // Ensure cookies are only sent over HTTPS
            httpOnly: false, // Prevent JavaScript access to cookies
            sameSite: 'lax', // Restrict cross-site cookie access
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          }
    }));*/
    
    app.use(session({
        secret: 'asfjdhag34474hifah347838939349jjks3489489sdkkskjj348993',
        store: store,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: secure_cookie } // Set to true if using HTTPS secure: process.env.secure_cookie
    }));
  }


// Add this after your session configuration
app.use(sessionDebugMiddleware);

// https://stackoverflow.com/questions/5710358/how-to-retrieve-post-query-parameters/12008719#12008719
var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// dev environment
const isDev = app.get('env') === 'development';
console.log("isDev:", isDev)
const admin_username = process.env.admin_username;
console.log("admin_username:", admin_username)
const admin_password = process.env.admin_password;
console.log("admin_password set:", !!admin_password)
// couchdb
var nano = require('nano')('http://'+ admin_username + ':' + admin_password + '@localhost:5984');

// settings var 
var settings = {};
settings.ALLOW_LOGIN = true;
settings.HTML_ONLY = true;
settings.DOMAIN = 'localhost';
settings.EMAIL = 'longevity@freeternity.com'
settings.COUCHDB_PREFIX = 'freeternity_';
settings.LOCAL = false;
settings.PORT = 3000;
settings.NAME = 'Freeternity';
settings.FAKE_INSERT = false;
module.exports = settings;

app.set('views', __dirname + '/views');
app.use('/static', express.static('static'))

const adminAuth = require('./middleware/adminAuth');

app.post('/admin/login', adminAuth, (req, res) => {
    res.send('Logged in successfully');
});

const requireLogin = require('./middleware/requireLogin');

const adminRoutes = require('./routes/adminRoutes');


const newsRoutes = require('./routes/newsRoutes');
const { request } = require('http');
app.use('/api/news', newsRoutes);

// Other configurations and middleware

app.use('/admin', requireLogin, adminRoutes);
// Other configurations and middleware

const njk = expressNunjucks(app, {
    watch: isDev,
    noCache: isDev 
});

// cover landing page with the waiver and signature requirement
// Create and use the users database
var usersDbName = settings.COUCHDB_PREFIX + 'users';

var usersDb = nano.use(usersDbName);
var waivers = nano.use(settings.COUCHDB_PREFIX+'waivers');

/////////////////////////////////////////////////////////////////////////////////

// list of news or text boxes on the cover page
var news = nano.use(settings.COUCHDB_PREFIX+'news');
var news_each = [];
/*news.list(function(err, body) {
  if (!err) {
    console.log('hi news loop')
    body.rows.forEach(function(doc) {
        news.get(doc.id, function(err,news_selected) {
            news_each.push(news_selected);
        });
    });
  } else {
      console.log("error", err);
  }
}); */

function fetchNewsWithPagination(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    console.log(`Fetching news with skip: ${skip}, limit: ${limit}`); // Log the skip and limit values

    news.list({ include_docs: true, skip: skip, limit: limit }, function(err, body) {
        if (!err) {
            console.log('hi news loop');
            news_each = []; // Clear the array before adding new items
            console.log(`Total news items fetched: ${body.rows.length}`); // Log the number of items fetched
            body.rows.forEach(function(doc) {
                news.get(doc.id, function(err, news_selected) {
                    if (!err) {
                        news_each.push(news_selected);
                    } else {
                        console.log("Error fetching news item:", err);
                    }
                });
            });
        } else {
            console.log("Error listing news:", err);
        }
    });
}
// Example usage: Fetch the first page with 10 items per page
fetchNewsWithPagination(1, 10);

// Remove this block
/*
news.list(function(err, body) {
  if (!err) {
    console.log('hi news loop')
    body.rows.forEach(function(doc) {
        news.get(doc.id, function(err,news_selected) {
            news_each.push(news_selected);
        });
    });
  } else {
      console.log("error", err);
  }
});
*/

// Keep your refreshNewsList function
function refreshNewsList() {
    news_each = [];
    news.list(function(err, body) {
        if (!err) {
            body.rows.forEach(function(doc) {
                news.get(doc.id, function(err, news_selected) {
                    if (!err && !news_selected.pending) {
                        news_each.push(news_selected);
                        //console.log('News item added:', news_selected); // Log each news item
                    }
                });
            });
        } else {
            console.log("Error refreshing news:", err);
        }
    });
}
// Call refreshNewsList when the server starts
//refreshNewsList();

var newsDb = nano.db.use(settings.COUCHDB_PREFIX+'news');
const viewAsync = util.promisify(newsDb.view).bind(newsDb);

async function createIndexTimestamp() {
    try {
        const response = await newsDb.createIndex({
            index: {
                fields: ['timestamp'] // Use a timestamp field for sorting
            },
            name: 'timestamp-index',
            type: 'json'
        });
        console.log('Index creation result for Timestamp:', response);
    } catch (error) {
        console.error('Error creating index Timestamp:', error);
    }
}

// Call the function to create the index
createIndexTimestamp();

async function createIndex() {
    try {
        const response = await newsDb.createIndex({
            index: {
                fields: ['_id']
            },
            name: 'id-index',
            type: 'json'
        });
        console.log('Index creation result:', response);
    } catch (error) {
        console.error('Error creating index:', error);
    }
}

// Call the function to create the index
createIndex();

async function fetchNewsItems(skip, limit) {
    try {
        const body = await newsDb.find({
            selector: {},
            sort: [{ "_id": "desc" }],
            skip: skip,
            limit: limit,
            use_index: 'id-index'
        });
        if (!body.docs) {
            console.error('No documents found in fetchNewsItems');
            return [];
        } else {
            console.log('News items fetched:', body.docs); // Add this line for logging
        }
        return body.docs;
    } catch (error) {
        console.error('Error in fetchNewsItems:', error);
        throw error;
    }
}

async function countNewsItems() {
    try {
        console.log('Attempting to count news items...');
        const body = await newsDb.info(); // Use the info method to get database information
        const totalDocs = body.doc_count; // Get the total document count
        console.log('Total news items:', totalDocs);
        return totalDocs;
    } catch (error) {
        console.error('Error in countNewsItems:', error);
        throw error;
    }
}

async function calculateTotalPages(itemsPerPage) {
    try {
        const totalItems = await countNewsItems();
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        console.log('Total pages:', totalPages);
        return totalPages;
    } catch (error) {
        console.error('Error in calculateTotalPages:', error);
        throw error;
    }
}

// Example usage
const totalPages = 1;
const itemsPerPage = 10; // Define how many items you want per page
calculateTotalPages(itemsPerPage).then(totalPages => {
    // Use totalPages in your application logic
    totalPages = totalPages;
});

// Modify the /news route
app.get('/news', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    try {
        const newsItems = await fetchNewsItems(skip, limit);
        const totalItems = await countNewsItems();
        const totalPages = Math.ceil(totalItems / limit);

        console.log('Rendering news page:', { newsItems, currentPage: page, totalPages }); // Add this line for logging

        res.render('news', {
            news_each: news_each,
            settings: settings,
            user: req.session.user,
            session: req.session,
            newsItems: newsItems,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        //res.status(500).send("Internal Server Error");
        next(error); // Pass the error to the error handling middleware

    }
});

// Add this to your news update routes (POST and PUT)
app.post('/api/news', (req, res) => {
    // Your existing code here
    // After successfully adding/updating news
    refreshNewsList();
    res.send({ success: 'News published successfully', id: body.id });
});

app.put('/api/news/:id', (req, res) => {
    // Your existing code here
    // After successfully updating news
    refreshNewsList();
    res.send({ success: 'News updated successfully', id: body.id });
});

/////////////////////////////////////////////////////////////////////////////////


// comparisons of different eternities providers like calico labs
var comparisons = nano.use(settings.COUCHDB_PREFIX+'comparisons');
var comparisons_each = [];

comparisons.list(function(err, body) {
  if (!err) {
    console.log('hi comparisons loop')
    body.rows.forEach(function(doc) {
        comparisons.get(doc.id, function(err,provider) {
            comparisons_each.push(provider);
        });
    });
  } else {
      console.log("error", err);
  }
});

/////////////////////////////////////////////////////////////////////////////////
// Add this route to handle logout requests
app.post('/api/accounts/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        return res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.post('/api/accounts/login', (req, res) => {
    const { username, password } = req.body;

    // Check if the user is logging in as an admin
    if (username === admin_username && password === admin_password) {
        req.session.user = { username: username, isAdmin: true };
        return res.json({ success: true, message: 'Admin login successful' });
    }

    // Check user credentials in CouchDB
    usersDb.get(username, function(err, user) {
        if (err) {
            // If user not found, return an error
            return res.json({ success: false, message: 'User not found' });
        }
        
        // Here you should implement proper password hashing and comparison
        // For this example, we're doing a simple comparison
        if (user.password === password) {
            req.session.user = { username: username, isAdmin: false };
            return res.json({ success: true, message: 'Login successful' });
        } else {
            return res.json({ success: false, message: 'Incorrect password' });
        }
    });
});

app.post('/api/accounts/register', (req, res) => {
    const { username, password } = req.body;

    // Check if the user already exists
    usersDb.get(username, function(err, user) {
        if (!err) {
            return res.json({ success: false, message: 'User already exists' });
        }

        // Register the new user
        usersDb.insert({ _id: username, username: username, password: password }, function(err, response) {
            if (err) {
                return res.json({ success: false, message: 'Registration failed' });
            }
            // Set the session for the new user
            req.session.user = { username: username, isAdmin: false };
            res.json({ success: true, message: 'Registration successful' });
        });
    });
});
app.get('/', (req, res) => {
    console.log('Hello, ' + (req.user.is_authenticated ? 'authenticated user' : 'guest'));
    res.render('waiver', {settings: settings, waiver: true, res: res});
});

app.post('/api/waiver/', (req, res) => {
    console.log('/api/waiver/: ' + req.body.signature);
        waivers.insert({ signature: req.body.signature, date: req.body.date, ip_address: req.ip }, function(err, body, header) {
          if (err) {
            console.log('[.insert] waivers error ', err.message);
          } else {
              console.log('you have added to the waivers.', body)
          }
        });
    res.send({status: 'waived'});
});

/*app.get('/news', (req, res) => {
    refreshNewsList();
    res.render('news', {
        news_each: news_each,
        settings: settings,
        waiver: false,
        request: req,
        user: req.session.user
    });
});*/

app.get('/compare', (req, res) => {
    res.render('compare', {
        comparisons: comparisons_each,
        settings: settings,
        waiver: false
    });
});

// the exclusion site
app.get('/yivwiy.html', (req, res) => {
    res.render('exclusion', {
        settings: settings,
        waiver: false
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack); // Log the error stack to the console
    res.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack // Include the stack trace in the response
    });
});

console.log('listening on port 3000');
//app.listen(3000);

const port = settings.PORT || 3000;

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Secure cookie:', process.env.secure_cookie);
    console.log('Admin username set:', !!process.env.admin_username);
    console.log('Admin password set:', !!process.env.admin_password);
});

/*https.createServer({ key, cert }, app).listen(3000, () => {
   console.log('Server listening on https://localhost:3000');
  });*/

