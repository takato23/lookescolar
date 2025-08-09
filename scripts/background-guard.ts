import { spawn } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

// Minimal, dependency-free background guard

type TriggerSource = 'watcher' | 'timer' | 'git';

const WORKSPACE = process.cwd();
const LOG_DIR = path.join(WORKSPACE, 'test-reports', 'background-agent');
const WATCH_PATHS = [
  path.join(WORKSPACE, 'lib'),
  path.join(WORKSPACE, 'app', 'api'),
  path.join(WORKSPACE, 'supabase', 'migrations'),
];
const GIT_HEAD = path.join(WORKSPACE, '.git', 'HEAD');
const GIT_REFS_HEADS = path.join(WORKSPACE, '.git', 'refs', 'heads');

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
let lastRunEndedAt = 0;
let isRunning = false;
let runQueued = false;
let lastGitHeadContent = '';

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}${m}${day}-${h}${min}${s}`;
}

async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

function chooseRunner(): { bin: string; args: string[] } {
  // Prefer pnpm if available, else npm; detect reliably
  try {
    const { execFileSync } = require('child_process');
    try {
      execFileSync('pnpm', ['--version'], { stdio: 'ignore' });
      return { bin: 'pnpm', args: ['run'] };
    } catch {}
  } catch {}
  return { bin: 'npm', args: ['run'] };
}

async function runCommand(
  fullCmd: string,
  logStream: fs.WriteStream,
  opts: { cwd?: string } = {}
): Promise<{ code: number | null }> {
  return new Promise((resolve) => {
    const [cmd, ...args] = fullCmd.split(' ').filter(Boolean);
    const child = spawn(cmd, args, { cwd: opts.cwd || WORKSPACE, env: process.env });
    logStream.write(`\n$ ${fullCmd}\n`);
    child.stdout.on('data', (d) => logStream.write(d));
    child.stderr.on('data', (d) => logStream.write(d));
    child.on('close', (code) => resolve({ code }));
    child.on('error', (err) => {
      logStream.write(`Command error: ${err?.message || String(err)}\n`);
      resolve({ code: 1 });
    });
  });
}

async function securityHeuristics(logStream: fs.WriteStream): Promise<void> {
  // Basic grep-like scans for sensitive strings
  const candidates = [
    'storage_path',
    'code_id',
    'privateKey',
    'secret',
    'access_token',
    'refresh_token',
    'authorization',
    'Bearer ',
  ];
  const targetDirs = [path.join(WORKSPACE, 'app', 'api'), path.join(WORKSPACE, 'lib')];

  const findings: string[] = [];
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    const stack: string[] = [dir];
    while (stack.length) {
      const cur = stack.pop()!;
      const stat = await fsp.stat(cur);
      if (stat.isDirectory()) {
        const items = await fsp.readdir(cur);
        for (const it of items) stack.push(path.join(cur, it));
      } else if (stat.isFile() && /\.(ts|tsx|js|mjs)$/.test(cur)) {
        try {
          const txt = await fsp.readFile(cur, 'utf8');
          for (const needle of candidates) {
            if (txt.includes(needle)) {
              findings.push(`${cur} :: contains '${needle}'`);
            }
          }
        } catch {}
      }
    }
  }

  if (findings.length) {
    logStream.write(`\n[SECURITY][WARN] Potential sensitive identifiers found:\n- ${findings.join('\n- ')}\n`);
  } else {
    logStream.write(`\n[SECURITY] No obvious sensitive identifiers found.\n`);
  }
}

async function enforceSignedUrlBestPractice(logStream: fs.WriteStream): Promise<void> {
  // Ensure no direct createSignedUrl calls outside lib/storage/signedUrl.ts
  const srcRoot = WORKSPACE;
  const offenders: string[] = [];
  const stack: string[] = [path.join(srcRoot, 'app', 'api'), path.join(srcRoot, 'lib')];
  for (const base of stack.slice()) {
    if (!fs.existsSync(base)) stack.splice(stack.indexOf(base), 1);
  }
  while (stack.length) {
    const cur = stack.pop()!;
    try {
      const st = await fsp.stat(cur);
      if (st.isDirectory()) {
        const items = await fsp.readdir(cur);
        for (const it of items) stack.push(path.join(cur, it));
      } else if (st.isFile() && /\.(ts|tsx|js)$/.test(cur)) {
        const content = await fsp.readFile(cur, 'utf8');
        if (cur.endsWith(path.join('lib', 'storage', 'signedUrl.ts'))) continue;
        if (content.includes('.createSignedUrl(')) {
          offenders.push(cur);
        }
      }
    } catch {}
  }
  if (offenders.length) {
    logStream.write(`\n[BEST-PRACTICES][FAIL] Direct storage.createSignedUrl usage found. Use lib/storage/signedUrl.ts:signedUrlForKey() instead:\n- ${offenders.join('\n- ')}\n`);
  } else {
    logStream.write(`\n[BEST-PRACTICES] Signed URL usage OK.\n`);
  }
}

async function docsUpdateHeuristic(logStream: fs.WriteStream): Promise<void> {
  // If app/api changed recently but docs not updated, warn.
  try {
    const apiDir = path.join(WORKSPACE, 'app', 'api');
    if (!fs.existsSync(apiDir)) return;
    const docsFiles = [path.join(WORKSPACE, 'docs', 'API_SPEC.md'), path.join(WORKSPACE, 'docs', 'FLOWS.md')];

    const apiMtime = await dirMTime(apiDir);
    const docsMtime = await maxFileMTime(docsFiles);
    if (apiMtime && docsMtime && apiMtime > docsMtime) {
      logStream.write(`\n[DOCS][WARN] API changed more recently than docs. Please update docs/API_SPEC.md and docs/FLOWS.md.\n`);
    }
  } catch {}
}

async function dirMTime(dir: string): Promise<number | null> {
  let latest = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    const st = await fsp.stat(cur);
    if (st.isDirectory()) {
      const items = await fsp.readdir(cur);
      for (const it of items) stack.push(path.join(cur, it));
    } else if (st.isFile()) {
      latest = Math.max(latest, st.mtimeMs);
    }
  }
  return latest || null;
}

async function maxFileMTime(files: string[]): Promise<number | null> {
  let latest = 0;
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const st = await fsp.stat(f);
    latest = Math.max(latest, st.mtimeMs);
  }
  return latest || null;
}

async function updateTypesIfNeeded(triggeredByMigrations: boolean, logStream: fs.WriteStream) {
  if (!triggeredByMigrations) return;
  const { bin, args } = chooseRunner();
  const cmd = `${bin} ${args.join(' ')} db:types:update`;
  const res = await runCommand(cmd, logStream);
  if (res.code !== 0) {
    logStream.write(`[TYPES][FAIL] Failed to update types/database.ts (exit ${res.code}).\n`);
  } else {
    logStream.write(`[TYPES] database types updated.\n`);
  }
}

async function runSecurityCheck(logStream: fs.WriteStream) {
  const { bin, args } = chooseRunner();
  const cmd = `${bin} ${args.join(' ')} security:check`;
  const res = await runCommand(cmd, logStream);
  if (res.code !== 0) {
    logStream.write(`[SECURITY][FAIL] security:check failed (exit ${res.code}). Consider creating a hotfix branch and PR.\n`);
  } else {
    logStream.write(`[SECURITY] security:check passed.\n`);
  }
}

async function runSeedsAndTests(logStream: fs.WriteStream) {
  const { bin, args } = chooseRunner();

  const seq = [
    `${bin} ${args.join(' ')} seed:v1`,
    `${bin} ${args.join(' ')} test:comprehensive:integration`,
    `${bin} ${args.join(' ')} test:perf`,
  ];

  for (const cmd of seq) {
    const res = await runCommand(cmd, logStream);
    if (res.code !== 0) {
      logStream.write(`[TESTS][FAIL] '${cmd}' exited with code ${res.code}.\n`);
      return false;
    }
  }
  logStream.write(`[TESTS] Seeds and tests OK.\n`);
  return true;
}

async function loadGitHead(): Promise<string> {
  try {
    return await fsp.readFile(GIT_HEAD, 'utf8');
  } catch {
    return '';
  }
}

async function performRun(source: TriggerSource, options?: { migrationsChanged?: boolean }) {
  if (isRunning) {
    runQueued = true;
    return;
  }
  isRunning = true;

  await ensureDir(LOG_DIR);
  const logFile = path.join(LOG_DIR, `${timestamp()}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  logStream.write(`[START] Background guard run - source=${source} - ${new Date().toISOString()}\n`);

  try {
    // Core checks
    await securityHeuristics(logStream);
    await enforceSignedUrlBestPractice(logStream);
    await docsUpdateHeuristic(logStream);
    await runSecurityCheck(logStream);
    await updateTypesIfNeeded(Boolean(options?.migrationsChanged), logStream);

    const ok = await runSeedsAndTests(logStream);
    if (!ok) {
      console.error(`[Background-Agent] Failures detected. See log: ${logFile}`);
    }
  } catch (err: any) {
    logStream.write(`Unexpected error: ${err?.stack || err?.message || String(err)}\n`);
    console.error(`[Background-Agent] Error during run: ${err?.message || String(err)}`);
  } finally {
    logStream.write(`[END] ${new Date().toISOString()}\n`);
    logStream.end();
    lastRunEndedAt = Date.now();
    isRunning = false;
    if (runQueued) {
      runQueued = false;
      setTimeout(() => performRun('watcher'), 1000);
    }
  }
}

