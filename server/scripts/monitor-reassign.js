#!/usr/bin/env node

const fs = require('fs');
const cp = require('child_process');

function parseArgs() {
  const args = {
    pid: null,
    log: './reassign-monitor.log',
    intervalMs: 2000,
    pollSeconds: 2,
  };

  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--pid') args.pid = Number(process.argv[++i]);
    else if (arg === '--log') args.log = process.argv[++i];
    else if (arg === '--interval') args.intervalMs = Number(process.argv[++i] || 2000);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  node scripts/monitor-reassign.js --pid 12345 --log /home/yourapp/server/reports/prod_reassign_dryrun.txt
  node scripts/monitor-reassign.js --pid 12345 --log /home/yourapp/server/reports/prod_reassign_dryrun.txt --interval 3000

Monitors a running reassignment process and prints elapsed time + an estimated progress %.
It reads the process state from ps and the live log output file.
`);
      process.exit(0);
    }
  }

  return args;
}

function getProcessInfo(pid) {
  try {
    const result = cp.execSync(`ps -o pid=,ppid=,etime=,pcpu=,pmem=,comm= -p ${pid} 2>/dev/null || true`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(Boolean);
    if (lines.length <= 1) return null;
    const columns = lines[1].trim().split(/\s+/);
    return {
      pid: Number(columns[0]),
      ppid: Number(columns[1]),
      etime: columns[2],
      pcpu: columns[3],
      pmem: columns[4],
      comm: columns[5],
    };
  } catch (error) {
    return null;
  }
}

function readTail(logPath) {
  if (!fs.existsSync(logPath)) return '';
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    return content;
  } catch (error) {
    return '';
  }
}

function computeProgress(logText) {
  const markers = [
    { key: '=== Contract name resolution ===', pct: 15 },
    { key: '=== Dry-run check ===', pct: 35 },
    { key: '=== SAFE TO PROCEED? ===', pct: 70 },
    { key: 'Type YES to continue', pct: 85 },
    { key: '=== Applied changes ===', pct: 100 },
    { key: 'Aborted. No changes were applied.', pct: 100 },
    { key: 'ERROR:', pct: 100 },
  ];

  let progress = 0;
  for (const item of markers) {
    if (logText.includes(item.key)) {
      progress = Math.max(progress, item.pct);
    }
  }

  if (logText.includes('RESULT: SAFE TO PROCEED = YES') && !logText.includes('Type YES to continue')) {
    progress = Math.max(progress, 72);
  }

  return progress;
}

function formatElapsed(etime) {
  if (!etime) return '00:00:00';
  const match = etime.match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
  if (!match) return etime;

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;

  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function printStatus(status) {
  console.log('\n=== Reassign monitor ===');
  console.log(`PID: ${status.pid}`);
  console.log(`Status: ${status.status}`);
  console.log(`Elapsed: ${status.elapsed}`);
  console.log(`CPU: ${status.pcpu}%`);
  console.log(`Memory: ${status.pmem}%`);
  console.log(`Progress: ${status.progress}%`);
  console.log(`Last log marker: ${status.lastMarker || 'none yet'}`);
  console.log(`Log: ${status.log}`);
}

function main() {
  const args = parseArgs();
  if (!args.pid) {
    console.error('ERROR: --pid is required. Example: node scripts/monitor-reassign.js --pid 12345 --log /home/yourapp/server/reports/prod_reassign_dryrun.txt');
    process.exit(1);
  }

  const start = Date.now();
  const logPath = args.log;

  const loop = () => {
    const proc = getProcessInfo(args.pid);
    const logText = readTail(logPath);
    const progress = computeProgress(logText);

    let status = 'RUNNING';
    let lastMarker = 'none';

    if (!proc) {
      status = 'NOT_RUNNING';
    } else if (logText.includes('RESULT: SAFE TO PROCEED = YES')) {
      status = 'WAITING_FOR_CONFIRMATION';
      lastMarker = 'SAFE TO PROCEED = YES';
    } else if (logText.includes('Type YES to continue')) {
      status = 'WAITING_FOR_USER_INPUT';
      lastMarker = 'Type YES to continue';
    } else if (logText.includes('ERROR:')) {
      status = 'FAILED';
      lastMarker = 'ERROR';
    } else if (logText.includes('=== Applied changes ===')) {
      status = 'FINISHED';
      lastMarker = '=== Applied changes ===';
    }

    const elapsed = proc ? formatElapsed(proc.etime) : formatElapsed(String(Math.floor((Date.now() - start) / 1000)));
    const monitor = {
      pid: args.pid,
      status,
      elapsed,
      pcpu: proc ? proc.pcpu : '0.0',
      pmem: proc ? proc.pmem : '0.0',
      progress,
      lastMarker,
      log: logPath,
    };

    printStatus(monitor);

    if (status === 'FINISHED' || status === 'FAILED' || status === 'NOT_RUNNING') {
      process.exit(0);
    }

    setTimeout(loop, args.intervalMs);
  };

  loop();
}

main();
