// Isolate a production verification build and restore Next-generated TS files.
// Run from client: node scripts/verify-ui-build.cjs
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const files = ['tsconfig.json', 'next-env.d.ts'];
const snapshots = files.map((file) => [file, fs.readFileSync(file)]);
const buildDirectory = `.next-ui-build-${Date.now()}`;
let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  for (const [file, contents] of snapshots) fs.writeFileSync(file, contents);
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_BUILD_DIR: buildDirectory },
});
child.once('error', (error) => {
  restore();
  console.error(`Verification build could not start: ${error.code || error.name}`);
  process.exitCode = 1;
});
child.once('exit', (code) => {
  restore();
  console.log(`Verification output: ${buildDirectory}`);
  process.exitCode = code === 0 ? 0 : 1;
});
process.once('SIGINT', () => child.kill());
process.once('SIGTERM', () => child.kill());