function startWatchers() {
  const debounceMs = 1500;
  let timer: NodeJS.Timeout | null = null;
  let migrationsChanged = false;

  const schedule = (src: TriggerSource) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => performRun(src, { migrationsChanged }), debounceMs);
    migrationsChanged = false;
  };

  // FS watchers
  for (const p of WATCH_PATHS) {
    try {
      if (!fs.existsSync(p)) continue;
      fs.watch(p, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const changedPath = path.join(p, filename.toString());
        if (changedPath.includes(path.join('supabase', 'migrations'))) {
          migrationsChanged = true;
        }
        schedule('watcher');
      });
    } catch {}
  }

  // GIT watchers
  try {
    if (fs.existsSync(GIT_HEAD)) {
      lastGitHeadContent = fs.readFileSync(GIT_HEAD, 'utf8');
      fs.watch(GIT_HEAD, () => {
        setTimeout(async () => {
          const cur = await loadGitHead();
          if (cur !== lastGitHeadContent) {
            lastGitHeadContent = cur;
            schedule('git');
          }
        }, 250);
      });
    }
  } catch {}

  try {
    if (fs.existsSync(GIT_REFS_HEADS)) {
      fs.watch(GIT_REFS_HEADS, { recursive: true }, () => schedule('git'));
    }
  } catch {}

  // Periodic timer
  setInterval(() => schedule('timer'), THIRTY_MINUTES_MS);
}

async function main() {
  await ensureDir(LOG_DIR);
  console.log('[Background-Agent] Starting continuous guard...');
  console.log(` - Watching: ${WATCH_PATHS.filter((p) => fs.existsSync(p)).join(', ')}`);
  console.log(' - Also monitoring git HEAD and refs');
  console.log(' - Interval: every 30 minutes');

  startWatchers();
  // Kick an initial run on boot to establish baseline
  await performRun('timer');
}

main().catch((e) => {
  console.error('[Background-Agent] Fatal error', e);
  process.exit(1);
});