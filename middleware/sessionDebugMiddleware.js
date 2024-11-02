const session = require('express-session');

module.exports = function(req, res, next) {
    console.log('--- Session Debug Middleware ---');
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);
    console.log('Cookie Header:', req.headers.cookie);
    
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    
    if (req.session) {
        console.log('Session exists');
        console.log('Session user:', req.session.user);
        console.log('Session cookie:', req.session.cookie);
        
        // Log when the session was created
        if (req.session.cookie && req.session.cookie.originalMaxAge) {
            console.log('Session created:', new Date(Date.now() - req.session.cookie.originalMaxAge));
        }
        
        // Log when the session will expire
        if (req.session.cookie && req.session.cookie.expires) {
            console.log('Session expires:', req.session.cookie.expires);
        }
    } else {
        console.log('No session exists');
    }
    
    // Log any changes to the session after the response
    res.on('finish', () => {
        console.log('--- After Response ---');
        console.log('Session after request:', req.session);
        console.log('Session ID after request:', req.sessionID);
    });

    next();
};