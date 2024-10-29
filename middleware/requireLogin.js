module.exports = function(req, res, next) {
    if (req.session.data_logged_in) {
        return next();
    }
    //res.status(401).send('Unauthorized');
};
