module.exports = function(req, res, next) {
    const { username, password } = req.body;

    if (username === process.env.admin_username && password === process.env.admin_password) {
        req.session.data_logged_in = true;
        return next();
    }

    //res.status(401).send('Unauthorized');
};
