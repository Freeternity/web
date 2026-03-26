require('dotenv').config();

const { spawn } = require('child_process');

function parsePorts() {
  // WEB_PORTS="3000,3001,3002" preferred
  if (process.env.WEB_PORTS) {
    return process.env.WEB_PORTS
      .split(',')
      .map(s => parseInt(String(s).trim(), 10))
      .filter(n => Number.isFinite(n) && n > 0);
  }

  const start = parseInt(process.env.WEB_PORT_START || '3000', 10);
  const count = parseInt(process.env.WEB_PORT_COUNT || '1', 10);
  const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
  const safeStart = Number.isFinite(start) && start > 0 ? start : 3000;

  const ports = [];
  for (let i = 0; i < safeCount; i += 1) {
    ports.push(safeStart + i);
  }
  return ports;
}

const ports = parsePorts();
if (!ports.length) {
  // eslint-disable-next-line no-console
  console.error('No ports configured for load balancer startup.');
  process.exit(1);
}

// Launch one index.js per port. External LB (Nginx/HAProxy) should distribute traffic
// across these backends.
const workers = new Map(); // port -> child

function spawnForPort(port) {
  const env = {
    ...process.env,
    PORT: String(port),
    // If you later re-enable cluster.js, keep that logic out of per-port workers.
    WEB_CONCURRENCY: '1',
  };

  const child = spawn('node', ['index.js'], {
    env,
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  function prefixStream(stream, prefix) {
    stream.on('data', chunk => {
      process.stdout.write(`[${prefix}] ${chunk.toString()}`);
    });
  }

  prefixStream(child.stdout, `port:${port}`);
  prefixStream(child.stderr, `port:${port}`);

  child.on('exit', (code, signal) => {
    workers.delete(port);
    console.error(`[port:${port}] exited (code=${code}, signal=${signal}). Restarting in 1s...`);
    setTimeout(() => spawnForPort(port), 1000);
  });

  workers.set(port, child);
}

ports.forEach(spawnForPort);

console.log(`Load-balance launcher started. Backends: ${ports.join(', ')}`);

