# Supervisor and Ops Configs

This folder contains operational configuration files for the `freeternity/web` deployment.

## Supervisor program configs

The `*.conf` files in this directory define Supervisor programs (processes) such as:

- the main web app (`freeternity.com.supervisor.conf`)
- background workers (for example `freeternity.com.supervisor.normalizeNewsTimestamps.conf`)
- load balancer helper (`freeternity.com.load_balance.conf`)
- incremental garbage collector (`freeternity.com.supervisor.garbageCollect.conf`)

How to enable:

1. Copy (or symlink) these files into your Supervisor include directory, typically:
   - `/etc/supervisor/conf.d/`
   - or whatever directory your `supervisord.conf` includes.
2. Restart Supervisor:
   - `sudo supervisorctl reread`
   - `sudo supervisorctl update`

## Log rotation

To prevent `/home/freeternity/logs/` from growing forever, use the `logrotate.conf` file in this directory.

How to enable:

1. Copy this file into your system logrotate include directory (commonly):
   - `/etc/logrotate.d/`
2. Verify with:
   - `sudo logrotate -d /etc/logrotate.d/<your-copied-file>`

