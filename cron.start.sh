#!/bin/bash

# Source the .bashrc file to load environment variables
source ~/.bashrc

# Change to the application directory
cd /home/freeternity/web

# Create logs directory if it doesn't exist
mkdir -p ~/logs

# Start the application and log output
node index.js >> ~/logs/node.log 2>&1

/home/freeternity/logs/node.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 freeternity freeternity
}