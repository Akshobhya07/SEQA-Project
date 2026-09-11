const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
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

function cleanStalePid(dataDir) {
  const pidFile = path.join(dataDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').split('\n')[0].trim(), 10);
      try {
        process.kill(pid, 0); // Check if alive
      } catch {
        // Not alive, stale pid
        console.log(`[Dev Runner] Removing stale postmaster.pid (PID: ${pid})`);
        fs.unlinkSync(pidFile);
      }
    } catch {
      try { fs.unlinkSync(pidFile); } catch {}
    }
  }
}

function killProcTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
    } else {
      proc.kill();
    }
  } catch (e) {}
}

async function main() {
  console.log('=====================================================');
  console.log(' Starting Software Deployment Rollback Audit Manager ');
  console.log('=====================================================');

  const pgDataDir = path.join(backendDir, 'pgdata');
  cleanStalePid(pgDataDir);

  // 1. Ensure PostgreSQL is running
  const pgOpen = await isPortOpen(5433);
  let pgProc = null;

  if (!pgOpen) {
    console.log('[Dev Runner] Starting local PostgreSQL cluster on port 5433...');
    const pgBin = 'C:\\Program Files\\PostgreSQL\\18\\bin\\postgres.exe';

    if (fs.existsSync(pgBin) && fs.existsSync(pgDataDir)) {
      pgProc = spawn(pgBin, ['-D', pgDataDir, '-p', '5433'], { stdio: 'inherit' });
      pgProc.on('error', (err) => console.error('[Dev Runner] PostgreSQL error:', err.message));
      // wait for it to open
      let attempts = 0;
      while (attempts < 25) {
        await new Promise(r => setTimeout(r, 400));
        if (await isPortOpen(5433)) {
          console.log('[Dev Runner] PostgreSQL cluster is ready.');
          break;
        }
        attempts++;
      }
      if (attempts >= 25) {
        console.warn('[Dev Runner] PostgreSQL did not open port 5433 in time.');
      }
    } else {
      console.log('[Dev Runner] PostgreSQL binary or data not found, relying on configured DATABASE_URL.');
    }
  } else {
    console.log('[Dev Runner] PostgreSQL is already active on port 5433.');
  }

  // 2. Start Backend
  console.log('[Dev Runner] Launching Backend API server on http://localhost:5000...');
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  const backendProc = spawn(npmCmd, ['run', 'dev'], {
    cwd: backendDir,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
  });

  // 3. Start Frontend
  console.log('[Dev Runner] Launching Frontend portal on http://localhost:5173...');
  const frontendProc = spawn(npmCmd, ['run', 'dev'], {
    cwd: frontendDir,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
  });

  // Cleanup on exit
  function cleanup() {
    console.log('\n[Dev Runner] Shutting down services...');
    killProcTree(backendProc);
    killProcTree(frontendProc);
    if (pgProc) {
      killProcTree(pgProc);
    }
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(err => {
  console.error('[Dev Runner] Startup failed:', err);
  process.exit(1);
});
