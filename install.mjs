#!/usr/bin/env node
// devflow installer — cross-platform, zero deps, Node >=20.19 (already a prereq).
// Usage:  node install.mjs <target-dir>   (default: .)

import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(process.argv[2] || process.cwd());

const START = '<!-- devflow:start -->';
const END = '<!-- devflow:end -->';

const CONFIG_YAML = `schema: spec-driven

# Project context (optional) — add your tech stack / conventions / domain
# context: |
#   Tech stack: ...
#   Domain: ...

# Per-artifact rules (optional)
# devflow convention: tasks use TDD sub-steps N.M.1~5 (write test / red / impl / green / refactor)
# rules:
#   tasks:
#     - Break each task into TDD sub-steps (N.M.1 write test / N.M.2 red / N.M.3 impl / N.M.4 green / N.M.5 refactor)

# Per-operation guidance (optional)
# operations:
#   apply:
#     guidance:
#       - Keep test summaries concise
#   archive:
#     guidance:
#       - Summarize the archive outcome before finishing
`;

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  for (const e of await readdir(src, { withFileTypes: true })) {
    if (e.isDirectory()) await copyDir(join(src, e.name), join(dst, e.name));
    else await copyFile(join(src, e.name), join(dst, e.name));
  }
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

async function writeIfAbsent(dst, content) {
  if (existsSync(dst)) return 'exists, skipped';
  await mkdir(dirname(dst), { recursive: true });
  await writeFile(dst, content, 'utf8');
  return 'created';
}

async function main() {
  if (!existsSync(TARGET)) throw new Error(`target dir not found: ${TARGET}`);
  if (!(await stat(TARGET)).isDirectory()) throw new Error(`target is not a dir: ${TARGET}`);

  await copyFile(join(SOURCE, 'devflow-rules.md'), join(TARGET, 'devflow-rules.md'));

  const cmdSrc = join(SOURCE, '.opencode', 'commands');
  const cmdDst = join(TARGET, '.opencode', 'commands');
  const cmds = (await readdir(cmdSrc)).filter(n => n.startsWith('devflow-') && n.endsWith('.md'));
  await mkdir(cmdDst, { recursive: true });
  for (const n of cmds) await copyFile(join(cmdSrc, n), join(cmdDst, n));

  const sklSrc = join(SOURCE, '.opencode', 'skills');
  const sklDst = join(TARGET, '.opencode', 'skills');
  const skls = (await readdir(sklSrc, { withFileTypes: true }))
    .filter(e => e.isDirectory() && e.name.startsWith('openspec-')).map(e => e.name);
  for (const n of skls) await copyDir(join(sklSrc, n), join(sklDst, n));

  const oc = await mergeOpencodeJson();
  const ag = await mergeAgents();
  const cfg = await writeIfAbsent(join(TARGET, 'openspec', 'config.yaml'), CONFIG_YAML);

  console.log(`devflow installed into ${TARGET}`);
  console.log(`  - devflow-rules.md (root)`);
  console.log(`  - ${cmds.length} commands -> .opencode/commands/`);
  console.log(`  - ${skls.length} skills   -> .opencode/skills/`);
  console.log(`  - opencode.json: ${oc}`);
  console.log(`  - AGENTS.md: ${ag}`);
  console.log(`  - openspec/config.yaml: ${cfg}`);
  console.log(`\nnext: cd ${TARGET} && opencode  ->  /devflow:brainstorm`);
}

main().catch(e => { console.error(`[devflow install] ${e.message}`); process.exit(1); });
