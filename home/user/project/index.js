require('dotenv').config();

const express = require('express');
const app = express();

const requireLogin = require('./middleware/requireLogin');

app.use('/admin', requireLogin, adminRoutes);
// Other configurations and middleware