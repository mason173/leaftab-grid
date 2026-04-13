import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error([
        `${command} ${args.join(' ')} failed in ${cwd}`,
        stdout.trim(),
        stderr.trim(),
      ].filter(Boolean).join('\n')));
    });
  });
}

async function readWorkspacePackageDirs() {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name));
}

function assertNoFileDependencies(packageJson, packageDir) {
  const dependencySections = ['dependencies', 'peerDependencies', 'optionalDependencies'];

  for (const section of dependencySections) {
    const deps = packageJson[section] ?? {};
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === 'string' && version.startsWith('file:')) {
        throw new Error(
          `${packageJson.name} in ${packageDir} still uses a local file dependency for ${name}: ${version}`,
        );
      }
    }
  }
}

async function verifyPackage(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  assertNoFileDependencies(packageJson, packageDir);

  await runCommand('npm', ['pack', '--dry-run'], packageDir);
}

async function main() {
  const packageDirs = await readWorkspacePackageDirs();
  for (const packageDir of packageDirs) {
    await verifyPackage(packageDir);
  }

  process.stdout.write(`Verified ${packageDirs.length} publishable package(s).\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
