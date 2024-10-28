const express = require('express');
const router = express.Router();

// Example admin route
router.get('/', (req, res) => {
    res.send('Welcome to the admin panel');
});

// Add more admin routes as needed

module.exports = router;