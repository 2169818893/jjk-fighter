// 前端全量语法检查：遍历 public/js 下所有 .js 文件，用 node --check 校验 ESM 语法。
// 依赖根 package.json 的 "type": "module"，--check 仅解析语法、不执行代码。
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';

const ROOTS = ['public/js'];
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.js')) files.push(p);
  }
}

for (const root of ROOTS) walk(root);

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  if (r.status !== 0) {
    failed++;
    console.error(`[syntax] FAIL ${relative('.', f).split(sep).join('/')}`);
    console.error(r.stderr.toString());
  }
}

console.log(`[syntax] checked ${files.length} files, ${failed} failed`);
process.exit(failed ? 1 : 0);
