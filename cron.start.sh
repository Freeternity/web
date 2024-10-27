#!/bin/sh

if [ $(ps -e -o uid,cmd | grep $UID | grep node | grep -v grep | wc -l | tr -s "\n") -eq 0 ]
then
        export PATH=/usr/local/bin:$PATH
        node /home/freeternity/web/index.js >> /home/freeternity/logs/node.log 2>&1
fi

