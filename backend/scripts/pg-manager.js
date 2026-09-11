const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PG_BIN_DIR = process.env.PG_BIN_DIR || 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PGDATA_DIR = path.resolve(__dirname, '..', 'pgdata');
const PG_PORT = parseInt(process.env.PG_PORT || '5433', 10);
const DB_NAME = 'seqa_db';
const LOG_FILE = path.resolve(__dirname, '..', 'pg_server.log');

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function getBin(name) {
  const exePath = path.join(PG_BIN_DIR, `${name}.exe`);
  if (fs.existsSync(exePath)) return exePath;
  return name;
}

function cleanStalePid() {
  const pidFile = path.join(PGDATA_DIR, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').split('\n')[0].trim(), 10);
      try {
        process.kill(pid, 0); // Check if alive
        // Process is alive
      } catch {
        // Not alive, stale pid
        console.log(`[PG Manager] Removing stale postmaster.pid (PID: ${pid})`);
        fs.unlinkSync(pidFile);
      }
    } catch {
      fs.unlinkSync(pidFile);
    }
  }
}

async function startPg() {
  const isOpen = await isPortOpen(PG_PORT);
  if (isOpen) {
    console.log(`[PG Manager] PostgreSQL is already listening on port ${PG_PORT}`);
    await ensureDbExists();
    return;
  }

  cleanStalePid();

  // Ensure pgdata is initialized
  if (!fs.existsSync(path.join(PGDATA_DIR, 'PG_VERSION'))) {
    console.log(`[PG Manager] Initializing PostgreSQL cluster in ${PGDATA_DIR}...`);
    fs.mkdirSync(PGDATA_DIR, { recursive: true });
    try {
      execFileSync(getBin('initdb'), [
        '-D', PGDATA_DIR,
        '-U', 'postgres',
        '-A', 'trust',
        '--locale=C',
        '--encoding=UTF8'
      ], { stdio: 'inherit' });
      console.log('[PG Manager] Cluster initialized successfully.');
    } catch (e) {
      console.error('[PG Manager] Failed to initdb:', e.message);
      process.exit(1);
    }
  }

  console.log(`[PG Manager] Starting PostgreSQL on port ${PG_PORT}...`);
  try {
    execFileSync(getBin('pg_ctl'), [
      '-D', PGDATA_DIR,
      '-l', LOG_FILE,
      '-o', `-p ${PG_PORT}`,
      'start'
    ], { stdio: 'inherit' });
  } catch (e) {
    console.log('[PG Manager] Note on pg_ctl start:', e.message);
  }

  // Poll until port is open
  let attempts = 0;
  while (attempts < 25) {
    await new Promise(r => setTimeout(r, 400));
    if (await isPortOpen(PG_PORT)) {
      console.log(`[PG Manager] PostgreSQL is ready and listening on port ${PG_PORT}`);
      break;
    }
    attempts++;
  }

  if (attempts >= 25) {
    console.error('[PG Manager] PostgreSQL server failed to accept connections on time.');
    if (fs.existsSync(LOG_FILE)) {
      console.error(fs.readFileSync(LOG_FILE, 'utf8'));
    }
    process.exit(1);
  }

  await ensureDbExists();
}

async function ensureDbExists() {
  try {
    const checkSql = `SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';`;
    const res = spawnSync(getBin('psql'), [
      '-h', '127.0.0.1',
      '-p', String(PG_PORT),
      '-U', 'postgres',
      '-tc', checkSql
    ], { encoding: 'utf8' });

    if (!res.stdout || !res.stdout.includes('1')) {
      console.log(`[PG Manager] Creating database ${DB_NAME}...`);
      execFileSync(getBin('createdb'), [
        '-h', '127.0.0.1',
        '-p', String(PG_PORT),
        '-U', 'postgres',
        DB_NAME
      ], { stdio: 'inherit' });
      console.log(`[PG Manager] Database ${DB_NAME} created.`);
    } else {
      console.log(`[PG Manager] Database ${DB_NAME} verified.`);
    }
  } catch (err) {
    console.log('[PG Manager] Note during ensureDbExists:', err.message);
  }
}

function stopPg() {
  if (!fs.existsSync(PGDATA_DIR)) {
    console.log('[PG Manager] No cluster found.');
    return;
  }
  console.log(`[PG Manager] Stopping PostgreSQL server in ${PGDATA_DIR}...`);
  try {
    execFileSync(getBin('pg_ctl'), ['-D', PGDATA_DIR, 'stop'], { stdio: 'inherit' });
    console.log('[PG Manager] PostgreSQL stopped.');
  } catch (e) {
    console.log('[PG Manager] pg_ctl stop:', e.message);
  }
}

const command = process.argv[2] || 'setup';
if (command === 'start' || command === 'setup') {
  startPg().catch(err => {
    console.error(err);
    process.exit(1);
  });
} else if (command === 'stop') {
  stopPg();
}

module.exports = { startPg, stopPg, isPortOpen };
