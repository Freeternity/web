*** Add crontab ***

# crontab -e (as user freeternity)
@reboot /home/heavenvy/web/cron.start.sh

*** Chmod perms for ./web folder in local freeternity /home/freeternity/web dir ***

chmod +rxw ./web

This allows the node_modules folder to be created when installing via npm install

*** Install npm ***

npm install express-nunjucks nano nunjucks body-parser

*** This does not really do anything ***

root@calenvy:~# cp /usr/bin/node /home/freeternity/node
root@calenvy:~# cp /usr/bin/npm /home/freeternity/npm
root@calenvy:~# chown freeternity:freeternity /home/freeternity/node
root@calenvy:~# chown freeternity:freeternity /home/freeternity/npm

*** Add a user ***

useradd -m -d /home/freeternity freeternity

*** create logs folder with +w perms ***

mkdir logs
chmod +w logs

*** Install node and npm via nvm as root ***

Based on express-nunjucks

curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh -o install_nvm.sh
source ~/.profile
nvm install 8.9.4


```javascript
const express = require('express');
const expressNunjucks = require('express-nunjucks');
const app = express();
const isDev = app.get('env') === 'development';

app.set('views', __dirname + '/templates');

const njk = expressNunjucks(app, {
    watch: isDev,
    noCache: isDev
});

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(3000);
```

*** Development environment ***

1. Install Brackets editor with the livereload:
https://addons.mozilla.org/en-US/firefox/addon/livereload-web-extension/

2. Enable livereload on the side of brackets

3. launch "node ." after installing "npm install express express-nunjucks body-parser"

4. Open Firefox to localhost:3636 and activate "livereload" in Firefox

5. Changes auto refresh on saves in Brackets.

*** Waiver ***

The site is not a replacement for professional medical opinion, examination, diagnosis or treatment. Always seek the advice of your medical doctor or other qualified health professional before starting any new treatment or making any changes to existing treatment. Do not delay seeking or disregard medical advice based on information written by any author on this site. No health questions and information on Freeternity is regulated or evaluated by the Food and Drug Administration and therefore the information should not be used to diagnose, treat, cure or prevent any disease without the supervision of a medical doctor. Posts made to these forums express the views and opinions of the author, and not the administrators, moderators, or editorial staff and hence Freeternity and its principals will accept no liabilities or responsibilities for the statements made. Complete terms online at http://freeternity.com/waiver/
