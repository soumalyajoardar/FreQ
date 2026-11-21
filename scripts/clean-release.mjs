// Deletes installers left behind by previous versions in release/.
//
// electron-builder writes a ~110 MB setup + ~106 MB portable per build and never
// prunes the folder, so a repo with a dozen releases ends up carrying gigabytes
// of dead artifacts. Only the current package.json version is kept; everything
// older is already published on GitHub Releases.
//
// Usage: node scripts/clean-release.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const root = path.resolve('release');

if (!fs.existsSync(root)) {
  console.log('clean-release: no release/ directory, nothing to do');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const currentVersion = String(pkg.version);
const versionPattern = new RegExp(currentVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

let freed = 0;
const removed = [];

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const name = entry.name;

  // Only installer payloads. latest.yml, builder-*.yml and anything else that
  // ships with the release stays put.
  if (!/^FreQ/i.test(name)) continue;
  if (!/\.(exe|blockmap)$/i.test(name)) continue;
  if (versionPattern.test(name)) continue;

  const full = path.join(root, name);
  const size = fs.statSync(full).size;
  freed += size;
  removed.push({ name, size });
  if (!dryRun) {
    try {
      fs.unlinkSync(full);
    } catch (err) {
      console.warn(`clean-release: could not delete ${name}: ${err.message}`);
    }
  }
}

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
if (removed.length === 0) {
  console.log(`clean-release: no stale installers for v${currentVersion}`);
} else {
  for (const item of removed) console.log(`  ${dryRun ? 'would remove' : 'removed'} ${item.name} (${mb(item.size)})`);
  console.log(`clean-release: ${dryRun ? 'would free' : 'freed'} ${mb(freed)} across ${removed.length} file(s), kept v${currentVersion}`);
}
