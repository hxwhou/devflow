// tests/run-node.js — headless entry: runs the same test modules as tests/index.html.
import './storage.test.js';
import './engine.test.js';
import './wheel.test.js';
import { run } from './runner.js';

const { passed, failed, total } = run('results');
if (failed > 0) {
  process.exitCode = 1;
}
console.log(`\nnode run: ${passed}/${total} passed${failed ? `, ${failed} FAILED` : ''}`);
