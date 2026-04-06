/**
 * Writes:
 * - tenderly-standard-input.json — Standard Solidity input with exact compiler settings
 *   and source paths from your Hardhat build (including @openzeppelin/... keys). This matches
 *   the bytecode/metadata that was deployed.
 * - tenderly-supplement/@openzeppelin/... — Copies of OpenZeppelin files Tenderly sometimes
 *   fails to resolve from JSON; use Upload / Paste in the Tenderly UI with these paths.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const buildInfoDir = path.join(ROOT, 'artifacts', 'build-info');
const files = fs.readdirSync(buildInfoDir).filter(f => f.endsWith('.json'));

let latestPath = null;
let latestMtime = 0;
for (const f of files) {
  const p = path.join(buildInfoDir, f);
  const st = fs.statSync(p);
  if (st.mtimeMs > latestMtime) {
    latestMtime = st.mtimeMs;
    latestPath = p;
  }
}

const buildInfo = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const didMeta = JSON.parse(
  buildInfo.output.contracts['contracts/DidManifestRegistry.sol'][
    'DidManifestRegistry'
  ].metadata,
);

const metaSourceKeys = Object.keys(didMeta.sources);
const newSources = {};
for (const key of metaSourceKeys) {
  const src = buildInfo.input.sources[key];
  if (!src) {
    console.error('Missing in build-info input:', key);
    process.exit(1);
  }
  newSources[key] = src;
}

const input = {
  language: 'Solidity',
  sources: newSources,
  settings: { ...buildInfo.input.settings },
};

const outPath = path.join(ROOT, 'tenderly-standard-input.json');
fs.writeFileSync(outPath, JSON.stringify(input, null, 2), 'utf8');
console.log('Build-info:', latestPath);
console.log('Wrote:', outPath);
console.log('Source keys:', Object.keys(input.sources));

// Optional on-disk tree for Tenderly "Upload" / "Paste" for missing dependencies
const supplementRoot = path.join(ROOT, 'tenderly-supplement');
const ozPrefix = path.join(supplementRoot, '@openzeppelin', 'contracts');
for (const key of metaSourceKeys) {
  if (!key.startsWith('@openzeppelin/contracts/')) continue;
  const rel = key.slice('@openzeppelin/contracts/'.length);
  const dest = path.join(ozPrefix, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, newSources[key].content, 'utf8');
  console.log('Supplement:', path.relative(ROOT, dest));
}
console.log(
  'Done. If Tenderly still shows missing OZ files, upload/paste from tenderly-supplement/@openzeppelin/',
);
