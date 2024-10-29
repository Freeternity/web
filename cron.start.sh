#!/bin/bash

# Source the .bashrc file to load environment variables
source ~/.bashrc
source ~/.profile

# Set the environment variables
export NODE_ENV=production
export PORT=3000
export REDIS_URL=redis://localhost:6379
export admin_username=admin

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