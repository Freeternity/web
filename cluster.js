require('dotenv').config();

const cluster = require('cluster');
const os = require('os');

const cpuCount = os.cpus().length;
const configuredWorkers = parseInt(process.env.WEB_CONCURRENCY || '', 10);
// Safe default: 1 worker unless WEB_CONCURRENCY is explicitly provided.
// This avoids platform-specific EADDRINUSE loops in local/dev shells.
const fallbackWorkers = 1;
const workerCount = Number.isFinite(configuredWorkers) && configuredWorkers > 0
    ? configuredWorkers
    : fallbackWorkers;

if (cluster.isPrimary) {
    console.log(`[cluster] Primary PID ${process.pid} starting ${workerCount} worker(s)`);

    for (let i = 0; i < workerCount; i += 1) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.error(
            `[cluster] Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Restarting...`
        );
        setTimeout(() => cluster.fork(), 1000);
    });
} else {
    console.log(`[cluster] Worker PID ${process.pid} booting app`);
    require('./index.js');
}

