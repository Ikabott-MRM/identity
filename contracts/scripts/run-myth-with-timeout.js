/**
 * Runs Mythril symbolic execution on DidManifestRegistry with an external time limit.
 * Mythril's --execution-timeout is unreliable, so this script kills the process after EXTERNAL_TIMEOUT_SEC.
 *
 * Also filters out findings whose ONLY reported source location is #utility.yul — these are
 * compiler-generated ABI decoder helpers that Mythril flags as SWC-101 false positives.
 * Any genuine finding that also has a user-code source location is kept.
 * See audit/mythril-notes.md for the full false-positive analysis.
 *
 * Usage: node scripts/run-myth-with-timeout.js [externalTimeoutSec]
 * Default external timeout: 600 (10 minutes).
 *
 * Requires either:
 *   - Docker: mythril/myth image (docker pull mythril/myth)
 *   - Or local: myth on PATH (pip install mythril)
 *
 * Set USE_MYTH_DOCKER=1 to use Docker (default). Unset or 0 to use local myth.
 */

const { spawn } = require('child_process');
const path = require('path');

const EXTERNAL_TIMEOUT_MS =
  (parseInt(process.env.MYTH_TIMEOUT_SEC || '600', 10) || 600) * 1000;
const USE_DOCKER = process.env.USE_MYTH_DOCKER !== '0';
const CONTRACT_PATH = 'contracts/DidManifestRegistry.sol';
const SOLC_JSON = 'solc.json';
const MYTH_EXECUTION_TIMEOUT = 300; // seconds passed to myth

const cwd = process.cwd();
const contractFull = path.join(cwd, CONTRACT_PATH);
const solcJsonFull = path.join(cwd, SOLC_JSON);

/**
 * Returns true if the given finding block (a single "===" delimited section from Mythril
 * text output) should be suppressed because every source reference in it points only to
 * compiler-generated code (#utility.yul / <compiler-generated>) and not to any user source file.
 *
 * Mythril text output for a finding looks like:
 *
 *   ==== SWC-101: Integer Overflow and Underflow ====
 *   ...
 *   In file: #utility.yul:92
 *   ...
 *
 * A finding is suppressed only when ALL "In file:" lines reference #utility.yul or
 * compiler-generated helpers — meaning there is no corresponding user-code location.
 * If even one "In file:" line points to a real .sol file the finding is kept.
 */
function isSuppressedFinding(block) {
  const fileLines = block.match(/^In file:\s*(.+)$/gm);
  if (!fileLines || fileLines.length === 0) {
    // No source mapping at all — keep it to be safe.
    return false;
  }
  const COMPILER_GENERATED = /#utility\.yul|<compiler-generated>/i;
  return fileLines.every(line => COMPILER_GENERATED.test(line));
}

/**
 * Filters Mythril text output, removing findings that are exclusively compiler-generated
 * false positives. Prints a notice for each suppressed finding.
 * Returns the filtered output string (may be empty).
 */
function filterMythrilOutput(raw) {
  // Split on the finding separator used in Mythril text output.
  // Typical separator: "==== SWC-NNN: ... ===="
  const separator = /(?=^====\s)/m;
  const parts = raw.split(separator);

  // The first part is the preamble (header lines before the first finding).
  const preamble = parts[0];
  const findings = parts.slice(1);

  if (findings.length === 0) {
    return raw;
  }

  const kept = [];
  const suppressed = [];

  for (const finding of findings) {
    if (isSuppressedFinding(finding)) {
      suppressed.push(finding);
    } else {
      kept.push(finding);
    }
  }

  if (suppressed.length > 0) {
    process.stderr.write(
      `\n[run-myth-with-timeout] Suppressed ${suppressed.length} compiler-generated false positive(s) ` +
        `(#utility.yul / SWC-101 ABI decoder noise). See audit/mythril-notes.md.\n`,
    );
  }

  if (kept.length === 0) {
    // Nothing real to report. Emit a clean summary.
    return preamble.trim()
      ? preamble + '\nNo user-code issues found.\n'
      : 'No user-code issues found.\n';
  }

  return preamble + kept.join('');
}

function runMythLocal() {
  const args = [
    '-m',
    'mythril',
    'analyze',
    contractFull,
    '--solc-json',
    solcJsonFull,
    '--execution-timeout',
    String(MYTH_EXECUTION_TIMEOUT),
  ];
  return spawn(process.platform === 'win32' ? 'python' : 'python3', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runMythDocker() {
  const mount = path.resolve(cwd);
  const dockerArgs = [
    'run',
    '--rm',
    '-v',
    `${mount}:/src`,
    '-w',
    '/src',
    'mythril/myth',
    'analyze',
    CONTRACT_PATH,
    '--solc-json',
    SOLC_JSON,
    '--execution-timeout',
    String(MYTH_EXECUTION_TIMEOUT),
  ];
  return spawn('docker', dockerArgs, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const child = USE_DOCKER ? runMythDocker() : runMythLocal();

let stdoutBuf = '';
let stderrBuf = '';

child.stdout.on('data', chunk => {
  stdoutBuf += chunk.toString();
});

child.stderr.on('data', chunk => {
  stderrBuf += chunk.toString();
});

const timer = setTimeout(() => {
  process.stderr.write(
    `\n[run-myth-with-timeout] External timeout (${
      EXTERNAL_TIMEOUT_MS / 1000
    }s) reached. Killing Mythril.\n`,
  );
  child.kill('SIGTERM');
  process.exit(124); // 124 often used for timeout
}, EXTERNAL_TIMEOUT_MS);

child.on('exit', (code, signal) => {
  clearTimeout(timer);

  // Flush stderr verbatim (progress messages, warnings from Mythril itself).
  if (stderrBuf) {
    process.stderr.write(stderrBuf);
  }

  // Filter stdout (the findings report) before printing.
  const filtered = filterMythrilOutput(stdoutBuf);
  if (filtered) {
    process.stdout.write(filtered);
  }

  process.exit(code != null ? code : signal ? 128 + 9 : 0);
});

child.on('error', err => {
  clearTimeout(timer);
  process.stderr.write('Failed to start Mythril: ' + err.message + '\n');
  if (USE_DOCKER) {
    process.stderr.write(
      'Tip: Ensure Docker is running and pull the image: docker pull mythril/myth\n',
    );
  } else {
    process.stderr.write('Tip: Install Mythril with: pip install mythril\n');
  }
  process.exit(1);
});
