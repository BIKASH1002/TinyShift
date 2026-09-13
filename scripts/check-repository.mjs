import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

// Report locations only. Never echo credential values to terminal or CI logs.
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const findings = [];
// Also detect accidental copies of locally configured credentials, regardless
// of their provider-specific format. Values never appear in reports.
const localCredentials = [];
for (const envPath of ['.env', '.env.local', 'backend/.env', 'backend/.env.local']) {
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || !/(KEY|TOKEN|SECRET|PASSWORD)/i.test(match[1])) continue;
    let value = match[2].trim();
    if (/^['"]/.test(value)) value = value.slice(1, value.lastIndexOf(value[0]));
    else value = value.split(/\s+#/)[0];
    if (value.length >= 12 && !/^(your-|MY_|example|placeholder)/i.test(value))
      localCredentials.push(value);
  }
}
const patterns = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /sb_secret_[0-9A-Za-z_-]{20,}/g,
  /(?:gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,})/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g,
  /(?:postgres(?:ql)?|mysql):\/\/[^\s:/]+:[^\s@]+@[^\s'"]+/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
];
function scan(path, body) {
  if (body.includes('\0')) return;
  body.split(/\r?\n/).forEach((line, index) => {
    if (localCredentials.some((value) => line.includes(value))) {
      findings.push(path + ':' + (index + 1) + ' contains a local credential; inspect privately');
      return;
    }
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        findings.push(path + ':' + (index + 1) + ' potential credential; inspect privately');
        break;
      }
    }
  });
}
const paths = [
  ...new Set(git(['ls-files', '-c', '-o', '--exclude-standard', '-z']).split('\0').filter(Boolean)),
];
let scanned = 0;
for (const path of paths) {
  if (!existsSync(path) || !statSync(path).isFile()) continue;
  scanned++;
  scan(path, readFileSync(path, 'utf8'));
}
const ignoredTracked = git(['ls-files', '-c', '-i', '--exclude-standard', '-z'])
  .split('\0')
  .filter((path) => path && existsSync(path));
for (const path of ignoredTracked) findings.push(path + ': ignored but still tracked');
console.log('Scanned ' + scanned + ' tracked and non-ignored working-tree files.');
if (process.argv.includes('--history')) {
  const objects = git(['rev-list', '--objects', '--all']).trim().split('\n').filter(Boolean);
  let blobs = 0;
  for (const object of objects) {
    const [hash, ...name] = object.split(' ');
    if (git(['cat-file', '-t', hash]).trim() !== 'blob') continue;
    scan('history/' + hash.slice(0, 12) + '/' + name.join(' '), git(['cat-file', 'blob', hash]));
    blobs++;
  }
  console.log('Scanned ' + blobs + ' blobs in locally available Git history.');
}
if (findings.length) {
  console.error([...new Set(findings)].join('\n'));
  process.exitCode = 1;
} else console.log('No matching credentials or existing ignored-but-tracked files found.');
console.log(
  'Pattern-based check only; review staged changes and enable GitHub secret scanning where available.',
);
