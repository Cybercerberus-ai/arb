'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd:root, stdio:'inherit', windowsHide:true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const scripts = fs.readdirSync(root).filter(name=>name.endsWith('.js') && name!=='process-geometry.js');
for (const name of fs.readdirSync(__dirname).filter(name=>name.endsWith('.cjs'))) scripts.push(path.join('tools',name));
for (const script of scripts) run(['--check',script]);
console.log(`Syntax OK: ${scripts.length} scripts`);
const tests = fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.cjs')).map(name=>path.join('tests',name));
run(['--test',...tests]);
