import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '(alınamadı)';
  }
};

console.log(readFileSync(new URL('../docs/DURUM.md', import.meta.url), 'utf8'));
console.log('## Git\n');
console.log(git('status', '-sb'));
console.log('\n' + git('log', '-5', '--format=%h %s'));
