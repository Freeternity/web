module.exports = function(req, res, next) {
    // Assuming you have a session or authentication mechanism to get the user
    // For example, using a session-based authentication
    if (req.session && req.session.user) {
        req.user = req.session.user;
    } else {
        reqconst express = require('express');
        const app = express();
        const userMiddleware = require('./middleware/userMiddleware');
        
        // Use the middleware
        app.use(userMiddleware);
        
        // Your existing routes and logic.user = { is_authenticated: false };
    }
    next();
};