module.exports = function(req, res, next) {
    console.log('adminAuth middleware called');
    console.log('Session:', req.session);
    console.log('Body:', req.body);
    console.log('admin username:', process.env.admin_username);
    const { username, password } = req.body;

    if (username === process.env.admin_username && password === process.env.admin_password) {
        console.log('admin Authentication successful');
        req.session.data_logged_in = true;
        return next();
    }

    console.log('Authentication failed');

    //res.status(401).send('Unauthorized');
};
