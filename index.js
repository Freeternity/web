// express and nunjucks templating

require('dotenv').config();

const express = require('express');
const expressNunjucks = require('express-nunjucks');
const app = express();

const session = require('express-session');

app.use(session({
    secret: 'asfjdhag34474hifah347838939349jjks',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.secure_cookie } // Set to true if using HTTPS
}));

// https://stackoverflow.com/questions/5710358/how-to-retrieve-post-query-parameters/12008719#12008719
var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// dev environment
const isDev = app.get('env') === 'development';
const admin_username = process.env.admin_username;
const admin_password = process.env.admin_password;

// couchdb
var nano = require('nano')('http://'+ admin_username + ':' + admin_password + '@localhost:5984');

// settings var 
var settings = {};
settings.ALLOW_LOGIN = true;
settings.HTML_ONLY = true;
settings.DOMAIN = 'localhost';
settings.EMAIL = 'longevity@freeternity.com'
settings.COUCHDB_PREFIX = 'freeternity_';
settings.LOCAL = true;
settings.PORT = 3636;
settings.NAME = 'Freeternity';
settings.FAKE_INSERT = false;
module.exports = settings;

app.set('views', __dirname + '/views');
app.use('/static', express.static('public'))

const adminAuth = require('./middleware/adminAuth');

app.post('/admin/login', adminAuth, (req, res) => {
    res.send('Logged in successfully');
});

const requireLogin = require('./middleware/requireLogin');

const adminRoutes = require('./routes/adminRoutes');


const newsRoutes = require('./routes/newsRoutes');
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
nano.db.create(usersDbName, function(err) {
    if (err && err.statusCode !== 412) { // 412 indicates the database already exists
        console.error('Error creating users database:', err);
    }
});
var usersDb = nano.use(usersDbName);
var waivers = nano.db.create(settings.COUCHDB_PREFIX+'waivers');
var waivers = nano.use(settings.COUCHDB_PREFIX+'waivers');

/////////////////////////////////////////////////////////////////////////////////

// list of news or text boxes on the cover page
var eternities = nano.db.create(settings.COUCHDB_PREFIX+'eternities');
var eternities = nano.use(settings.COUCHDB_PREFIX+'eternities');

var eternities_each = [];

eternities.list(function(err, body) {
  if (!err) {
    console.log('hi eternities loop')
    body.rows.forEach(function(doc) {
        console.log(doc.id);
        eternities.get(doc.id, function(err,eternity) {
            eternities_each.push(eternity);
        });
    });
  } else {
      console.log("error", err);
  }
});

/////////////////////////////////////////////////////////////////////////////////


// comparisons of different eternities providers like calico labs
var comparisons = nano.db.create(settings.COUCHDB_PREFIX+'comparisons')
var comparisons = nano.use(settings.COUCHDB_PREFIX+'comparisons');
var comparisons_each = [];

comparisons.list(function(err, body) {
  if (!err) {
    console.log('hi comparisons loop')
    body.rows.forEach(function(doc) {
        console.log(doc.id);
        comparisons.get(doc.id, function(err,provider) {
            comparisons_each.push(provider);
        });
    });
  } else {
      console.log("error", err);
  }
});

/////////////////////////////////////////////////////////////////////////////////
//                      fake insert as a test
/////////////////////////////////////////////////////////////////////////////////

if (settings.LOCAL && settings.FAKE_INSERT) {
    eternities.insert({ title: "hi", message: "message", author: "author" }, function(err, body, header) {
      if (err) {
        console.log('[.insert] ', err.message);
      } else {
          console.log('you have added to the eternity.', body)
      }
    });
} //endif


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
            // If user not found, attempt to register
            usersDb.insert({ _id: username, username: username, password: password }, function(err, response) {
                if (err) {
                    return res.json({ success: false, message: 'Registration failed or user already exists' });
                }
                req.session.user = { username: username, isAdmin: false };
                return res.json({ success: true, message: 'Registration and login successful' });
            });
        } else if (user.password === password) {
            req.session.user = { username:username, isAdmin: false };
            return res.json({ success: true, message: 'User login successful' });
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
            res.json({ success: true, message: 'Registration successful' });
        });
    });
});
app.get('/', (req, res) => {
    res.render('waiver', {settings: settings, waiver: true});
});

app.post('/api/waiver/', (req, res) => {
    console.log('/api/waiver/: ' + req.body.signature);
        waivers.insert({ signature: req.body.signature, date: req.body.date }, function(err, body, header) {
          if (err) {
            console.log('[.insert] waivers error ', err.message);
          } else {
              console.log('you have added to the waivers.', body)
          }
        });
    res.send({status: 'waived'});
});

app.get('/news', (req, res) => {
    res.render('news', {
        eternities: eternities_each,
        settings: settings,
        waiver: false,
        request: req,
        user: req.session.user
    });
});

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

console.log('listening on port 36368');
app.listen(36368);

