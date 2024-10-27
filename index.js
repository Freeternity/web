// express and nunjucks templating
const express = require('express');
const expressNunjucks = require('express-nunjucks');
const app = express();

//react framework
const react = require('react');

// https://stackoverflow.com/questions/5710358/how-to-retrieve-post-query-parameters/12008719#12008719
var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// dev environment
const isDev = app.get('env') === 'development';

// couchdb
var nano = require('nano')('http://admin:freeternity45@localhost:5984');

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

const njk = expressNunjucks(app, {
    watch: isDev,
    noCache: isDev 
});

// cover landing page with the waiver and signature requirement
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
        waiver: false
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

