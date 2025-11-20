#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const workspaceRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const baseDir = path.join(workspaceRoot, 'n00-cortex', 'data', 'trunk', 'base', '.trunk');
const baseTrunkPath = path.join(baseDir, 'trunk.yaml');

function loadYaml(filePath) {
  try {
    const contents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(contents) || {};
  } catch (error) {
    console.error(`Failed to load ${filePath}:`, error.message);
    process.exitCode = 1;
    return {};
  }
}

function discoverRepos() {
  return fs
    .readdirSync(workspaceRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !name.startsWith('.'))
    .filter(name => fs.existsSync(path.join(workspaceRoot, name, '.trunk', 'trunk.yaml')));
}

if (!fs.existsSync(baseTrunkPath)) {
  console.error(`Base trunk config not found at ${baseTrunkPath}`);
  process.exit(1);
}

const baseYaml = loadYaml(baseTrunkPath);
const baseDefs = baseYaml?.lint?.definitions || [];
if (!Array.isArray(baseDefs) || baseDefs.length === 0) {
  console.log('No lint definitions found in base trunk config; nothing to sync.');
  process.exit(0);
}

const baseByName = new Map(baseDefs.map(def => [def?.name, def]).filter(([name]) => Boolean(name)));
const repos = discoverRepos();

for (const repo of repos) {
  const trunkPath = path.join(workspaceRoot, repo, '.trunk', 'trunk.yaml');
  const repoYaml = loadYaml(trunkPath);
  repoYaml.lint = repoYaml.lint || {};
  const repoDefs = Array.isArray(repoYaml.lint.definitions) ? repoYaml.lint.definitions : [];

  const existingNames = new Set(repoDefs.map(def => def?.name).filter(Boolean));
  const missing = baseDefs.filter(def => !existingNames.has(def?.name));

  if (!force && missing.length === 0) {
    console.log(`No changes needed for ${repo}`);
    continue;
  }

  let nextDefs = repoDefs.slice();
  if (force) {
    nextDefs = repoDefs.filter(def => !baseByName.has(def?.name));
    nextDefs = nextDefs.concat(baseDefs);
  } else {
    nextDefs = nextDefs.concat(missing);
  }

  if (dryRun) {
    const action = force ? 'refresh' : 'add';
    const names = (force ? Array.from(baseByName.keys()) : missing.map(def => def.name)).join(', ');
    console.log(`[dry-run] Would ${action} ${names || 'definitions'} in ${trunkPath}`);
    continue;
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `${trunkPath}.bak.${timestamp}`;
  try {
    fs.copyFileSync(trunkPath, backupPath);
    repoYaml.lint.definitions = nextDefs;
    fs.writeFileSync(trunkPath, yaml.dump(repoYaml), 'utf8');
    const summaryNames = force ? Array.from(baseByName.keys()) : missing.map(def => def.name);
    console.log(`Updated ${trunkPath} (${summaryNames.join(', ') || 'no definitions changed'}; backup: ${backupPath})`);
  } catch (error) {
    console.error(`Failed to update ${trunkPath}:`, error.message);
    process.exitCode = 1;
  }
}

console.log('Sync trunk definitions completed.');
