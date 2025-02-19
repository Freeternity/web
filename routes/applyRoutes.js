require('dotenv').config();

const express = require('express');
const router = express.Router();
const nano = require('nano')('http://' + process.env.admin_username + ':' + process.env.admin_password + '@localhost:5984');
const settings = require('../settings.js');
const http = require('http');


// Use the appropriate databases
const userDb = nano.use(settings.COUCHDB_PREFIX + 'users');
const applicationsDb = nano.use(settings.COUCHDB_PREFIX + 'applications');

// Handle application submission
router.post('/', async (req, res) => {
    console.log('POST /apply route hit'); // Add this line for logging
        const { username, password, email, social_security_number } = req.body;
        const ipAddress = req.ip;

        // Create a new application document
        const applicationDoc = {
            username,
            password,
            email,
            social_security_number,
            ip_address: ipAddress,
            created_at: new Date().toISOString()
        };
        console.log('Received application:', applicationDoc);

        // Insert the application document into the applications database
        const response = await applicationsDb.insert(applicationDoc);

        try {
            // Try to get the user document
            const userDoc = await userDb.get(username);

            // Verify the password
            if (userDoc.password !== password) {
                return res.status(400).json({ message: 'Incorrect password. Please choose a new username.' });
            }

            // Update the user's applied_id with the new application _id
            userDoc.applied_id = response.id;
            await userDb.insert(userDoc);

        } catch (err) {
            if (err.statusCode === 404) {
                // User does not exist, create a new user document
                const newUserDoc = {
                    _id: username,
                    username,
                    password,
                    email,
                    ip_address: ipAddress,
                    applied_id: response.id
                };
                console.log('Creating new user document:', newUserDoc);
                await userDb.insert(newUserDoc);
            } else {
                throw err;
            }
        }

        // Post to the external API
        const apiUrl = `http://livingforever.defense.gov/api/livingforever/?ssn=${social_security_number}&username=${username}&ip=${ipAddress}&email=${email}`;
        const url = new URL(apiUrl);
        console.log('Posting to external API:', url.href);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const apiReq = http.request(url, options, (apiRes) => {
            let data = '';

            apiRes.on('data', (chunk) => {
                data += chunk;
            });

            apiRes.on('end', () => {
                console.log('External API response data:', data);
                if (apiRes.statusCode === 200) {
                    console.log('Successfully posted to external API, 1');
                } else {
                    console.log('Error posting to external API:', apiRes.statusCode, data);
                }
            });
        });

        apiReq.on('error', (e) => {
            console.error('Error with request:', e.message);
        });

        apiReq.end(() => {
            console.log('Request ended');
        });
        console.log('Successfully posted to external API 3');
        // Respond to the client
        res.status(201).json({ message: 'Application submitted successfully', applicationId: response.id });
});

module.exports = router;