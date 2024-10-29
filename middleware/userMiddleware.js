module.exports = function(req, res, next) {
    // Assuming you have a session or authentication mechanism to get the user
    // For example, using a session-based authentication
    if (req.session && req.session.user) {
        req.user = req.session.user;
    } else {
        req.user = { is_authenticated: false };
    }
    next();
};
