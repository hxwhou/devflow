#!/usr/bin/env node
// devflow installer — cross-platform, zero deps, Node >=20.19 (already a prereq).
// Usage:  node install.mjs <target-dir>   (default: .)
//
// Skills are NOT vendored in this repo — fetched at install time:
//   - openspec skills: `openspec init --tools opencode` (canonical CLI, always current)
//   - superpowers skills: copied from the global superpowers install

import { readFile, writeFile, mkdir, readdir, copyFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

const SOURCE = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(process.argv[2] || process.cwd());

const START = '<!-- devflow:start -->';
const END = '<!-- devflow:end -->';

// devflow workflow uses these 12 superpowers skills (core 7 + conditional 5).
// NOT copied: using-superpowers (bootstrap — devflow-rules.md replaces its orchestration),
// writing-skills (meta, not referenced by devflow).
// Runtime is plugin-less: these local copies + devflow-rules.md suffice. On Windows the
// superpowers plugin + a project .opencode/skills/ dir hangs opencode bootstrap, so users
// disable the plugin globally (see README 前置依赖). The plugin is install-time copy source only.
const SUPERPOWERS_SKILLS = [
  'brainstorming',
  'writing-plans',
  'using-git-worktrees',
  'test-driven-development',
  'requesting-code-review',
  'verification-before-completion',
  'finishing-a-development-branch',
  'dispatching-parallel-agents',
  'executing-plans',
  'subagent-driven-development',
  'systematic-debugging',
  'receiving-code-review',
];

// openspec skills that `openspec init` does NOT generate by default but devflow references.
// Vendored in this repo (canonical 1.8.0 content); copied to supplement init's 6.
const OPENSPEC_SUPPLEMENT_SKILLS = [
  'openspec-verify-change',
  'openspec-new-change',
  'openspec-continue-change',
];

function superpowersDir() {
  const root = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(root, 'opencode', 'node_modules', 'superpowers', 'skills');
}

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  for (const e of await readdir(src, { withFileTypes: true })) {
    if (e.isDirectory()) await copyDir(join(src, e.name), join(dst, e.name));
    else await copyFile(join(src, e.name), join(dst, e.name));
  }
}

function runOpenspecInit() {
  const cmd = `openspec init --tools opencode --force --no-animation "${TARGET}"`;
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true });
  if (r.error && r.error.code === 'ENOENT') {
    throw new Error(`openspec CLI not found on PATH. Install @fission-ai/openspec or @studyzy/openspec-cn first.`);
  }
  if (r.status !== 0) {
    throw new Error(`openspec init failed (exit ${r.status}). Ensure openspec CLI is installed and try 'openspec init' manually in the target.`);
  }
}

async function cleanOpsxCommands() {
  const dir = join(TARGET, '.opencode', 'commands');
  if (!existsSync(dir)) return 0;
  const files = (await readdir(dir)).filter(n => n.startsWith('opsx-') && n.endsWith('.md'));
  for (const n of files) await rm(join(dir, n), { force: true });
  return files.length;
}

async function copyOpenspecSupplementSkills() {
  const srcBase = join(SOURCE, '.opencode', 'skills');
  const dst = join(TARGET, '.opencode', 'skills');
  let copied = 0;
  for (const name of OPENSPEC_SUPPLEMENT_SKILLS) {
    const src = join(srcBase, name);
    if (!existsSync(src)) { console.warn(`  ! vendored openspec skill missing in source: ${name}`); continue; }
    await copyDir(src, join(dst, name));
    copied++;
  }
  return copied;
}

async function copySuperpowersSkills() {
  const spDir = superpowersDir();
  if (!existsSync(spDir)) {
    throw new Error(`superpowers skills dir not found: ${spDir}\nInstall superpowers globally first (opencode marketplace), then re-run.`);
  }
  const dst = join(TARGET, '.opencode', 'skills');
  let copied = 0;
  for (const name of SUPERPOWERS_SKILLS) {
    const src = join(spDir, name);
    if (!existsSync(src)) { console.warn(`  ! superpowers skill missing in global install, skipped: ${name}`); continue; }
    await copyDir(src, join(dst, name));
    copied++;
  }
  return copied;
}

async function mergeOpencodeJson() {
  const f = join(TARGET, 'opencode.json');
  const existed = existsSync(f);
  let cfg = {};
  if (existed) {
    try { cfg = JSON.parse((await readFile(f, 'utf8')).replace(/^\uFEFF/, '')); }
    catch { throw new Error(`opencode.json parse failed, aborted (your file untouched):\n  ${f}`); }
  }
  if (!Array.isArray(cfg.instructions)) cfg.instructions = [];
  if (!cfg.instructions.includes('devflow-rules.md')) cfg.instructions.push('devflow-rules.md');
  if (!existed) cfg.$schema = cfg.$schema || 'https://opencode.ai/config.json';
  await writeFile(f, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  return existed ? 'merged' : 'created';
}

async function mergeAgents() {
  const stub = (await readFile(join(SOURCE, 'AGENTS.md'), 'utf8')).trimEnd();
  const block = `${START}\n${stub}\n${END}\n`;
  const f = join(TARGET, 'AGENTS.md');
  let existing = '';
  if (existsSync(f)) existing = await readFile(f, 'utf8');
  const re = /<!-- devflow:start -->[\s\S]*?<!-- devflow:end -->\n?/;
  if (re.test(existing)) {
    const next = existing.replace(re, block);
    if (next !== existing) await writeFile(f, next, 'utf8');
    return 'updated';
  }
  const sep = existing && !existing.endsWith('\n') ? '\n\n' : (existing ? '\n' : '');
  await writeFile(f, existing + sep + block, 'utf8');
  return existing ? 'appended' : 'created';
}

async function main() {
  if (!existsSync(TARGET)) throw new Error(`target dir not found: ${TARGET}`);
  if (!(await stat(TARGET)).isDirectory()) throw new Error(`target is not a dir: ${TARGET}`);

  runOpenspecInit();
  const removedOpsx = await cleanOpsxCommands();
  const oss = await copyOpenspecSupplementSkills();
  const sp = await copySuperpowersSkills();

  await copyFile(join(SOURCE, 'devflow-rules.md'), join(TARGET, 'devflow-rules.md'));
  const cmdSrc = join(SOURCE, 'src', 'commands');
  const cmdDst = join(TARGET, '.opencode', 'commands');
  const cmds = (await readdir(cmdSrc)).filter(n => n.startsWith('devflow-') && n.endsWith('.md'));
  await mkdir(cmdDst, { recursive: true });
  for (const n of cmds) await copyFile(join(cmdSrc, n), join(cmdDst, n));

  const oc = await mergeOpencodeJson();
  const ag = await mergeAgents();

  console.log(`devflow installed into ${TARGET}`);
  console.log(`  - openspec skills + config via 'openspec init'`);
  console.log(`  - ${oss} supplemental openspec skills (verify/new/continue-change, init skips these) -> .opencode/skills/`);
  console.log(`  - removed ${removedOpsx} openspec /opsx:* commands (devflow uses /devflow:*)`);
  console.log(`  - ${sp} superpowers skills -> .opencode/skills/`);
  console.log(`  - devflow-rules.md (root)`);
  console.log(`  - ${cmds.length} commands -> .opencode/commands/`);
  console.log(`  - opencode.json: ${oc}`);
  console.log(`  - AGENTS.md: ${ag}`);
  console.log(`\nnext: cd ${TARGET} && opencode  ->  /devflow:brainstorm`);
}

main().catch(e => { console.error(`[devflow install] ${e.message}`); process.exit(1); });
