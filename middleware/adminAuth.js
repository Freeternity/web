module.exports = function(req, res, next) {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.data_logged_in = true;
        return next();
    }

    res.status(401).send('Unauthorized');
};
